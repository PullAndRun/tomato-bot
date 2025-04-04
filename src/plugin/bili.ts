import { segment, type GroupMessageEvent } from "@icqqjs/icqq";
import config from "@tomato/bot/config.toml";
import dayjs from "dayjs";
import schedule from "node-schedule";
import { z } from "zod";
import * as biliModel from "../model/bili";
import * as pluginModel from "../model/plugin";
import {
  cmd,
  getClient,
  msgRmCmd,
  replyGroupMsg,
  sendGroupMsg,
} from "../util/bot";
import { fetchImageToBase64 } from "../util/util";

const info = {
  name: "主播",
  comment: [
    `使用 "主播 关注 [主播昵称]" 命令关注主播`,
    `使用 "主播 取关 [主播昵称]" 命令取关主播`,
    `使用 "主播 查询 [主播昵称]" 命令查询主播直播动态`,
    `使用 "主播 列表" 命令展示已关注主播列表`,
  ],
  plugin,
};

async function plugin(event: GroupMessageEvent) {
  const msg = msgRmCmd(event.raw_message, [config.bot.name, info.name]);
  const cmdList = [
    {
      command: "关注",
      comment: `使用 "主播 关注 [主播昵称]" 命令关注主播`,
      role: "admin",
      plugin: follow,
    },
    {
      command: "取关",
      comment: `使用 "主播 取关 [主播昵称]" 命令取关主播`,
      role: "admin",
      plugin: unfollow,
    },
    {
      command: "查询",
      comment: `使用 "主播 查询 [主播昵称]" 命令查询主播直播讯息`,
      role: "member",
      plugin: query,
    },
    {
      command: "列表",
      comment: `使用 "主播 列表" 命令展示已关注主播列表`,
      role: "member",
      plugin: list,
    },
  ];
  await cmd(msg, cmdList, event);
}

async function follow(event: GroupMessageEvent, uname: string) {
  if (!uname) {
    await replyGroupMsg(event, [
      `关注失败,缺少主播昵称\n`,
      `请使用 "主播 关注 [主播昵称]" 命令关注主播。`,
    ]);
    return;
  }
  const user = await fetchUser(uname);
  if (!user || user.uname !== uname) {
    await replyGroupMsg(event, [
      `关注失败,没找到您想关注的主播\n`,
      `请检查主播昵称是否正确。`,
    ]);
    return;
  }
  await biliModel.findOrAdd(user.uname, event.group_id, user.mid, user.room_id);
  await replyGroupMsg(event, [`关注成功\n`, `已为您关注主播 "${uname}"`]);
}

async function unfollow(event: GroupMessageEvent, uname: string) {
  if (!uname) {
    await replyGroupMsg(event, [
      `取关失败,缺少主播昵称\n`,
      `请使用 "主播 取关 [主播昵称]" 命令取关主播。`,
    ]);
    return;
  }
  await biliModel.remove(event.group_id, uname);
  await replyGroupMsg(event, [`取关成功\n`, `已为您取关主播 "${uname}"`]);
}

async function list(event: GroupMessageEvent) {
  const followList = await biliModel.findAll();
  if (!followList) {
    await replyGroupMsg(event, [`拉取关注列表失败,本群尚未关注任何主播。`]);
    return;
  }
  await replyGroupMsg(event, [
    `本群订阅的主播:\n`,
    followList.map((v) => v.name).join("\n"),
  ]);
}

async function query(event: GroupMessageEvent, uname: string) {
  if (!uname) {
    await replyGroupMsg(event, [
      `查询失败,缺少主播昵称\n`,
      `请使用 "主播 查询 [主播昵称]" 命令查询主播。`,
    ]);
    return;
  }
  const user = await fetchUser(uname);
  if (!user || user.uname !== uname) {
    await replyGroupMsg(event, [
      `查询失败,没找到您想查询的主播,请检查主播昵称。`,
    ]);
    return;
  }
  const live = await fetchLive([user.room_id]);
  if (!live) {
    await replyGroupMsg(event, [`您查询的主播没有开通直播间。`]);
    return;
  }
  const liveData = live[user.mid];
  if (liveData.live_status === 0) {
    await replyGroupMsg(event, [`您查询的主播没开播。`]);
    return;
  }
  const msg = await liveMsg(liveData);
  await replyGroupMsg(event, msg);
}

async function liveMsg(liveData: {
  cover_from_user: string;
  title: string;
  uname: string;
  live_time: number;
  room_id: number;
}) {
  const coverImage = await fetchImageToBase64(liveData.cover_from_user);
  return [
    segment.image(`base64://${coverImage || ""}`) + "\n",
    `主播: "${liveData.uname}"\n`,
    `标题: ${liveData.title}\n`,
    `开播时间: ${dayjs(liveData.live_time * 1000).format(
      "YYYY-MM-DD HH:mm:ss"
    )}\n`,
    `直播间: https://live.bilibili.com/${liveData.room_id}`,
  ];
}

async function fetchUser(name: string) {
  const user = await fetch(config.bili.user + name, {
    signal: AbortSignal.timeout(5000),
    headers: {
      cookie: config.bili.cookie,
    },
  })
    .then((res) => res.json())
    .catch((_) => undefined);
  if (!user) return undefined;
  const userSchema = z.object({
    data: z.object({
      result: z
        .array(
          z.object({
            uname: z.string(),
            mid: z.number(),
            room_id: z.number(),
          })
        )
        .min(1),
    }),
  });
  const userData = userSchema.safeParse(user);
  return userData.success ? userData.data.data.result[0] : undefined;
}

async function fetchLive(room_id: Array<number>) {
  const live = await fetch(config.bili.live, {
    method: "post",
    signal: AbortSignal.timeout(5000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uids: room_id }),
  })
    .then((res) => res.json())
    .catch((_) => undefined);
  if (!live) return undefined;
  const liveSchema = z.object({
    data: z.record(
      //主播uid
      z.string(),
      z.object({
        //直播间标题
        title: z.string(),
        //直播间房间号
        room_id: z.number(),
        //new Date(live_time*1000)
        live_time: z.number(),
        //0未开播,1开播,2轮播
        live_status: z.number(),
        //主播昵称
        uname: z.string(),
        //直播间封面url
        cover_from_user: z.string(),
      })
    ),
  });
  const liveData = liveSchema.safeParse(live);
  return liveData.success ? liveData.data.data : undefined;
}

async function cleanUpInactiveGroups() {
  const qGroups = getClient()
    .getGroupList()
    .entries()
    .toArray()
    .map((v) => v[1].group_id);
  const biliFindAll = await biliModel.findAll();
  const biliGroups = biliFindAll.map((v) => v.gid);
  for (const group of biliGroups) {
    if (qGroups.includes(group)) continue;
    await biliModel.removeGroup(group);
  }
}

async function pushLiveNotifications() {
  const groups = getClient().getGroupList();
  const biliFindAll = await biliModel.findAll();
  if (!biliFindAll) return;
  const rids = biliFindAll.map((v) => v.rid);
  const lives = await fetchLive(rids);
  if (!lives) return;
  for (const [_, group] of groups) {
    const lock = await pluginModel.findOrAdd(group.group_id, "直播推送", true);
    if (!lock.enable) continue;
    const vtbs = biliFindAll.filter((v) => v.gid === group.group_id);
    if (!vtbs) continue;
    for (const vtb of vtbs) {
      const user = lives[vtb.mid];
      if (
        !dayjs()
          .subtract(config.bili.frequency, "minute")
          .isBefore(new Date(user.live_time)) ||
        user.live_status !== 1
      )
        continue;
      const msg = await liveMsg(user);
      await sendGroupMsg(group.group_id, msg);
    }
  }
}

async function task() {
  schedule.scheduleJob(`0 0 0 * * *`, cleanUpInactiveGroups);
  schedule.scheduleJob(`0 */2 * * * *`, pushLiveNotifications);
}

async function init() {
  task();
}

export { info, init };
