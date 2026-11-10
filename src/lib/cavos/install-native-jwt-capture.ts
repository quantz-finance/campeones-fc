// Intercepta NativeCavosAuth.identityFromAuthData (kit 0.4.4 y 0.5.2) para
// conservar el JWT que el kit usa y luego descarta. Solo se importa desde
// bridge.native.tsx, nunca en la web.
import { NativeCavosAuth } from '@cavos/kit/react-native';
import { captureJwtFromIdentityAuthData } from './native-jwt';

type IdentityFromAuthData = (data: unknown, ...rest: unknown[]) => Promise<unknown>;

export function installNativeJwtCapture(): boolean {
  const proto = NativeCavosAuth.prototype as unknown as {
    identityFromAuthData?: IdentityFromAuthData & { __cfcJwtCapture?: boolean };
  };
  const orig = proto.identityFromAuthData;
  if (typeof orig !== 'function') {
    console.warn('[cavos] no pude interceptar identityFromAuthData; el login nativo no podrá acuñar la sesión');
    return false;
  }
  if (orig.__cfcJwtCapture) return true;
  const wrapped: IdentityFromAuthData & { __cfcJwtCapture?: boolean } = function (this: unknown, data: unknown, ...rest: unknown[]) {
    captureJwtFromIdentityAuthData(data);
    return orig.call(this, data, ...rest);
  };
  wrapped.__cfcJwtCapture = true;
  proto.identityFromAuthData = wrapped;
  return true;
}
