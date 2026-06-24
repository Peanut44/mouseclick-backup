// Legacy query endpoint kept for VLC/browser compatibility.
// For Mouseclick/Peanut Android app, use /api/hls/peanut.m3u8 style instead.
import hlsHandler from "./hls/[name].js";
import segHandler from "./seg/[name]/[segment].js";

export default async function handler(req, res) {
  if (req.query.seg) {
    req.query.segment = req.query.seg;
    return segHandler(req, res);
  }
  req.query.name = req.query.name;
  return hlsHandler(req, res);
}
