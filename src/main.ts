import * as db from "@tomato/bot/util/db.ts";
import * as bot from "@tomato/bot/util/bot.ts";
import * as plugin from "@tomato/bot/util/plugin.ts";

process.on("uncaughtException", () => undefined);

async function init() {
  await db.init();
  await bot.init();
  await plugin.init();
}

init();
