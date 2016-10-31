'use strict'

require('shelljs/global')

var async = require('async')
var globby = require('globby')
var leftPad = require('left-pad')
var path = require('path')

module.exports = class DroppedFrames {
  constructor (config) {
    this.config = config
  }

  copy (inputDirectory, outputDirectory, callback) {
    var config = this.config

    var inputGlob = path.join(inputDirectory, config.inputDirectoryPattern)
    var directories = globby.sync([inputGlob])

    async.eachSeries(directories, (directory, next) => {
      var newDirectory = path.join(outputDirectory, path.basename(directory))

      if (!test('-d', newDirectory)) mkdir(newDirectory)

      var frames = globby.sync(path.join(directory, '*.dng'))

      if (config.safe) this.safeCopyFrames(frames, newDirectory, next)
      else this.unsafeCopyFrames(frames, newDirectory, next)
    }, callback)
  }

  safeCopyFrames (frames, newDirectory, callback) {
    var config = this.config

    async.eachSeries(frames, (frame, frameDone) => {
      var newFile = path.join(newDirectory, path.basename(frame))

      if (test('-f', newFile)) return setImmediate(frameDone)

      config.log('copying', frame, 'to', newFile)

      exec(`dd if=${frame} of=${newFile} conv=noerror,sync`, { silent: !config.debug }, frameDone)
    }, callback)
  }

  unsafeCopyFrames (frames, newDirectory, callback) {
    var badFrames = []
    var config = this.config

    async.eachLimit(frames, config.parallelLimit, (frame, frameDone) => {
      var newFile = path.join(newDirectory, path.basename(frame))

      if (test('-f', newFile)) return setImmediate(frameDone)

      config.log('copying', frame, 'to', newFile)

      exec(`cp ${frame} ${newFile}`, { silent: !config.debug }, exitCode => {
        if (exitCode > 0) badFrames.push(newFile)
        frameDone()
      })
    }, () => {
      if (badFrames.length > 0) {
        config.log('bad frames found', badFrames)
        this.replaceBadFrames(badFrames, callback)
      } else {
        callback()
      }
    })
  }

  replaceBadFrames (badFrames, callback = () => {}) {
    badFrames
      .sort()
      .reduce((groupsOfBadFrames, badFrame, index, badFrames) => {
        var frameNum = Number(this.getFrameNum(badFrame))

        var previousFrame = badFrames[index - 1]
        var previousFrameNum = previousFrame ? Number(this.getFrameNum(previousFrame)) : NaN

        var isSequential = frameNum - previousFrameNum === 1

        var currentGroup
        if (groupsOfBadFrames.length === 0 || !isSequential) {
          currentGroup = []
          groupsOfBadFrames.push(currentGroup)
        } else {
          currentGroup = groupsOfBadFrames[groupsOfBadFrames.length - 1]
        }

        currentGroup.push(badFrame)

        return groupsOfBadFrames
      }, [])
      .forEach(groupOfBadFrames => groupOfBadFrames.forEach(this.cloneClosestFrame.bind(this)))

    callback()
  }

  getFrameNum (frame) {
    var reg = new RegExp(`${this.config.separator}(\\d+)\\${path.extname(frame)}$`)
    return frame.match(reg)[1]
  }

  cloneClosestFrame (badFrame, _, badFrames) {
    var config = this.config

    var ext = path.extname(badFrame)
    var totalNumFrames = globby.sync(path.join(path.dirname(badFrame), `*${ext}`)).length

    var middleIndex = Math.round(badFrames.length / 2)
    var getNextFrame = badFrames.indexOf(badFrame) >= middleIndex

    var frameNum = this.getFrameNum(badFrame)
    var frameDigitLength = frameNum.length
    frameNum = Number(frameNum)
    if (frameNum + 1 > totalNumFrames) getNextFrame = false
    if (frameNum - 1 <= 0) getNextFrame = true

    var closestFrame
    var closestFrameNum = frameNum

    while (!closestFrame && (closestFrameNum += getNextFrame ? 1 : -1)) { // eslint-disable-line no-unmodified-loop-condition
      var maybeClosestFrameName = badFrame.replace(/\d{6}\.dng$/, `${leftPad(closestFrameNum, frameDigitLength, 0)}${ext}`)
      var maybeClosestFrame = globby.sync(maybeClosestFrameName)
      if (!maybeClosestFrame.length === 0) continue
      else closestFrame = maybeClosestFrame[0]
    }

    config.log('replacing bad frame', badFrame, 'with', closestFrame)

    cp(closestFrame, badFrame)
  }
}
