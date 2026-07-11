/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { webpack }) => {
    // pptxgenjs (v4+) declares Node-only modules using the "node:" URI scheme
    // in its package.json "browser" field (e.g. "node:fs": false) so bundlers
    // skip them in browser builds. Webpack 5 doesn't understand the "node:"
    // scheme by default — it only recognizes "data:" and "file:" — so it
    // throws before it ever gets a chance to apply that browser-field
    // exclusion. Stripping the "node:" prefix here lets it fall through to
    // the plain "fs"/"https"/etc. exclusions below, which webpack does
    // understand.
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
        resource.request = resource.request.replace(/^node:/, '');
      })
    );

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      https: false,
      http: false,
      path: false,
      stream: false,
    };

    return config;
  },
};

module.exports = nextConfig;
