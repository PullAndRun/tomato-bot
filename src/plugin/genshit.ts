import { segment, type GroupMessageEvent } from "@icqqjs/icqq";
import { file } from "bun";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { replyGroupMsg } from "../util/bot";

const info = {
  name: "看原批",
  comment: [`使用 "看原批" 命令看原批`],
  plugin,
};

async function plugin(event: GroupMessageEvent) {
  const joke = await pickJoke();
  if (!pickJoke) {
    await replyGroupMsg(event, ["暂时没有原批，请稍候重试。"]);
    return;
  }
  await replyGroupMsg(event, [segment.image(`base64://${joke}`)]);
}

async function pickJoke() {
  const jokeDir = path.resolve("resource/miHoYoJokes");
  const files = await readdir(jokeDir, {
    withFileTypes: true,
    recursive: true,
  });
  const jpgFiles = files.filter(
    (file) => file.isFile() && file.name.endsWith(".jpg")
  );
  if (!jpgFiles.length) return undefined;
  const randomFile = jpgFiles[Math.floor(Math.random() * jpgFiles.length)];
  const filePath = path.resolve(randomFile.parentPath + "/" + randomFile.name);
  const readFile = file(filePath);
  return Buffer.from(await readFile.arrayBuffer()).toString("base64");
}

export { info };
