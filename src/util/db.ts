import config from "@deep/config/global.toml";
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
    throw new Error(`\n数据库连接失败\n原因：${JSON.stringify(e)}`);
  });
  if (db.isInitialized) {
    logger.info("数据库连接成功");
  }
}

export { db, init };
