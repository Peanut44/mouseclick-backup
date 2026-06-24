Mouseclick Vercel Direct Main v13

Upload these files to the ROOT of your GitHub repo:

api/direct.js
api/debug.js
api/status.js
api/playlist.js
vercel.json

Important:
- vercel.json MUST be in the root repo, not inside api.
- This version tries Direct Vercel -> BozzTV first.
- If direct upstream fails, it can fall back to your Cloudflare Worker URLs.
- To disable Worker fallback, add Vercel Environment Variable:
  DISABLE_WORKER_FALLBACK=1

Test URLs:
https://mouseclick-backup.vercel.app/api/status
https://mouseclick-backup.vercel.app/api/debug?name=peanut
https://mouseclick-backup.vercel.app/playlist.m3u8
https://mouseclick-backup.vercel.app/peanut.m3u8
https://mouseclick-backup.vercel.app/direct/peanut.m3u8

Channels:
peanut
mochi
moon
kolet
southstartv
duriantv

Recommended for main Mouseclick app test:
https://mouseclick-backup.vercel.app/playlist.m3u8
or per-channel:
https://mouseclick-backup.vercel.app/peanut.m3u8
