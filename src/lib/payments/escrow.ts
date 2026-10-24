/**
 * Punto de extensión para una custodia futura en Stellar (Trustless Work).
 * La V1 no mueve valor: no hay wallets, montos ni pagos.
 * Un partido confirmado podrá referenciar un escrow opcional sin cambiar
 * la doble confirmación del resultado.
 */
export type FutureEscrowRef = {
  provider: 'trustless-work';
  network: 'stellar';
  matchId: string;
};

export function paymentsEnabled(): false {
  return false;
}
