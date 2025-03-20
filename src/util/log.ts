import { createLogger, transports, format } from "winston";
import config from "@deep/config/global.toml";
import dayjs from "dayjs";

const { combine, timestamp } = format;

const logger = createLogger({
  level: "info",
  format: combine(timestamp(), format.json()),
  transports: [
    new transports.Console(),
    new transports.File({
      dirname: config.log.dir_name + "/" + dayjs().format(`YYYY-MM-DD`),
      filename: "error.log",
      level: "error",
    }),
    new transports.File({
      dirname: config.log.dir_name + "/" + dayjs().format(`YYYY-MM-DD`),
      filename: "warn.log",
      level: "warn",
    }),
  ],
});

export { logger };
