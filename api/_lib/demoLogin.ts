// Entrada con el usuario de prueba compartido (botón "Entrar con usuario de prueba").
// No hay contraseña ni secreto en el cliente: el servidor acuña la sesión con la llave service_role
// (solo en Vercel) para UNA cuenta fija, marcada como de prueba. La cuenta ve el mundo de demo
// (show_demo = true, modo "Datos falsos": sin dinero ni billetera) y no puede entrar con Cavos.
import { HttpError } from './http';

/** Correo de la cuenta de prueba (no es un secreto; el dominio .invalid nunca recibe correo). */
export const DEMO_LOGIN_EMAIL = 'usuario-prueba@prueba.campeonesfc.invalid';
export const DEMO_LOGIN_META = { username: 'prueba', display_name: 'Usuario de prueba', demo_login: true } as const;

export type DemoLoginStore = {
  findUser(email: string): Promise<string | null>;
  createUser(email: string, meta: Record<string, unknown>): Promise<string>;
  /** Deja la cuenta viendo los datos de demo. Idempotente. */
  prepare(userId: string): Promise<void>;
  mint(email: string): Promise<{ access_token: string; refresh_token: string; expires_at: number | null; user_id: string }>;
};

export function demoLoginEnabled(v: string | undefined): boolean {
  return !/^(0|off|false|no)$/i.test((v ?? '').trim());
}

export async function demoLogin(store: DemoLoginStore, email = DEMO_LOGIN_EMAIL) {
  if (!email.endsWith('.invalid')) throw new HttpError(500, 'La cuenta de prueba está mal configurada.', 'demo_misconfigured');
  let userId = await store.findUser(email);
  if (!userId) userId = await store.createUser(email, { ...DEMO_LOGIN_META });
  await store.prepare(userId);
  const session = await store.mint(email);
  if (session.user_id !== userId) throw new Error('la sesión acuñada no corresponde al usuario de prueba');
  return session;
}
