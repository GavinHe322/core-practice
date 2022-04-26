// 使用 esbuild 更快的开发构建
// tree-shaking 更好

const { build } = require('esbuild')
const nodePolyfills = require('@esbuild-plugins/node-modules-polyfill')
const { resolve, relative } = require('path')
const args =  require('minimist')(process.argv.slice(2))


const target = args._[0] || 'vue'
const format = args.f  || 'global'
const inlineDeps = args.i || args.inline
const pkg =  require(resolve(__dirname, `../packages/${target}/package.json`))
console.log(pkg, 'pkg')

// resolve output
const outputFormat = format.startsWith('global')
  ? 'iife'
  : format === 'cjs'
  ? 'cjs'
  : 'esm'

const postfix =  format.endsWith('--runtime')
 ? `runtime.${format.replace(/-runtime/, '')}`
 : format

const outfile = resolve(
  __dirname,
  `../packages/${target}/dist/${target}.${postfix}.js`
)
const relativeOutfile = relative(process.cwd(), outfile)


let external = []
if (!inlineDeps) {
  // cjs & esm-builder: external all deps
  if (format === 'cjs' || format.includes('esm-builder')) {
    external = [
      ...external,
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.peerDependencies || {}),
      // for @vue/compiler-sfc / server-renderer
      'path',
      'url',
      'stream'
    ]
  }

  if (target === 'compiler-sfc') {
    const consolidateDeps = require.resolve('@vue/consolidate/package.json', {
      paths: [resolve(__dirname, `../packages/${target}/`)]
    })

    external = [
      ...external,
      ...Object.keys(require(consolidateDeps).devDependencies),
      'fs',
      'vm',
      'crypto',
      'react-dom/server',
      'teacup/lib/express',
      'arc-templates/dist/es5',
      'then-pug',
      'then-jade'
    ]
  }
}

build({
  entryPoints: [resolve(__dirname, `../packages/${target}/src/index.ts`)],
  outfile,
  bundle: true,
  external,
  sourcemap: true,
  format: outputFormat,
  globalName: pkg.buildOptions?.name,
  platform: format === 'cjs' ? 'node' : 'browser',
  plugins:
    format === 'cjs' || pkg.buildOptions?.enableNonBrowserBranches
      ? [nodePolyfills.default()]
      : undefined,
  define: {
    __COMMIT__: `"dev"`,
    __VERSION__: `"${pkg.version}"`,
    __DEV__: `true`,
    __TEST__: `false`,
    __BROWSER__: String(
      format !== 'cjs' && !pkg.buildOptions?.enableNonBrowserBranches
    ),
    __GLOBAL__: String(format === 'global'),
    __ESM_BUNDLER__: String(format.includes('esm-bundler')),
    __ESM_BROWSER__: String(format.includes('esm-browser')),
    __NODE_JS__: String(format === 'cjs'),
    __SSR__: String(format === 'cjs' || format.includes('esm-bundler')),
    __COMPAT__: `false`,
    __FEATURE_SUSPENSE__: `true`,
    __FEATURE_OPTIONS_API__: `true`,
    __FEATURE_PROD_DEVTOOLS__: `false`
  },
  watch: {
    onRebuild(error) {
      if (!error) console.log(`rebuilt: ${relativeOutfile}`)
    }
  }
}).then(() => {
  console.log(`wathing: ${relativeOutfile}`)
})
