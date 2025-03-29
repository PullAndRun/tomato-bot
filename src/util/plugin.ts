import type { GroupMessageEvent } from "@icqqjs/icqq";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { logger } from "./log";

interface Plugin {
  name: string;
  comment: string;
  plugin: (event: GroupMessageEvent) => Promise<void>;
}

const plugins: Plugin[] = [];

async function load() {
  const pluginDir = path.resolve("src/plugin");
  const files = await readdir(pluginDir);
  for (const file of files) {
    try {
      const pluginPath = path.join(pluginDir, file);
      const { info: plugin } = await import(pluginPath);
      if (!plugin || !plugin.name || !plugin.plugin) continue;
      plugins.push(plugin);
    } catch (err) {
      logger.error(
        `->加载插件失败:\n->插件名: ${file}\n->错误:\n->${JSON.stringify(err)}`
      );
    }
  }
  plugins.sort((a, b) => b.name.length - a.name.length);
  logger.info(`->成功加载 ${plugins.length} 个插件`);
}

function pick(name: string) {
  return plugins.find((p) => name.startsWith(p.name));
}

async function init() {
  await load();
}

export { init, pick };
