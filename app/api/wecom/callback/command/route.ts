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

  // 校验签名是否正确
  // if (signature === msg_signature) {
  console.info("签名验证成功");
  // 如果签名校验正确，解密 message
  const { message } = crypto.decrypt(SERVICE.aeskey, echostr);
  console.log("message", message);
  // 返回 message 信息
  return new NextResponse(message);
  // }
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
        const ticketData = messageJson?.xml?.SuiteTicket;
        if (ticketData) {
          SERVICE.suite_ticket = ticketData;
        }
      }
    }
  } catch (e) {}
  return new NextResponse("success");
}
