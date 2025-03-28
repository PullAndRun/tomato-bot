import type { GroupMessageEvent } from "@icqqjs/icqq";
import config from "@tomato/bot/config.toml";
import { z } from "zod";
import { cmd, msgRmCmd, replyGroupMsg } from "../util/bot";

type Listing = {
  hq: boolean;
  pricePerUnit: number;
  worldName: string;
  total: number;
  quantity: number;
  retainerName: string;
  tax: number;
};

type StockData = {
  currentAveragePriceNQ: number;
  currentAveragePriceHQ: number;
  minPriceNQ: number;
  minPriceHQ: number;
  listings: Listing[];
};

type ParsedStock = {
  hq: Partial<Listing> & { average: number };
  nq: Partial<Listing> & { average: number };
};

const info = {
  name: "ff14",
  comment: "ff14 板子 猫|猪|狗|鸟 商品名",
  plugin,
};

async function plugin(event: GroupMessageEvent) {
  const msg = msgRmCmd(event.raw_message, [config.bot.name, info.name]);
  const cmdList = [
    {
      command: "板子",
      comment: `使用“ff14 板子 猫|猪|狗|鸟 商品名“命令查询所有服务器的市场布告板商品最低价格`,
      role: "member",
      plugin: board,
    },
  ];
  await cmd(msg, cmdList, event);
}

async function board(event: GroupMessageEvent, message: string) {
  const [region, goods] = message.split(" ");
  if (!region || !goods) {
    await replyGroupMsg(event, [
      "命令错误。请使用“ff14”获取命令的正确使用方式。",
    ]);
    return;
  }
  const result = await searchBoard(region, goods);
  await replyGroupMsg(event, [result]);
}

async function searchBoard(region: string, goods: string) {
  const serverMap: Record<string, string> = {
    猫: "猫小胖",
    猪: "莫古力",
    狗: "豆豆柴",
    鸟: "陆行鸟",
  };
  const serverName = serverMap[region];
  if (!serverName) {
    return `未查询到“${region}”服务器信息，请检查服务器名是否正确。`;
  }
  const info = await fetchBoard(serverName, goods);
  if (!info) {
    return `未查询到“${goods}”商品信息，请检查商品名是否正确。`;
  }
  if (info.hq.average === 0 && info.nq.average === 0) {
    return `您查询的“${goods}”商品目前全区缺货。`;
  }
  const result = [];
  const formatItemInfo = (
    quality: string,
    data: Partial<Listing> & { average: number }
  ) =>
    `-${quality}：\n  服务器：${data.worldName}\n  卖家：${data.retainerName}\n  均价：${data.average}\n  现价：${data.pricePerUnit}\n  数量：${data.quantity}\n  总价：${data.total}\n  税费：${data.tax}`;

  if (info.hq.average !== 0) {
    result.push(formatItemInfo("高品质", info.hq));
  }
  if (info.nq.average !== 0) {
    result.push(formatItemInfo("普通品质", info.nq));
  }
  return `您查询的“${info.item}”商品信息：\n${result.join("\n")}`;
}

async function fetchBoard(region: string, goods: string) {
  const itemMeta = await fetchItemMeta(goods);
  if (!itemMeta) {
    return undefined;
  }
  const fetchItem = await fetchItemDetails(region, itemMeta.ID);
  if (!fetchItem) {
    return undefined;
  }
  const parseStock = (data: StockData): ParsedStock => {
    const findListing = (hq: boolean, price: number): Partial<Listing> =>
      data.listings.find((v) => v.hq === hq && v.pricePerUnit === price) || {};
    return {
      hq: {
        average: data.currentAveragePriceHQ,
        ...findListing(true, data.minPriceHQ),
      },
      nq: {
        average: data.currentAveragePriceNQ,
        ...findListing(false, data.minPriceNQ),
      },
    };
  };
  const stock = parseStock(fetchItem);
  return {
    item: itemMeta.Name,
    hq: stock.hq,
    nq: stock.nq,
  };
}

async function fetchItemMeta(goods: string) {
  const url = `${config.ff14.meta}?${new URLSearchParams({
    indexes: "item",
    sort_order: "asc",
    limit: "1",
    columns: "ID,Name",
    string: goods,
  })}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
    .then((resp) => resp?.json())
    .catch(() => undefined);
  const schema = z.object({
    Results: z
      .array(
        z.object({
          ID: z.number(),
          Name: z.string(),
        })
      )
      .min(1),
  });
  const result = schema.safeParse(response);
  return result.success ? result.data.Results[0] : undefined;
}

async function fetchItemDetails(region: string, itemId: number) {
  const url = `${config.ff14.item}/${encodeURI(region)}/${itemId}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
    .then((resp) => resp.json())
    .catch(() => undefined);
  const schema = z.object({
    currentAveragePriceNQ: z.number(),
    currentAveragePriceHQ: z.number(),
    minPriceNQ: z.number(),
    minPriceHQ: z.number(),
    listings: z
      .array(
        z.object({
          hq: z.boolean(),
          pricePerUnit: z.number(),
          worldName: z.string(),
          total: z.number(),
          quantity: z.number(),
          retainerName: z.string(),
          tax: z.number(),
        })
      )
      .min(1),
  });
  const result = schema.safeParse(response);
  return result.success ? result.data : undefined;
}

export { info };
