import { NextRequest, NextResponse } from "next/server";
import { getServerSideConfig } from "./app/config/server";
import md5 from "spark-md5";

export const config = {
  matcher: ["/api/openai", "/api/chat-stream"],
};

const serverSideConfigPromise = getServerSideConfig();

export async function middleware(req: NextRequest) {

  const serverConfig = await serverSideConfigPromise;

  const accessCode = req.headers.get("access-code") ?? '';
  const token = req.headers.get("token");

  console.log("[Auth] allowed codes: ", [...serverConfig.codes]);
  console.log("[Auth] got access code:", accessCode);

  if (serverConfig.needCode && !serverConfig.codes.has(accessCode) && !token) {
    return NextResponse.json(
      {
        error: true,
        needAccessCode: true,
        msg: "Please go settings page and fill your access code.",
      },
      {
        status: 401,
      },
    );
  }

  const username = req.headers.get("username");
  if (serverConfig.needQyWxLogin && !username) {
    return NextResponse.json(
      {
        error: true,
        needQyWxLogin: true,
        msg: "Please go settings page and authorize your work wechat account.",
      },
      {
        status: 402,
      },
    );
  }

  // inject api key
  if (!token) {
    const apiKey = serverConfig.apiKey;
    if (apiKey) {
      console.log("[Auth] set system token");
      req.headers.set("token", apiKey);
    } else {
      return NextResponse.json(
        {
          error: true,
          msg: "Empty Api Key",
        },
        {
          status: 401,
        },
      );
    }
  } else {
    console.log("[Auth] set user token");
  }

  return NextResponse.next({
    request: {
      headers: req.headers,
    },
  });
}
