import type { GroupMessageEvent } from "@icqqjs/icqq";
import config from "@tomato/bot/config.toml";
import { msgRmCmd, replyGroupMsg } from "../util/bot";

const info = {
  name: "占卜",
  comment: "占卜 占卜内容",
  plugin,
};

async function plugin(event: GroupMessageEvent) {
  const msg = msgRmCmd(event.raw_message, [config.bot.name, info.name]);
  if (!msg) {
    await replyGroupMsg(event, [
      `命令错误。请输入您想占卜的内容。例如：${config.bot.name}占卜 今天运气`,
    ]);
    return;
  }
  await replyGroupMsg(event, [`您占卜的“${msg}”结果是“${divination()}”`]);
}

function divination() {
  const fortunes = ["大吉", "中吉", "小吉", "小凶", "凶", "大凶"];
  return fortunes[Math.floor(Math.random() * fortunes.length)];
}

export { info };
