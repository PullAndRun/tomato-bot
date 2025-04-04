import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GroupMessageEvent } from "@icqqjs/icqq";
import config from "@tomato/bot/config.toml";

const info = {
  name: "聊天=>无法调用",
  comment: [`内置AI聊天功能`],
  plugin,
};

async function plugin(event: GroupMessageEvent) {}

const genAI = new GoogleGenerativeAI(config.gemini.key);
const model = genAI.getGenerativeModel(
  {
    model: config.gemini.model,
    tools: [
      {
        googleSearch: {},
      },
    ],
  },
  {
    baseUrl: config.gemini.url,
  }
);

const prompt = "";
const result = await model.generateContent(prompt);

export { info };
