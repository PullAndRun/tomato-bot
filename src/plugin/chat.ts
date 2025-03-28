import { GoogleGenerativeAI } from "@google/generative-ai";
import config from "@tomato/bot/config.toml";

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
