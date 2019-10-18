const execa = require('execa')
const { fuzzyMatchTarget } = require('./utils')
const args = require('minimist')(process.argv.slice(2))
const target = args._.length ? fuzzyMatchTarget(args._)[0] : 'vue'
const formats = args.formats || args.f

execa(
  'rollup',
  [
    '-wc',
    '--environment',
    [`TARGET:${target}`, `FORMATS:${formats || 'global'}`].join(',')
  ],
  {
    stdio: 'inherit'
  }
)
