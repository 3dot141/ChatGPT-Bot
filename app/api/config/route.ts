import { NextRequest, NextResponse } from "next/server";

import { getServerSideConfig } from "../../config/server";
import { WeCom_API } from "@/app/api/wecom/common";

const serverSideConfigPromise = getServerSideConfig();

declare global {
  type DangerConfig = {
    needCode: boolean;
    needQyWxLogin: boolean;
  };
}

export async function POST(req: NextRequest) {
  const serverConfig = await serverSideConfigPromise;

  const wecomApi = {
    corpId: serverConfig.corpId,
    agentId: serverConfig.agentId,
  } as WeComAPI;

  const dangerConfig = {
    needCode: serverConfig.needCode,
    needQyWxLogin: serverConfig.needQyWxLogin,
  } as DangerConfig;

  return NextResponse.json({
    ...dangerConfig,
    ...wecomApi,
  });
}
