import { NextRequest, NextResponse } from "next/server";

import * as crypto from "@wecom/crypto";
import { XMLParser } from "fast-xml-parser";
import { SERVICE } from "@/app/api/wecom/common";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

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
  try {
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

    const xmlString = await req.text();
    const parser = new XMLParser();
    const result = parser.parse(xmlString);
    const encryptJson = result?.xml?.Encrypt;
    if (encryptJson) {
      // 将加密消息体进行解密，解密后仍旧是 xml 字符串
      // 把解密后 xml 消息体字符串，解析成 json
      const callbackDataBody = crypto.decrypt(SERVICE.aeskey, encryptJson);
      const message = callbackDataBody?.message;
      if (message) {
        const messageJson = parser.parse(message);
        const infoType = messageJson?.xml?.InfoType;
        if (infoType) {
          if (infoType === "suite_ticket") {
            const ticketData = messageJson?.xml?.SuiteTicket;
            if (ticketData) {
              SERVICE.suite_ticket = ticketData;
            }
          }
          if (infoType === "create_auth") {
            const authCode = messageJson?.xml?.AuthCode;
            if (authCode) {
              SERVICE.authCode = authCode;
            }
          }
        }
      }
    }
  } catch (e) {}
  return new NextResponse("success");
}
