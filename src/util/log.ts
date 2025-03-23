import { text } from "@clack/prompts";
import config from "@tomato/bot/config.toml";
import dayjs from "dayjs";
import { createLogger, format, transports } from "winston";

const { combine, timestamp } = format;

const logDir = `${config.log.dir_name}/${dayjs().format("YYYY-MM-DD")}`;

const logger = createLogger({
  level: config.log.level,
  format: combine(timestamp(), format.json()),
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
  const input = await text({ message, placeholder });
  if (!input) {
    logger.warn("->警告:未输入任何内容,请重新输入");
    return await promptUserInput(message, placeholder);
  }
  return input.toString();
}

export { logger, promptUserInput };
