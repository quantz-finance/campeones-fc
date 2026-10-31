import { chromium } from '@playwright/test';
import { existsSync, rmSync } from 'node:fs';

/** Archivo con la cookie de acceso a una preview protegida (no se versiona). */
export const VERCEL_STATE = 'e2e/.vercel-state.json';

// Si la preview tiene Vercel Authentication, E2E_VERCEL_SHARE_URL es un enlace de acceso temporal:
// se abre una vez y la cookie queda para todos los contextos. El valor nunca se imprime.
export default async function globalSetup() {
  const share = process.env.E2E_VERCEL_SHARE_URL;
  if (!share) {
    if (existsSync(VERCEL_STATE)) rmSync(VERCEL_STATE);
    return;
  }
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(share);
  await context.storageState({ path: VERCEL_STATE });
  await browser.close();
}
