// Debe importarse ANTES del SDK de Cavos/Stellar: en web no existe Buffer global.
import { Buffer } from 'buffer';

if (typeof (globalThis as any).Buffer === 'undefined') (globalThis as any).Buffer = Buffer;
