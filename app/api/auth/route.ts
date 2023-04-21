import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

enum QyAPI {
  corpId = "ww3d23af6a5aa9884d",

  corpSecret = "hzDn2sSnBv82_bmTiK4l4EMrHMnWtx-GhCOMLk-FerY",
}

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
  const url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${corpId}&corpsecret=${corpSecret}`;
  const result = await fetch(url);
  const json = (await result.json()) as AccessTokenResult;
  return json.access_token;
}

async function getUserName(accessToken: string, code: string): Promise<string> {
  const userIdUrl = `https://qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo?access_token=${accessToken}&code=${code}`;
  const userIdResponse = await fetch(userIdUrl);
  const userIdResult = (await userIdResponse.json()) as UserIdResult;
  if (userIdResult.errcode !== 0) {
    throw new Error(userIdResult.errmsg);
  }
  const userId = userIdResult.userid;

  const userProfileUrl = `https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=${accessToken}&userid=${userId}`;
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
    const accessToken = await getAccessToken(QyAPI.corpId, QyAPI.corpSecret);
    const userName = await getUserName(accessToken, code);

    return NextResponse.json(`userName is ${userName}`);
  } catch (e) {
    return NextResponse.json(`error is ${e}`);
  }
}
