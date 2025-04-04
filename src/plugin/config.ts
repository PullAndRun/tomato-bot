import type { GroupMessageEvent } from "@icqqjs/icqq";
import { cmd, msgRmCmd, replyGroupMsg } from "../util/bot";
import config from "@tomato/bot/config.toml";
import * as pluginModel from "../model/plugin";
import * as groupModel from "../model/group";

const info = {
  name: "设置",
  comment: [
    `使用 "设置 插件 启用 [插件名]" 命令启用插件`,
    `使用 "设置 插件 禁用 [插件名]" 命令禁用插件`,
    `使用 "设置 人格 [人格名]" 命令设置AI人格`,
    `使用 "设置 插件 状态" 命令查询所有插件状态`,
  ],
  plugin,
};

async function plugin(event: GroupMessageEvent) {
  const msg = msgRmCmd(event.raw_message, [config.bot.name, info.name]);
  const cmdList = [
    {
      command: "插件",
      comment: `使用 "设置 插件" 命令查看如何操作插件`,
      role: "system",
      plugin: plugins,
    },
    {
      command: "人格",
      comment: `使用 "设置 人格 [人格名]" 命令设置AI人格`,
      role: "system",
      plugin: prompts,
    },
  ];
  await cmd(msg, cmdList, event);
}

async function prompts(event: GroupMessageEvent, message: string) {
  await groupModel
    .updatePrompt(event.group_id, message)
    .catch((_) => undefined);
  await replyGroupMsg(event, `人格 ${message} 切换成功`);
}

async function plugins(event: GroupMessageEvent, message: string) {
  const cmdList = [
    {
      command: "启用",
      comment: `使用 "设置 插件 启用 [插件名称]" 命令启用插件`,
      role: "system",
      plugin: pluginEnable,
    },
    {
      command: "禁用",
      comment: `使用 "设置 插件 禁用 [插件名称]" 命令禁用插件`,
      role: "system",
      plugin: pluginDisable,
    },
    {
      command: "状态",
      comment: `使用 "设置 插件 状态" 命令查询所有插件状态`,
      role: "system",
      plugin: pluginState,
    },
  ];
  await cmd(message, cmdList, event);
}

async function pluginEnable(event: GroupMessageEvent, message: string) {
  await pluginModel
    .update(event.group_id, message, true)
    .catch((_) => undefined);
  await replyGroupMsg(event, `插件 ${message} 启用成功`);
}

async function pluginDisable(event: GroupMessageEvent, message: string) {
  await pluginModel
    .update(event.group_id, message, false)
    .catch((_) => undefined);
  await replyGroupMsg(event, `插件 ${message} 禁用成功`);
}

async function pluginState(event: GroupMessageEvent) {
  const plugins = await pluginModel.findByGid(event.group_id);
  const plugin = plugins
    .map((p) => `${p.name} ${p.enable ? "启用" : "禁用"}`)
    .join("\n");
  await replyGroupMsg(event, `插件状态: \n${plugin}`);
}

export { info };
