import { NextRequest } from "next/server";
import { ChatCompletionResponseMessage } from "openai";

const OPENAI_URL = "api.openai.com";
const DEFAULT_PROTOCOL = "https";
const PROTOCOL = process.env.PROTOCOL ?? DEFAULT_PROTOCOL;
const BASE_URL = process.env.BASE_URL ?? OPENAI_URL;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

declare global {
  type MessageSource = {
    content?: string;
    title?: string;
    link?: string;
    type: number;
  };

  type MessageContext = {
    sources: MessageSource[];
  };

  type Message = ChatCompletionResponseMessage & {
    date: string;
    context?: MessageContext;
    streaming?: boolean;
    isError?: boolean;
    id?: number;
  };
}

export enum MessageSourceType {
  TEXT = 0,
  LINK = 1,
}

export enum MessageSign {
  CONTENT_SIGN = "#c1:",
  CONTEXT_SIGN = "#c2:",
}

export type CustomRequest = {
  headers: Headers;
  method: string;
  body: BodyInit | null;
};

export async function requestOpenai(req: NextRequest) {
  const apiKey = req.headers.get("token");
  const openaiPath = req.headers.get("path");

  console.log("[Proxy] ", openaiPath);

  return fetch(`${PROTOCOL}://${BASE_URL}/${openaiPath}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    method: req.method,
    body: req.body,
  });
}

export async function doRequestOpenai(req: CustomRequest) {
  const apiKey = req.headers.get("token");
  const openaiPath = req.headers.get("path");

  console.log("[Proxy] ", openaiPath);

  return fetch(`${PROTOCOL}://${BASE_URL}/${openaiPath}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    method: req.method,
    body: req.body,
  });
}

/**
 * 可以通过 NextRequest 进行简单的创建，转发工作
 *
 * @param apiKey api-key
 * @param content 内容
 */
export async function requestEmbedding(apiKey: string, content: string) {
  const headers = new Headers();
  headers.set("token", apiKey);
  headers.set("path", "v1/embeddings");
  const req = new NextRequest("https://demo.com/embedding", {
    headers: headers,
    method: "POST",
    body: JSON.stringify({
      input: content,
      model: "text-embedding-ada-002",
    }),
  });

  return requestOpenai(req);
}
