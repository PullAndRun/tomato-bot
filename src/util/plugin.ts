import type { GroupMessageEvent } from "@icqqjs/icqq";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { logger } from "./log";

const plugins: Array<{
  name: string;
  comment: string;
  plugin: (event: GroupMessageEvent) => Promise<void>;
}> = [];

async function load() {
  const fileNames = await readdir("src/plugin");
  for (const fileName of fileNames) {
    const plugin = (await import(path.resolve(`src/plugin/${fileName}`))).info;
    if (!plugin) {
      logger.error(
        `->错误:src/plugin文件夹内发现非插件文件,->文件名:${fileName}`
      );
      continue;
    }
    plugins.push(plugin);
  }
  plugins.sort((a, b) => b.name.length - a.name.length);
}

function pick(name: string) {
  return plugins.filter((p) => name.startsWith(p.name))[0];
}

async function init() {
  await load();
}

export { init, pick };
