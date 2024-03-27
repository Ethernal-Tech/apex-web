const webpack = require('webpack');

module.exports = function override(config) {
  const fallback = config.resolve.fallback || {};
  Object.assign(fallback, {
    "crypto": require.resolve("crypto-browserify"),
    "stream": require.resolve("stream-browserify"),
    "assert": require.resolve("assert"),
    "http": require.resolve("stream-http"),
    "https": require.resolve("https-browserify"),
    "os": require.resolve("os-browserify"),
    "url": require.resolve("url"),
    "buffer": require.resolve('buffer/')
  })
  config.resolve.fallback = fallback;
  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer']
    })
  ])
  config.ignoreWarnings = [/Failed to parse source map/];
  config.module.rules.unshift({ test: /\.m?js$/, resolve: { fullySpecified: false, }, })
  const wasmExtensionRegExp = /\.wasm$/;
  config.resolve.extensions.push('.wasm');
  config.experiments = {
    asyncWebAssembly: true
  };
  config.module.rules.forEach((rule) => {
    (rule.oneOf || []).forEach((oneOf) => {
      if (oneOf.type === "asset/resource") {
        oneOf.exclude.push(wasmExtensionRegExp);
      }
    });
  });
  config.plugins.push(new webpack.HotModuleReplacementPlugin())
  return config;
}