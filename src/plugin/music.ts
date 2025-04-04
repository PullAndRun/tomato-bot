import { segment, type GroupMessageEvent } from "@icqqjs/icqq";
import config from "@tomato/bot/config.toml";
import { cloudsearch, comment_new, song_detail } from "NeteaseCloudMusicApi";
import { z } from "zod";
import { msgRmCmd, replyGroupMsg } from "../util/bot";
import { fetchImageToBase64 } from "../util/util";

const info = {
  name: "听",
  comment: [`使用 "听 [音乐名] [歌手名]" 命令点歌`],
  plugin,
};

async function plugin(event: GroupMessageEvent) {
  const msg = msgRmCmd(event.raw_message, [config.bot.name, info.name]);
  if (!msg) {
    await replyGroupMsg(event, [
      `命令错误。请使用 "听 [音乐名] [歌手名]" 命令点歌。`,
    ]);
    return;
  }
  const music = await pick(msg);
  if (!music) {
    await replyGroupMsg(event, [`没有找到相关歌曲。`]);
    return;
  }
  await replyGroupMsg(event, [
    (music.albumPicture && segment.image(music.albumPicture) + "\n") || "",
    `传送门: ${music.url}`,
    `\n歌曲名: ${music.name}`,
    `\n歌手: ${music.singer}`,
    `\n专辑: ${music.album}`,
    (music.comment && `\n热评: ${music.comment}`) || "",
  ]);
}

async function pick(keyword: string) {
  const id = await fetchID(keyword);
  if (!id) return undefined;
  const song = await fetchSong(id);
  if (!song) return undefined;
  const comment = await fetchHotComment(id);
  const albumPicture = await fetchImageToBase64(song.al.picUrl);
  return {
    albumPicture: `base64://${albumPicture || ""}`,
    comment,
    url: `${config.music.url}${id}`,
    name: song.name,
    singer: song.ar.map((singer) => singer.name).join("、"),
    album: song.al.name,
  };
}

async function fetchID(keyword: string) {
  const searchSchema = z.object({
    status: z.number(),
    body: z.object({
      code: z.number(),
      result: z.object({
        songs: z
          .array(
            z.object({
              id: z.number(),
            })
          )
          .min(1),
      }),
    }),
  });
  const id = await cloudsearch({
    keywords: keyword,
    limit: 1,
  })
    .then((res) => {
      const result = searchSchema.safeParse(res);
      if (!result.success) return undefined;
      return result.data.body.result.songs[0].id;
    })
    .catch((_) => undefined);
  return id;
}

async function fetchSong(id: number) {
  const songSchema = z.object({
    status: z.number(),
    body: z.object({
      code: z.number(),
      songs: z
        .array(
          z.object({
            name: z.string(),
            al: z.object({ picUrl: z.string(), name: z.string() }),
            ar: z.array(z.object({ name: z.string() })).min(1),
          })
        )
        .min(1),
    }),
  });
  const song = await song_detail({
    ids: id.toString(),
  })
    .then((res) => {
      const result = songSchema.safeParse(res);
      if (!result.success) return undefined;
      return result.data.body.songs[0];
    })
    .catch((_) => undefined);
  return song;
}

async function fetchHotComment(id: number) {
  const commentSchema = z.object({
    status: z.number(),
    body: z.object({
      code: z.number(),
      data: z.object({
        comments: z
          .array(
            z.object({
              content: z.string(),
            })
          )
          .min(1),
      }),
    }),
  });
  const comment = await comment_new({
    id: id,
    type: 0,
    pageNo: 1,
    pageSize: 1,
    sortType: 2,
  })
    .then((res) => {
      const result = commentSchema.safeParse(res);
      if (!result.success) return undefined;
      return result.data.body.data.comments[0].content;
    })
    .catch((_) => undefined);
  return comment;
}

export { info };
