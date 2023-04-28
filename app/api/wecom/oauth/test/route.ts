import { NextRequest } from "next/server";
import { SERVICE } from "@/app/api/wecom/common";

export async function GET(req: NextRequest) {
  await SERVICE.initPermanentCode();
}
