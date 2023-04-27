import { NextRequest, NextResponse } from "next/server";
import { WeCom_API, WeComResult } from "@/app/api/wecom/common";

export const dynamic = "force-dynamic";

type AccessTokenResult = WeComResult & {
  access_token: string;
  expires_in: number;
};

type UserIdResult = WeComResult & {
  userid: string;
};

type UserProfileResult = WeComResult & {
  name: string;
};

async function getAccessToken(
  corpId: string,
  corpSecret: string,
): Promise<string> {
  const url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${corpId}&corpsecret=${corpSecret}&debug=1`;
  const headers = new Headers();

  const result = await fetch(url, { headers });
  const json = (await result.json()) as AccessTokenResult;
  return json.access_token;
}

async function getUserName(accessToken: string, code: string): Promise<string> {
  const userIdUrl = `https://qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo?access_token=${accessToken}&code=${code}&debug=1`;
  const headers = new Headers();

  const userIdResponse = await fetch(userIdUrl, {
    headers,
  });

  const userIdResult = (await userIdResponse.json()) as UserIdResult;
  if (userIdResult.errcode !== 0) {
    throw new Error(userIdResult.errmsg);
  }
  const userId = userIdResult.userid;

  const userProfileUrl = `https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=${accessToken}&userid=${userId}&debug=1`;
  const userProfileResponse = await fetch(userProfileUrl);
  const userProfileResult =
    (await userProfileResponse.json()) as UserProfileResult;
  if (userProfileResult.errcode !== 0) {
    throw new Error(userProfileResult.errmsg);
  }

  return userProfileResult.name;
}

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const code = params.get("code") as string;
    const state = params.get("state") as string;
    const accessToken = await getAccessToken(
      WeCom_API.corpId,
      WeCom_API.corpSecret ?? "",
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
