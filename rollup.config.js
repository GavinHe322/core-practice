import path from 'path'
import ts from 'rollup-plugin-typescript2'
import replace from '@rollup/plugin-replace'
import json from '@rollup/plugin-json'

if (!process.env.TARGET) {
  throw new Error(`Target package must must be specified via --environment flag.`)
}

const masterVersion  = require('./package.json').version
const packagesDir = path.resolve(__dirname,  'packages')
const packageDir = path.resolve(packagesDir, process.env.TARGET)
const resolve =  p => path.resolve(packageDir, p)
const pkg = require(resolve('package.json'))
const packageOptions = pkg.buildOptions || {}
const name = packageOptions.filename || path.basename(packageDir)
