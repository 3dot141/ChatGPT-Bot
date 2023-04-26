import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

declare global {
  type QyAPI = {
    corpId: string;

    agentId?: string;

    corpSecret?: string;
  };
}

const qyAPI: QyAPI = {
  corpId: process.env.CORP_ID ?? "",

  corpSecret: process.env.CORP_SECRET ?? "",
};

type QyResult = {
  errcode: number;
  errmsg: string;
};

type AccessTokenResult = QyResult & {
  access_token: string;
  expires_in: number;
};

type UserIdResult = QyResult & {
  userid: string;
};

type UserProfileResult = QyResult & {
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
    const code = req.nextUrl.searchParams.get("code") as string;
    const accessToken = await getAccessToken(
      qyAPI.corpId,
      qyAPI.corpSecret ?? "",
    );
    const userName = await getUserName(accessToken, code);

    const { origin } = req.nextUrl;

    const response = NextResponse.rewrite(`${origin}`);
    response.cookies.set("username", userName);
    return response;
  } catch (e) {
    console.error(e);
    return NextResponse.json(`error is ${e}`);
  }
}