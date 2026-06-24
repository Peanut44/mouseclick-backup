Mouseclick Vercel v10

Upload these to the ROOT of your GitHub repo:
- api/hls.js
- api/channel.js
- api/status.js
- vercel.json

Important: vercel.json must be at the repository root, not inside api folder.

Test after redeploy:
1. https://mouseclick-backup.vercel.app/api/status
2. https://mouseclick-backup.vercel.app/api/hls?name=peanut
3. https://mouseclick-backup.vercel.app/watch/peanut.m3u8
4. https://mouseclick-backup.vercel.app/peanut.m3u8

If #2 works but #4 is 404, vercel.json was not uploaded to root or Vercel did not redeploy the latest commit.
Use /api/hls?name=peanut or /watch/peanut.m3u8 as fallback.
