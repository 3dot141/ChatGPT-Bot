import { NextRequest, NextResponse } from "next/server";
import { AccessCodeClient } from "@/app/config/access-code";

export const accessCodeClient = new AccessCodeClient();

export async function GET(req: NextRequest) {
  try {
    await accessCodeClient.updateCodes();
    return NextResponse.json("ok");
  } catch (e) {
    console.error(e);
    return NextResponse.json(`error is ${e}`);
  }
}
