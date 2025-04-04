import {
  Client,
  createClient,
  type GroupMessageEvent,
  type Sendable,
} from "@icqqjs/icqq";
import config from "@tomato/bot/config.toml";
import * as groupModel from "../model/group";
import * as pluginModel from "../model/plugin";
import { logger, promptUserInput } from "./log";
import * as plugin from "./plugin";

const clients: Client[] = [];

async function login(id: number, password: string) {
  const client = createClient({
    platform: config.icqq.platform,
    ver: config.icqq.ver,
    data_dir: config.icqq.data_dir,
    sign_api_addr: config.icqq.sign_api_addr,
    log_level: config.icqq.log_level,
    resend: config.icqq.resend,
  });
  client
    .on("system.login.slider", async (v) => {
      const ticket = await promptUserInput(
        `\nQQ登录 -> Ticket\nQQ号 -> ${id}\n网址 -> ${v.url}`,
        `\n请输入Ticket`
      );
      await client.submitSlider(ticket);
    })
    .on("system.login.device", async (_) => {
      await client.sendSmsCode();
      const smsCode = await promptUserInput(
        `\nQQ登陆 -> 短信验证码\nQQ号 -> ${id}`,
        `\n请输入短信验证码`
      );
      await client.submitSmsCode(smsCode);
    });
  await client.login(id, password);
  clients.push(client);
}

function getClient() {
  const client = clients[0];
  if (!client) {
    throw new Error("->错误:没有在线机器人");
  }
  return client;
}

function logError(
  action: string,
  groupId: number,
  message: Sendable,
  error: unknown
) {
  logger.warn(
    `->警告:${action}\n->群号:${groupId}\n->原因:\n${JSON.stringify(
      error
    )}\n->消息内容:\n${JSON.stringify(message)}`
  );
}

async function sendGroupMsg(gid: number, message: Sendable) {
  await getClient()
    .sendGroupMsg(gid, message)
    .catch((e) => {
      logError("群消息发送失败", gid, message, e);
    });
}

async function replyGroupMsg(event: GroupMessageEvent, message: Sendable) {
  await event.reply(message, true).catch((e) => {
    logError("群消息回复失败", event.group_id, message, e);
  });
}

function msgRmCmd(msg: string, cmd: string[]) {
  return cmd.reduce(
    (acc, cur) =>
      msgText(acc.replace(new RegExp(`(^\\s*${cur}\\s*)`, "g"), "")),
    msg
  );
}

function msgText(msg: string) {
  return msg
    .replace(new RegExp(`(\\[.+?\\])`, "g"), "")
    .replace(/(\r+)/g, "\r")
    .replace(/\s+/g, " ")
    .trim();
}

async function cmd(
  message: string,
  cmdList: Array<{
    command: string;
    comment: string;
    role: string;
    plugin: (event: GroupMessageEvent, message: string) => Promise<void>;
  }>,
  event: GroupMessageEvent
) {
  const roleHierarchy = ["member", "admin", "owner", "system"];
  const cmdParser: Record<string, string> = {
    system: "系统管理员",
    owner: "群主",
    admin: "群管理员",
    member: "任何人",
  };
  for (const cmd of cmdList) {
    if (!message.startsWith(cmd.command)) continue;
    if (
      roleHierarchy.indexOf(event.sender.role || "system") <
        roleHierarchy.indexOf(cmd.role) &&
      event.sender.user_id !== config.bot.admin
    ) {
      await replyGroupMsg(event, [
        `权限不足,无法执行命令`,
        `\n您需要: ${cmdParser[cmd.role]}权限`,
      ]);
      return;
    }
    await cmd.plugin(event, msgRmCmd(message, [cmd.command]));
    return;
  }
  const intro = cmdList
    .map(
      (cmd) =>
        `指令: ${cmd.command}\n说明: ${cmd.comment}\n执行权限: ${
          cmdParser[cmd.role]
        }`
    )
    .join("\n\n");
  await replyGroupMsg(event, [intro]);
}

async function listener() {
  getClient().on("message.group", async (event) => {
    const message = msgText(event.raw_message);
    if (!message.startsWith(config.bot.name)) {
      plugin.pick("复读");
      return;
    }
    const pickedPlugin = plugin.pick(message);
    if (!pickedPlugin) {
      plugin.pick("聊天");
      return;
    }
    const lock = await pluginModel.findOrAdd(
      event.group_id,
      pickedPlugin.name,
      true
    );
    if (!lock.enable) {
      await replyGroupMsg(event, [
        `错误: "${lock.name}" 功能未激活,请联系管理员激活。`,
      ]);
      return;
    }
    pickedPlugin.plugin(event);
  });
  getClient().on("request.group.invite", async (event) => {
    await event.approve(true);
    await getClient().reloadGroupList();
    await groupModel.active(event.group_id, true);
    logger.warn(`机器人加入了群 ${event.group_id}`);
  });
  getClient().on("notice.group.increase", async (event) => {
    await sendGroupMsg(event.group_id, [
      `欢迎 ${event.nickname} 加入${event.group.name}`,
    ]);
  });
  getClient().on("notice.group.decrease", async (event) => {
    if (config.bot.admin === event.user_id) {
      await getClient().setGroupLeave(event.group_id);
      getClient().reloadGroupList();
      await groupModel.active(event.group_id, false);
      return;
    }
    await sendGroupMsg(event.group_id, [
      `有群员退群\n`,
      `昵称: ${event.member?.nickname}\n`,
      `ID: ${event.user_id}\n`,
      `原因: ${
        event.operator_id === event.user_id ? "自己退群" : "管理员清退"
      }`,
    ]);
  });
}

async function init() {
  await login(config.qq.id, config.qq.password);
  await listener();
}

export { cmd, getClient, init, msgRmCmd, replyGroupMsg, sendGroupMsg };
