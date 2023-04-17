import { NextRequest } from "next/server";

const OPENAI_URL = "api.openai.com";
const DEFAULT_PROTOCOL = "https";
const PROTOCOL = process.env.PROTOCOL ?? DEFAULT_PROTOCOL;
const BASE_URL = process.env.BASE_URL ?? OPENAI_URL;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

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
export async function requestEmbedding(apiKey: string, content: string) {
  const headers = new Headers();
  headers.set("token", apiKey);
  headers.set("path", "v1/embeddings");
  return doRequestOpenai({
    headers: headers,
    method: "POST",
    body: JSON.stringify({
      input: content,
      model: "text-embedding-ada-002",
    }),
  });
}