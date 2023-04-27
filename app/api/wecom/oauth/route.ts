import { NextRequest, NextResponse } from "next/server";
import { SERVICE, WeCom_API } from "@/app/api/wecom/common";

export const dynamic = "force-dynamic";

type QyResult = {
  errcode: number;
  errmsg: string;
};

type AccessThirdTokenResult = QyResult & {
  suite_access_token: string;
};

type UserIdResult = QyResult & {
  userid: string;
  user_ticket: string;
};

async function getThirdAccessToken(
  suite_id: string,
  suite_secret: string,
  suite_ticket: string,
): Promise<string> {
  const url = `https://qyapi.weixin.qq.com/cgi-bin/service/get_suite_token`;
  const body = {
    suite_id,
    suite_secret,
    suite_ticket,
  };

  const result = await fetch(url, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const json = (await result.json()) as AccessThirdTokenResult;
  if (json.errcode) {
    throw new Error(json.errmsg);
  }
  return json.suite_access_token;
}

async function getUserName(accessToken: string, code: string): Promise<string> {
  const userIdUrl = `https://qyapi.weixin.qq.com/cgi-bin/service/auth/getuserinfo3rd?suite_access_token=${accessToken}&code=${code}`;
  const headers = new Headers();

  const userIdResponse = await fetch(userIdUrl, {
    headers,
  });

  const userIdResult = (await userIdResponse.json()) as UserIdResult;
  if (userIdResult.errcode !== 0) {
    throw new Error(userIdResult.errmsg);
  }
  return userIdResult.userid;
}

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const code = params.get("code") as string;
    const state = params.get("state") as string;
    const accessToken = await getThirdAccessToken(
      SERVICE.suite_id,
      SERVICE.suite_secret,
      SERVICE.suite_ticket,
    );
    const userName = await getUserName(accessToken, code);

    console.error(`next url is ${req.nextUrl}`);

    const response = NextResponse.redirect(`${state}`);
    response.cookies.set("username", userName);
    return response;
  } catch (e) {
    console.error(e);
    return NextResponse.json(`error is ${e}`);
  }
}
