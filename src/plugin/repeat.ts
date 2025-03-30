import type { GroupMessageEvent } from "@icqqjs/icqq";
import config from "@tomato/bot/config.toml";
import { sendGroupMsg } from "../util/bot";

const info = {
  name: "复读",
  comment: "无",
  plugin,
};

const repeatMap: Map<number, { msg: string; count: number }> = new Map();
async function plugin(event: GroupMessageEvent) {
  const { group_id, raw_message, message } = event;
  if (
    raw_message.trim().startsWith(config.bot.name) ||
    raw_message.trim().includes(config.bot.nick_name)
  )
    return;
  const repeatItem = repeatMap.get(group_id);
  if (!repeatItem || raw_message !== repeatItem.msg) {
    repeatMap.set(group_id, { msg: raw_message, count: 1 });
    return;
  }
  const newCount = repeatItem.count + 1;
  if (newCount === config.bot.repeat) {
    await sendGroupMsg(group_id, message);
  }
  repeatMap.set(group_id, {
    msg: raw_message,
    count: newCount,
  });
}

export { info };
