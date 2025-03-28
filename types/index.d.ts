import { GoogleGenerativeAI } from "@google/generative-ai";

declare module "@google/generative-ai" {
  export interface GoogleSearchRetrievalTool {
    googleSearch: GoogleSearchRetrieval;
  }
}
