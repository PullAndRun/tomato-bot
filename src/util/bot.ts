import config from "@tomato/config/global.toml";
import {
  Client,
  createClient,
  type GroupMessageEvent,
  type Sendable,
} from "@icqqjs/icqq";
import { logger, promptUserInput } from "./log";

const clients: Client[] = [];

async function login(id: number, password: string) {
  const client = createClient({
    platform: config.icqq.platform,
    ver: config.icqq.ver,
    sign_api_addr: config.icqq.sign_api_addr,
    log_level: config.icqq.log_level,
    ffmpeg_path: config.icqq.ffmpeg_path,
    ffprobe_path: config.icqq.ffprobe_path,
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
    throw new Error("没有在线机器人");
  }
  return client;
}

async function sendGroupMsg(gid: number, message: Sendable) {
  await getClient()
    .sendGroupMsg(gid, message)
    .catch((e) => {
      logger.error(
        `\n错误：群消息发送失败\n群号:${gid}\n原因：${JSON.stringify(
          e
        )}\n消息内容：${JSON.stringify(message)}`
      );
    });
}

async function replyGroupMsg(event: GroupMessageEvent, message: Sendable) {
  await event.reply(message, true).catch((e) => {
    logger.error(
      `\n错误：群消息回复失败\n群号:${event.group_id}\n原因：${JSON.stringify(
        e
      )}\n消息内容：${JSON.stringify(message)}`
    );
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
    role: "system" | "owner" | "admin" | "member";
    comment: string;
    plugin: (
      event: GroupMessageEvent,
      message: string,
      command: string
    ) => Promise<void>;
  }>,
  event: GroupMessageEvent
) {
  const cmdParser = (cmd: string) => {
    switch (cmd) {
      case "system":
        return "系统管理员";
      case "owner":
        return "群主";
      case "admin":
        return "群管理员";
      default:
        return "任何人";
    }
  };
  for (const cmd of cmdList) {
    if (!message.startsWith(cmd.command)) {
      continue;
    }
    const roleHierarchy = ["member", "admin", "owner", "system"];
    if (
      roleHierarchy.indexOf(event.sender.role || "system") <
        roleHierarchy.indexOf(cmd.role) &&
      event.sender.user_id !== config.bot.admin
    ) {
      await replyGroupMsg(event, [
        `\n权限不足，无法执行命令`,
        `\n您需要：${cmdParser(cmd.role)} 权限`,
      ]);
      return;
    }
    await cmd.plugin(event, message, cmd.command).catch((e) => {
      logger.error(
        `\n错误：命令执行失败\n命令：${cmd.command}\n原因：${JSON.stringify(
          e
        )}\n消息内容：${message}`
      );
    });
    return;
  }
  const intro = cmdList
    .map(
      (cmd) =>
        `指令：${cmd.command}\n说明：${cmd.comment}\n执行权限:${cmdParser(
          cmd.role
        )}`
    )
    .join("\n\n");
  await replyGroupMsg(event, [intro]);
}

async function init() {
  await login(config.account.qq.id, config.account.qq.password);
}

export { cmd, init, msgRmCmd, replyGroupMsg, sendGroupMsg };
