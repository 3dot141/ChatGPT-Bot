import { NextRequest, NextResponse } from "next/server";

import * as crypto from "@wecom/crypto";
import { SERVICE } from "@/app/api/wecom/common";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  // 在应用详情页找到对应的token
  const msg_signature = params.get("msg_signature") ?? "";
  const timestamp = params.get("timestamp") ?? "";
  const nonce = params.get("nonce") ?? "";
  const echostr = params.get("echostr") ?? "";

  // 重新计算签名
  const signature = crypto.getSignature(
    SERVICE.token,
    timestamp,
    nonce,
    echostr,
  );
  console.log("signature", signature);

  const { message } = crypto.decrypt(SERVICE.aeskey, echostr);
  console.log("message", message);
  // 返回 message 信息
  return new NextResponse(message);
}

export async function POST(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  // 在应用详情页找到对应的token
  const msg_signature = params.get("msg_signature") ?? "";
  const timestamp = params.get("timestamp") ?? "";
  const nonce = params.get("nonce") ?? "";
  const echostr = params.get("echostr") ?? "";
  // 重新计算签名
  const signature = crypto.getSignature(
    SERVICE.token,
    timestamp,
    nonce,
    echostr,
  );

  return new NextResponse("success");
}
