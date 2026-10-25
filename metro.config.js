// @cavos/kit/react importa UN solo icono (Fingerprint) del paquete completo @phosphor-icons/react.
// Lo redirigimos a ese icono suelto para que el chunk de Cavos no cargue miles de iconos.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const shim = path.join(__dirname, 'src/lib/shims/phosphor-icons.ts');
const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@phosphor-icons/react' && platform === 'web') return { type: 'sourceFile', filePath: shim };
  return (upstream ?? context.resolveRequest)(context, moduleName, platform);
};
module.exports = config;
