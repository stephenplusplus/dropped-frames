#!/usr/bin/env node

var DroppedFrames = require('./')

var DEFAULTS = {
  debug: false,
  inputDirectory: '/Volumes/A001',
  inputDirectoryPattern: '*',
  parallelLimit: 3,
  safe: false,
  separator: '_',
  log: () => {}
}

var help = [
  '  dropped-frames inputDirectory outputDirectory [config]',
  '  replace-frames corruptFrameFirst ...corruptFrameLast',
  '',
  '    Examples:',
  '      dropped-frames /Volumes/A001 /Volumes/BackupDrive',
  '      replace-frames /Volumes/A001/A001_1026_C101/*{256,257,258}.dng',
  '',
  '    Configuration',
  '      --debug                  Will log status updates to the terminal. Default: false',
  '      --inputDirectoryPattern  A glob pattern to match directories within [inputDirectory]. Default: *',
  '      --parallelLimit          How many files to copy at once. The higher, the riskier. Default: 3',
  '      --safe                   Run the copy operation with dd, which does its own block replacement. Default: false',
  '      --separator              From an image sequence, the character that separates the numeric increments. Default: _'
].join('\n')

require('taketalk')({
  init: (input, options) => {
    var replace = process.argv[1].split('/').pop() === 'replace-frames'

    options = Object.assign({}, DEFAULTS, options, {
      log: function () {
        if (!options.debug) return

        var args = [].slice.call(arguments).map(arg => {
          if (typeof arg !== 'string' && typeof arg !== 'number') {
            try { arg = JSON.stringify(arg, null, 2) } catch (e) {}
          }

          return arg
        })

        console.log.apply(console, [new Date().toString()].concat(args))
      }
    })

    if (typeof options.debug === 'string') options.debug = options.debug !== 'false'

    var df = new DroppedFrames(options)

    if (replace) return df.replaceBadFrames(options._, err => { if (err) throw err })

    var [
      inputDirectory,
      outputDirectory
    ] = options._

    if (!inputDirectory || !outputDirectory) {
      console.error('An input directory and output directory must be specified')
      console.log()
      console.log(help)
      return
    }

    df.copy(inputDirectory, outputDirectory, err => { if (err) throw err })
  },

  help,

  version: require('./package.json').version
})
