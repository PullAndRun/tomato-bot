import * as db from "@tomato/bot/src/util/db.ts";
import * as bot from "@tomato/bot/src/util/bot.ts";
import * as plugin from "@tomato/bot/src/util/plugin.ts";

process.on("uncaughtException", () => undefined);

async function init() {
  await db.init();
  await bot.init();
  await plugin.init();
}

init();
