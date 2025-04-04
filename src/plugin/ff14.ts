import type { GroupMessageEvent } from "@icqqjs/icqq";
import config from "@tomato/bot/config.toml";
import { z } from "zod";
import { cmd, msgRmCmd, replyGroupMsg } from "../util/bot";

const info = {
  name: "ff14",
  comment: [
    `使用 "ff14 板子 [猫|猪|狗|鸟] [商品名]" 命令进行最终幻想14交易板商品查询`,
  ],
  plugin,
};

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

async function plugin(event: GroupMessageEvent) {
  const msg = msgRmCmd(event.raw_message, [config.bot.name, info.name]);
  const cmdList = [
    {
      command: "板子",
      comment: `使用 "ff14 板子 [猫|猪|狗|鸟] [商品名]" 命令进行最终幻想14交易板商品查询`,
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
      "命令错误。请使用“ff14 板子”获取命令的正确使用方式。",
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
  if (!serverName)
    return `未查询到“${region}”服务器信息，请检查服务器名是否正确。`;
  const borad = await fetchBoard(serverName, goods);
  if (!borad)
    return `未在 ${serverName} 区查询到“${goods}”商品，请检查商品名是否正确。`;
  if (!borad.fetchItem.listings.length)
    return `您查询的“${goods}”商品目前全区缺货。`;
  const result = [];
  const formatItemInfo = (
    quality: string,
    listing: Partial<Listing>,
    currentAveragePrice: number
  ) =>
    `-${quality}：\n  服务器：${listing.worldName}\n  卖家：${listing.retainerName}\n  均价：${currentAveragePrice}\n  现价：${listing.pricePerUnit}\n  数量：${listing.quantity}\n  总价：${listing.total}\n  税费：${listing.tax}`;

  if (borad.fetchItem.minPriceHQ) {
    result.push(
      formatItemInfo(
        "高品质",
        borad.stock.hq,
        borad.fetchItem.currentAveragePriceHQ
      )
    );
  }
  if (borad.fetchItem.minPriceNQ) {
    result.push(
      formatItemInfo(
        "普通品质",
        borad.stock.nq,
        borad.fetchItem.currentAveragePriceNQ
      )
    );
  }
  return `您查询的“${goods}”商品信息：\n${result.join("\n")}`;
}

async function fetchBoard(region: string, goods: string) {
  const itemMeta = await fetchItemMeta(goods);
  if (!itemMeta) return undefined;
  const fetchItem = await fetchItemDetails(region, itemMeta.ID);
  if (!fetchItem) return undefined;
  const parseStock = (data: StockData) => {
    const findListing = (hq: boolean, price: number): Partial<Listing> =>
      data.listings.find((v) => v.hq === hq && v.pricePerUnit === price) || {};
    return {
      hq: {
        ...findListing(true, data.minPriceHQ),
      },
      nq: {
        ...findListing(false, data.minPriceNQ),
      },
    };
  };
  const stock = parseStock(fetchItem);
  return {
    fetchItem,
    stock,
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
