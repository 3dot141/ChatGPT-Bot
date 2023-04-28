import { NextRequest, NextResponse } from "next/server";
import { WeCom_API } from "@/app/api/wecom/common";

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const code = params.get("code") as string;
    const state = params.get("state") as string;

    const signature = params.get("signature") as string;
    const echostr = params.get("echostr") as string;
    const timestamp = params.get("timestamp") as string;
    const nonce = params.get("nonce") as string;

    return new NextResponse(echostr);
  } catch (e) {
    console.error(e);
    return NextResponse.json(`error is ${e}`);
  }
}
