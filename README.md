# Create slideshow from images
Based on https://github.com/sashee/images2video

This is crappy edit to read images from img folder.
Updated fps to 60, crossfade to 1sec.

## Approach #3: melt 
- leaved only this algo, based on testing this is fastest

Uses the MLT framework to render the video.

Example:

```
melt /tmp/DdV4ig/0.png out=824 /tmp/DdV4ig/1.png out=824 -mix 12 -mixer luma /tmp/DdV4ig/2.png out=812 -mix 12 -mixer luma -consumer avformat:/tmp/output/res.mp4 frame_rate_num=25 width=1920 height=1080 sample_aspect_num=1 sample_aspect_den=1
```

## Usage

* Make sure you have Docker installed
* ```npm ci```
* ```npm run run -- --imageDuration 8 --filename res.mp4```

### Options

* ```--imageDuration```: How long each image is shown
* ```--filename```: the name of the file that will be placed to the output directory
