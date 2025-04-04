import type { GroupMessageEvent } from "@icqqjs/icqq";
import { replyGroupMsg } from "../util/bot";
import { help } from "../util/plugin";

const info = {
  name: "帮助",
  comment: [`使用 "帮助" 命令查看机器人命令文档`],
  plugin,
};

async function plugin(event: GroupMessageEvent) {
  await replyGroupMsg(event, [help()]);
}

export { info };
