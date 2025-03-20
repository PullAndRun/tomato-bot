import { createClient } from "@icqqjs/icqq";
import config from "@deep/config/global.toml";
function login() {
  const client = createClient({
    platform: config.icqq.platform,
    ver: config.icqq.ver,
    sign_api_addr: config.icqq.sign_api_addr,
    log_level: config.icqq.log_level,
    ffmpeg_path: config.icqq.ffmpeg_path,
    ffprobe_path: config.icqq.ffprobe_path,
    resend: config.icqq.resend,
  });
}
