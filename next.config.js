/** @type {import('next').NextConfig} */
const nextConfig = {
  // puppeteer-core and @sparticuz/chromium ship non-JS binary asset files
  // that webpack's normal bundling silently drops during build (a known,
  // documented issue: https://github.com/Sparticuz/chromium/issues/147).
  // Marking them external stops webpack from mangling the import, but that
  // alone does NOT get the actual .br binary archives (chromium.br,
  // al2.tar.br, al2023.tar.br — the second two contain the shared
  // libraries @sparticuz/chromium extracts to /tmp at runtime, including
  // libnss3.so) into the deployed function. Vercel's file-tracing step is
  // a separate mechanism from webpack and can't statically see the
  // runtime-computed path @sparticuz/chromium uses to find its own binary,
  // so those files silently never leave node_modules unless explicitly
  // included below — this was the actual cause of the "libnss3.so: cannot
  // open shared object file" launch failure in production.
  experimental: {
    serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
    outputFileTracingIncludes: {
      '/api/invoice-pdf': ['./node_modules/@sparticuz/chromium/bin/**/*'],
      // Also includes lib/resume/fonts/*.woff2 explicitly, not just the
      // Chromium binaries — it's read via fs.readFileSync(path.join(...))
      // at runtime, the same kind of runtime-computed path that silently
      // failed to ship for @sparticuz/chromium above, so it isn't left to
      // Vercel's static tracer to catch on its own.
      '/api/resume-pdf': ['./node_modules/@sparticuz/chromium/bin/**/*', './lib/resume/fonts/**/*'],
    },
  },
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
  async redirects() {
    // These 5 calculators never actually lived at these flat paths before —
    // they were internal tabs inside /calculator-hub, never their own
    // route or sitemap entry — so there's no real indexed/bookmarked link
    // to protect here. Redirecting anyway costs nothing and covers anyone
    // who guesses the flat URL by analogy with /salary-calculator.
    return [
      { source: '/sign-pdf', destination: '/sign-documents', permanent: true },
      // Word Counter was removed (redundant with every major word
      // processor); the tool that lived at this slug is now Text Case
      // Converter only, at its own slug that matches what it does.
      { source: '/utilities-hub', destination: '/text-case-converter', permanent: true },
      // /calculator was a thin stub duplicating /calculator-hub's real
      // content — removed as part of the pre-AdSense content-quality pass.
      { source: '/calculator', destination: '/calculator-hub', permanent: true },
      { source: '/loan-calculator', destination: '/calculators/loan-calculator', permanent: true },
      { source: '/vat-calculator', destination: '/calculators/vat-calculator', permanent: true },
      { source: '/profit-margin', destination: '/calculators/profit-margin', permanent: true },
      { source: '/profit-margin-calculator', destination: '/calculators/profit-margin', permanent: true },
      { source: '/discount-calculator', destination: '/calculators/discount-calculator', permanent: true },
      { source: '/age-calculator', destination: '/calculators/age-calculator', permanent: true },
      // Pre-AdSense-resubmission content-quality pass: retired 4 tool
      // pages that were a strict functional subset of a sibling tool (a
      // "cookie cutter"/doorway-page pattern Google's spam policy calls
      // out by name) — redirecting rather than 404ing preserves any
      // existing backlinks/bookmarks to the old URLs.
      { source: '/jpg-to-pdf', destination: '/images-to-pdf', permanent: true },
      { source: '/png-to-pdf', destination: '/images-to-pdf', permanent: true },
      { source: '/pdf-to-png', destination: '/pdf-to-jpg', permanent: true },
      { source: '/webp-to-jpg', destination: '/convert-image-format', permanent: true },
      // Screenshot Studio was fully deleted (see task history); Google
      // Search Console still shows stray 404 crawls for the old URL from
      // lingering backlinks/cache — redirect rather than 404 for anyone
      // still following an old link.
      { source: '/screenshot-studio', destination: '/image-tools', permanent: true },
      // Video Editor, Screen Recorder, Video Studio, and Audio Studio moved
      // out from under /data-tools/* to their own flat top-level routes,
      // matching every other suite's tools — preserves any existing
      // indexed/bookmarked links to the old nested paths.
      { source: '/data-tools/video-editor', destination: '/video-editor', permanent: true },
      { source: '/data-tools/screen-recorder', destination: '/screen-recorder', permanent: true },
      { source: '/data-tools/video-studio', destination: '/video-studio', permanent: true },
      { source: '/data-tools/audio-studio', destination: '/audio-studio', permanent: true },
    ];
  },
};
module.exports = nextConfig;
