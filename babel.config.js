// @cavos/kit hace un import() interno de un módulo de 236 bytes; Metro sube todo lo compartido (stellar-sdk base,
// noble, etc.) al chunk __common que carga al arrancar. Lo volvemos require síncrono dentro del chunk perezoso de Cavos.
const TARGET = /@cavos[\\/]kit[\\/]dist[\\/]chunk-7ZTPQKT4\.mjs$/;

function inlineDynamicImport({ types: t }) {
  return {
    visitor: {
      CallExpression(path, state) {
        if (path.node.callee.type !== 'Import' || !TARGET.test(state.filename || '')) return;
        const arg = path.node.arguments[0];
        const resolved = t.callExpression(t.memberExpression(t.identifier('Promise'), t.identifier('resolve')), []);
        path.replaceWith(
          t.callExpression(t.memberExpression(resolved, t.identifier('then')), [
            t.arrowFunctionExpression([], t.callExpression(t.identifier('require'), [arg])),
          ]),
        );
      },
    },
  };
}

module.exports = function (api) {
  api.cache(true);
  const preset = require.resolve('babel-preset-expo', { paths: [__dirname, require.resolve('expo/package.json')] });
  return {
    presets: [preset],
    plugins: [inlineDynamicImport],
  };
};
