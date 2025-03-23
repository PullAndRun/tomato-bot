import config from "@tomato/bot/config.toml";
import { DataSource } from "typeorm";
import { logger } from "./log";

const db = new DataSource({
  type: config.database.type,
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  synchronize: config.database.synchronize,
  logging: config.database.logging,
  entities: config.database.entities,
});

async function init() {
  await db.initialize().catch((e) => {
    logger.error(`->错误:数据库连接失败,->原因:${JSON.stringify(e)}`);
    throw new Error(`->错误:数据库连接失败,->原因:${JSON.stringify(e)}`);
  });
  if (db.isInitialized) {
    logger.info("->数据库连接成功");
  }
}

export { db, init };
