import type { GroupMessageEvent } from "@icqqjs/icqq";
import config from "@tomato/bot/config.toml";
import schedule from "node-schedule";
import { z } from "zod";
import { findOrAdd } from "../model/plugin";
import { cmd, getClient, msgRmCmd, replyGroupMsg } from "../util/bot";

const info = {
  name: "新闻",
  comment: `使用 "新闻 头条" 命令获取当前头条新闻,使用 "新闻 财经" 命令获取当前财经新闻`,
  plugin,
};

const newsMap: Map<number, Array<string>> = new Map();
async function plugin(event: GroupMessageEvent) {
  const msg = msgRmCmd(event.raw_message, [config.bot.name, info.name]);
  const cmdList = [
    {
      command: "头条",
      comment: `使用 "新闻 头条" 命令获取当前头条新闻`,
      role: "member",
      plugin: hotNews,
    },
    {
      command: "财经",
      comment: `使用 "新闻 财经" 命令获取当前财经新闻`,
      role: "member",
      plugin: financeNews,
    },
  ];
  await cmd(msg, cmdList, event);
}

async function hotNews(event: GroupMessageEvent) {
  await sendNews(event, fetchHot, "热点新闻");
}

async function financeNews(event: GroupMessageEvent) {
  await sendNews(event, fetchFinance, "财经新闻");
}

async function sendNews(
  event: GroupMessageEvent,
  fetchFunction: () => Promise<
    Array<{ title: string; content: string }> | undefined
  >,
  newsType: string
) {
  const news = await fetchFunction();
  if (!news) {
    await replyGroupMsg(event, [`获取${newsType}失败，请稍后再试。`]);
    return;
  }
  const newNews = await duplicate(event.group_id, news);
  if (!newNews || !newNews.length) {
    await replyGroupMsg(event, [`暂时没有新的${newsType}。`]);
    return;
  }
  await replyGroupMsg(event, [
    `为您推送${newsType}:\n\n` +
      newNews
        .map((v, i) => `${i + 1}、${v.title}\n=>${v.content}`)
        .join("\n\n"),
  ]);
}

async function duplicate(
  gid: number,
  news: Array<{ title: string; content: string }>
) {
  const newsItem = newsMap.get(gid) || [];
  const newNews = news.filter((v) => !newsItem.includes(v.title));
  if (!newNews.length) return undefined;
  const newNewsTitles = newNews.map((v) => v.title);
  newsMap.set(gid, [...newsItem, ...newNewsTitles]);
  return newNews;
}

async function fetchFinance() {
  const finance = await fetch(config.news.finance, {
    signal: AbortSignal.timeout(5000),
  })
    .then((resp) => resp.json())
    .catch((_) => undefined);
  const financeSchema = z.object({
    Result: z.object({
      content: z.object({
        list: z
          .array(
            z.object({
              title: z.string().nullish(),
              content: z.object({
                items: z.array(z.object({ data: z.string() })).min(1),
              }),
            })
          )
          .min(1),
      }),
    }),
  });
  const financeData = financeSchema.safeParse(finance);
  if (!financeData.success) return undefined;
  return financeData.data.Result.content.list
    .map((v) => {
      const content = v.content.items
        .map((vv) => {
          if (!v.title || !vv.data) return undefined;
          if (vv.data.replace(/。/g, "") === v.title.replace(/。/g, ""))
            return "快讯内容同标题";
          return vv.data;
        })
        .filter((v) => v !== undefined);
      if (!content) return undefined;
      return {
        title: v.title || "本快讯无标题",
        content: content.join("\n"),
      };
    })
    .filter((res) => res !== undefined);
}

async function fetchHot() {
  const hot = await fetch(config.news.hot, {
    signal: AbortSignal.timeout(5000),
  })
    .then((res) => res.json())
    .catch((_) => undefined);
  const hotSchema = z.object({
    data: z.object({
      cards: z
        .array(
          z.object({
            content: z
              .array(
                z.object({
                  desc: z.string(),
                  query: z.string(),
                })
              )
              .min(1),
          })
        )
        .min(1),
    }),
  });
  const hotData = hotSchema.safeParse(hot);
  if (!hotData.success) return undefined;
  return hotData.data.data.cards[0]?.content
    .map((res) => {
      if (!res.desc || !res.query) return undefined;
      return {
        title: res.query,
        content: res.desc,
      };
    })
    .filter((res) => res !== undefined);
}

async function taskSendNews(
  groupId: number,
  news:
    | Array<{
        title: string;
        content: string;
      }>
    | undefined,
  newsType: string
) {
  if (!news) return;
  const newNews = await duplicate(groupId, news);
  if (!newNews || !newNews.length) return;
  await getClient().sendGroupMsg(groupId, [
    `为您推送${newsType}:\n\n` +
      newNews
        .map((v, i) => `${i + 1}、${v.title}\n=>${v.content}`)
        .join("\n\n"),
  ]);
}

function task() {
  schedule.scheduleJob(`0 0 0 */1 * *`, () => {
    newsMap.forEach((news, gid) => {
      if (news.length >= 300) {
        newsMap.set(gid, news.slice(news.length / 2));
      }
    });
  });
  schedule.scheduleJob(`0 */2 * * * *`, async () => {
    const groups = getClient().getGroupList();
    const hotNews = await fetchHot();
    const financeNews = await fetchFinance();
    for (const [_, group] of groups) {
      const lock = await findOrAdd(group.group_id, "新闻推送", false);
      if (!lock.active) continue;
      await taskSendNews(group.group_id, financeNews, "财经新闻");
      await taskSendNews(group.group_id, hotNews, "热点新闻");
    }
  });
}

async function init() {
  task();
}

export { info, init };
