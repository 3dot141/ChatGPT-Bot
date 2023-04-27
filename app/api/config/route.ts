import { NextRequest, NextResponse } from "next/server";

import { getServerSideConfig } from "../../config/server";
import { WeCom_API } from "@/app/api/wecom/common";

const serverConfig = getServerSideConfig();

// Danger! Don not write any secret value here!
// 警告！不要在这里写入任何敏感信息！
const DANGER_CONFIG = {
  needCode: serverConfig.needCode,
  needQyWxLogin: serverConfig.needQyWxLogin,
};

declare global {
  type DangerConfig = typeof DANGER_CONFIG;
}

export async function POST(req: NextRequest) {
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
