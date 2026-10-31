module.exports = function (api) {
  api.cache(true);
  const preset = require.resolve('babel-preset-expo', { paths: [__dirname, require.resolve('expo/package.json')] });
  return {
    presets: [preset],
  };
};
