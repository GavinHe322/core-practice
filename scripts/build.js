const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')
const execa = require('execa')
const { gzipSync } = require('zlib')
const { compress } = require('brotli')
const { targets: allTargets, fuzzyMatchTarget } = require('./utils')

const  args = require('minimist')(process.argv.slice(2))
const targets = args._
const formats  = args.formats || args.f
const devOnly =  args.devOnly || args.d
const prodOnly = !devOnly && (args.prodOnly || args.p)
const sourceMap = args.sourcemap || args.s
const isRelease = args.release
const buildTypes = args.t || args.types || isRelease
const buildAllMatching = args.all || args.a
const commit = execa.sync('git',  ['rev-parse', 'HEAD']).stdout.slice(0, 7)

run()

async function run() {
  if (isRelease) {
    await fs.remove(path.resolve(__dirname, '../node_modules/.rts2_cache'))
  }

  if (targets.length) {
    // 只单独构建穿传入的 ex: targets = ['shared']
    await buildAll(fuzzyMatchTarget(targets,  buildAllMatching))
  }
}

async function buildAll(targets) {
  const cpus = require('os').cpus
  await runParallel(cpus.length, targets, build)
}

async function runParallel(maxConcurrency, source, iteratorFn) {
  const ret = []
  const executing = []
  for (const item of source) {
    const p = Promise.resolve().then(() => iteratorFn(item, source))
    ret.push(p)

    if (maxConcurrency <= source.length) {
      const  e= p.then(() => executing.splice(executing.indexOf(e), 1))
      executing.push(e)

      if (executing.length >= maxConcurrency) {
        await Promise.race(executing)
      }
    }
  }
  return Promise.all(ret)
}

async function build(target) {
  const pkgDir = path.resolve(`packages/${target}`)
  const pkg = require(`${pkgDir}/package.json`)
  if ((isRelease || !targets.length) && pkg.private) {
    return
  }

  // 构建指定的format, 删除 dist
  if (!formats) {
    await fs.remove(`${pkgDir}/dist`)
  }

  const env =
    (pkg.buildOptions && pkg.buildOptions.env) ||
    (devOnly ? 'development' : 'production')

  await execa('rollup', [
    '-c',
    '--environment',
    [
      `COMMIT:${commit}`,
      `NODE_ENV:${env}`,
      `TARGET:${target}`,
      formats ? `FORMATS:${formats}` : ``,
      buildTypes ? `TYPES:true` : ``,
      prodOnly ? `PROD_ONLY:true`  : ``,
      sourceMap ? `SOURCE_MAP:true`: ``
    ].filter(Boolean).join(',')
    ],
    { stdio: 'inherit' }
  )

  if (buildTypes && pkg.types) {
    console.log()
    console.log(
      chalk.bold(chalk.yellow(`Rolling up type definitions for ${target}...`))
    )

    // build types
    // const t
  }
}
