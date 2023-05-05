import md5 from "spark-md5";

import { supabaseClient } from "@/app/lib/embeddings-supabase";
import { accessCodeClient } from "@/app/config/access-code";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      OPENAI_API_KEY?: string;
      CODE?: string;
      PROXY_URL?: string;
      VERCEL?: string;
    }
  }
}

export const getServerSideConfig = async () => {
  if (typeof process === "undefined") {
    throw Error(
      "[Server Config] you are importing a nodejs-only module outside of nodejs",
    );
  }

  const accessCodes = await accessCodeClient.getAccessCodes();

  return {
    apiKey: process.env.OPENAI_API_KEY,
    code: process.env.CODE,
    codes: accessCodes,
    needCode: accessCodes.size > 0,
    proxyUrl: process.env.PROXY_URL,
    isVercel: !!process.env.VERCEL,

    needQyWxLogin: !!process.env.CORP_ID,
    corpId: process.env.CORP_ID,
    agentId: process.env.AGENT_ID,
  };
};
