// Apuesta por partido (escrow de Trustless Work, SOLO testnet). Lógica pura: sin red ni base de datos.
//
// Diseño: UN escrow single-release por partido. Cada jugador deposita su parte con fund_escrow firmado
// por su billetera Cavos. El receiver es fijo al desplegar y el ganador no se conoce, así que nunca se usa
// release_funds: al confirmar el resultado (los dos jugadores) el servidor abre dispute_escrow (firma la cuenta
// platform como approver) y el dispute resolver (otra llave) reparte con resolve_dispute:
//   ganador -> 100 % del saldo; empate / sin resultado / plazo vencido -> a cada uno lo que depositó.
// El contrato cobra 0.3 % (30 bps) de Trustless Work, prorrateado entre las distribuciones.
// Montos en stroops (1 unidad = 10^7) como bigint para no tener errores de float.

export const STROOPS = 10_000_000n;
/** Comisión fija de Trustless Work en el contrato (30 bps), prorrateada por distribución. */
export const TW_FEE_BPS = 30n;

export type StakeStatus =
  | 'proposed' // el retador puso un monto; falta que el rival acepte
  | 'declined' // el rival no aceptó la apuesta (el partido puede seguir sin apuesta)
  | 'deploying' // el servidor está desplegando el escrow
  | 'funding' // escrow listo; esperando los depósitos
  | 'locked' // los dos depositaron
  | 'settling' // dispute + resolve en curso
  | 'paid' // pozo pagado al ganador
  | 'refunded' // devuelto (empate, sin resultado, plazo vencido, un solo depósito)
  | 'failed'; // requiere revisión manual

export type Outcome = 'winner' | 'draw' | 'refund';

export interface StakeRow {
  match_id: string;
  status: StakeStatus;
  stake_stroops: string | number | bigint;
  contract_id: string | null;
  player_a_address: string | null;
  player_b_address: string | null;
  funded_a_tx: string | null;
  funded_b_tx: string | null;
  fund_deadline: string | null;
  result_deadline: string | null;
}

export interface MatchLite {
  id: string;
  player_a_id: string;
  player_b_id: string;
  status: 'pending_accept' | 'in_progress' | 'disputed' | 'confirmed' | 'expired' | 'cancelled';
  winner_id: string | null;
  is_draw: boolean;
}

export interface Distribution {
  address: string;
  stroops: bigint;
}

/** "100" | "2.5" -> stroops. Máximo 7 decimales, > 0 y <= maxUnits. */
export function parseAmount(raw: unknown, maxUnits = 1000): bigint {
  const s = typeof raw === 'number' ? String(raw) : typeof raw === 'string' ? raw.trim() : '';
  const m = /^(\d{1,9})(?:\.(\d{1,7}))?$/.exec(s);
  if (!m) throw new Error('monto inválido');
  const v = BigInt(m[1]) * STROOPS + BigInt((m[2] ?? '').padEnd(7, '0') || '0');
  if (v <= 0n) throw new Error('el monto debe ser mayor que cero');
  if (v > BigInt(maxUnits) * STROOPS) throw new Error(`el monto máximo es ${maxUnits}`);
  return v;
}

/** stroops -> número para la API de Trustless Work (acepta decimales). Exacto hasta 2^53 stroops. */
export const toUnits = (s: bigint): number => Number(s) / 1e7;
/** stroops -> texto para mostrar ("199.4"). */
export function formatUnits(s: bigint): string {
  const neg = s < 0n;
  const a = neg ? -s : s;
  const frac = (a % STROOPS).toString().padStart(7, '0').replace(/0+$/, '');
  return `${neg ? '-' : ''}${a / STROOPS}${frac ? '.' + frac : ''}`;
}

/** Neto que recibe una distribución después de la comisión de TW (misma división entera que el contrato). */
export function netAfterFee(stroops: bigint, total: bigint): bigint {
  if (total <= 0n) return 0n;
  const twFee = (total * TW_FEE_BPS) / 10_000n;
  return stroops - (stroops * twFee) / total;
}

/** Quién depositó (según las tx de fondeo verificadas por el servidor). */
export function fundedSides(s: Pick<StakeRow, 'funded_a_tx' | 'funded_b_tx'>) {
  return { a: !!s.funded_a_tx, b: !!s.funded_b_tx };
}

/**
 * Qué hacer con el escrow AHORA. Se llama desde el endpoint (al confirmar) y desde el cron.
 *  - 'wait': todavía no.
 *  - 'settle': pagar/devolver con estas distribuciones.
 *  - 'close': cerrar sin movimiento on-chain (nadie depositó).
 */
export type Decision =
  | { action: 'wait'; reason: string }
  | { action: 'close'; status: 'refunded' | 'declined'; reason: string }
  | { action: 'settle'; outcome: Outcome; reason: string; distributions: Distribution[] };

export function decide(stake: StakeRow, match: MatchLite, balanceStroops: bigint, now = Date.now()): Decision {
  const unit = BigInt(stake.stake_stroops);
  const f = fundedSides(stake);
  const A = stake.player_a_address, B = stake.player_b_address;
  if (!['funding', 'locked', 'settling'].includes(stake.status)) return { action: 'wait', reason: `status ${stake.status}` };
  if (!A || !B) return { action: 'wait', reason: 'faltan las direcciones de los jugadores' };

  const refund = (reason: string): Decision => {
    const d: Distribution[] = [];
    if (f.a) d.push({ address: A, stroops: unit });
    if (f.b) d.push({ address: B, stroops: unit });
    if (!d.length) return { action: 'close', status: 'refunded', reason };
    return { action: 'settle', outcome: 'refund', reason, distributions: fitToBalance(d, balanceStroops) };
  };

  const past = (iso: string | null) => !!iso && Date.parse(iso) <= now;
  const terminal = match.status === 'expired' || match.status === 'cancelled';

  // Un solo depósito (o ninguno) y se venció el plazo de fondeo, o el partido murió: devolver.
  if (!(f.a && f.b)) {
    if (terminal) return refund(`partido ${match.status}`);
    if (past(stake.fund_deadline)) return refund('venció el plazo de depósito');
    if (match.status === 'confirmed') return refund('resultado confirmado sin los dos depósitos');
    return { action: 'wait', reason: 'esperando depósitos' };
  }

  // Los dos depositaron.
  if (match.status === 'confirmed') {
    if (match.is_draw || !match.winner_id) return refund('empate');
    const winnerAddr = match.winner_id === match.player_a_id ? A : match.winner_id === match.player_b_id ? B : null;
    if (!winnerAddr) return { action: 'wait', reason: 'ganador desconocido' };
    if (balanceStroops <= 0n) return { action: 'wait', reason: 'escrow sin saldo' };
    return { action: 'settle', outcome: 'winner', reason: 'ganador confirmado por los dos', distributions: [{ address: winnerAddr, stroops: balanceStroops }] };
  }
  if (terminal) return refund(`partido ${match.status}`);
  // Sin confirmación de los dos (o reportes distintos = 'disputed') al vencer el plazo: devolver a cada uno.
  if (past(stake.result_deadline)) return refund(match.status === 'disputed' ? 'reportes distintos y venció el plazo' : 'sin resultado confirmado a tiempo');
  return { action: 'wait', reason: 'partido en curso' };
}

/**
 * resolve_dispute exige que la suma sea EXACTAMENTE el saldo del escrow. Si alguien mandó de más (fund_escrow
 * lo permite a cualquiera), el excedente se reparte en partes iguales; el último stroop va a la primera.
 * Si falta saldo (no debería), se recorta proporcionalmente.
 */
export function fitToBalance(d: Distribution[], balance: bigint): Distribution[] {
  if (!d.length || balance <= 0n) return [];
  const sum = d.reduce((s, x) => s + x.stroops, 0n);
  if (sum === balance) return d;
  let out: Distribution[];
  if (sum < balance) {
    const extra = balance - sum, each = extra / BigInt(d.length);
    out = d.map((x) => ({ ...x, stroops: x.stroops + each }));
  } else {
    out = d.map((x) => ({ ...x, stroops: (x.stroops * balance) / sum }));
  }
  const diff = balance - out.reduce((s, x) => s + x.stroops, 0n);
  out[0] = { ...out[0], stroops: out[0].stroops + diff };
  return out.filter((x) => x.stroops > 0n);
}

/** Transiciones permitidas (el servidor las aplica con update condicional sobre el status anterior). */
export const TRANSITIONS: Record<StakeStatus, StakeStatus[]> = {
  proposed: ['deploying', 'declined'],
  deploying: ['funding', 'failed', 'proposed'],
  funding: ['locked', 'settling', 'refunded'],
  locked: ['settling'],
  settling: ['paid', 'refunded', 'failed'],
  paid: [],
  refunded: [],
  declined: [],
  failed: ['settling'],
};
export const canMove = (from: StakeStatus, to: StakeStatus) => TRANSITIONS[from].includes(to);
