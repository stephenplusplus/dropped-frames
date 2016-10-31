# Dropped Frames
> Repair dropped frames from an image sequence

```js
$ npm install -g dropped-frames
$ dropped-frames /Volumes/A001 /Volumes/BackupDrive
```


## What happens

All of the files from an input directory are copied to an output directory. Any of the files that fail to copy are considered corrupt, and will be replaced **in the output directory** with the frame that is closest to it.

The data on the corrupt disk will not be affected.


## How do I use it

### OS X

If your drive doesn't mount on OS X, you will need to boot into safe mode by holding down the Shift key while restarting. It should appear then. If it doesn't, it might be too late :(

### Windows

Not sure. Testers welcome!

```js
$ dropped-frames -h

dropped-frames inputDirectory outputDirectory [config]
replace-frames corruptFrameFirst ...corruptFrameLast

  Examples
    dropped-frames /Volumes/A001 /Volumes/BackupDrive
    replace-frames /Volumes/A001/A001_1026_C101/*{256,257,258}.dng

  Configuration
    --debug                  Will log status updates to the terminal. Default: false
    --inputDirectoryPattern  A glob pattern to match directories within [inputDirectory]. Default: *
    --parallelLimit          How many files to copy at once. The higher, the riskier. Default: 3
    --safe                   Run the copy operation with dd, which does its own block replacement. Default: false
    --separator              From an image sequence, the character that separates the numeric increments. Default: _
```
