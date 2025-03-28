import { text } from "@clack/prompts";
import config from "@tomato/bot/config.toml";
import dayjs from "dayjs";
import path from "path";
import { createLogger, format, transports } from "winston";

const { combine, timestamp, printf } = format;

const logDir = path.join(config.log.dir_name, dayjs().format("YYYY-MM-DD"));

const logFormat = printf(({ level, message, timestamp }) => {
  return `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
});

const logger = createLogger({
  level: config.log.level,
  format: combine(timestamp(), logFormat),
  transports: [
    new transports.Console(),
    new transports.File({
      dirname: logDir,
      filename: "error.log",
      level: "error",
    }),
    new transports.File({
      dirname: logDir,
      filename: "warn.log",
      level: "warn",
    }),
  ],
});

async function promptUserInput(
  message: string,
  placeholder: string
): Promise<string> {
  while (true) {
    const input = await text({ message, placeholder });
    if (input) {
      return input.toString();
    }
    logger.warn("->警告:未输入任何内容,请重新输入");
  }
}

export { logger, promptUserInput };
