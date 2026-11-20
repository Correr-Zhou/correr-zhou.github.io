// Web worker that hosts the on-device LLM (WebLLM), so inference never blocks the page UI.
// Loaded only after a visitor opens the chat.
import { WebWorkerMLCEngineHandler } from "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.87/+esm";

const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (msg) => handler.onmessage(msg);
