Mouseclick Direct Vercel Test

Upload these files to the ROOT of your GitHub repo:
- vercel.json
- api/direct.js
- api/debug.js
- api/status.js

After Vercel redeploy, test:
1. https://mouseclick-backup.vercel.app/api/status
2. https://mouseclick-backup.vercel.app/api/debug?name=peanut
3. https://mouseclick-backup.vercel.app/direct/peanut.m3u8
4. https://mouseclick-backup.vercel.app/peanut.m3u8

If /api/debug?name=peanut still shows all 502, Vercel IP is blocked by upstream.
If debug is 200 and playlist loads, test /peanut.m3u8 in Mouseclick app.
