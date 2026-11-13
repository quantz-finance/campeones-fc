// iOS/Android (Hermes): crypto.getRandomValues antes que cualquier otro módulo (index.js lo importa primero).
// @noble/hashes guarda globalThis.crypto AL CARGARSE. Algún módulo de la app lo cargaba antes que
// @cavos/kit/react-native (que es quien traía el polyfill), así que randomBytes fallaba para siempre y la llave de la
// billetera no se podía crear tras Google/Apple ("crypto.getRandomValues must be defined"). Lo comprobó la autoprueba
// de desarrollo (campeones-fc://dev/cavos-selftest). El parche de Buffer#subarray para js-xdr ya lo trae el kit.
import 'react-native-get-random-values';
