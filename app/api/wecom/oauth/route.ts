import { NextRequest, NextResponse } from "next/server";
import { SERVICE, WeCom_API, WeComResult } from "@/app/api/wecom/common";

export const dynamic = "force-dynamic";

type UserIdResult = WeComResult & {
  userid: string;
  user_ticket: string;
};

async function getUserName(
  suiteAccessToken: string,
  code: string,
): Promise<string> {
  const userIdUrl = `https://qyapi.weixin.qq.com/cgi-bin/service/auth/getuserinfo3rd?suite_access_token=${suiteAccessToken}&code=${code}`;
  const headers = new Headers();

  const userIdResponse = await fetch(userIdUrl, {
    headers,
  });

  const userIdJSON = await userIdResponse.json();
  const userIdResult = userIdJSON as UserIdResult;
  if (userIdResult.errcode !== 0) {
    throw new Error(userIdResult.errmsg);
  }

  const accessToken =
    "m_s23VPlzV-EQiECOMTOZm6mlXIhygh_jPenl2FuvBj1txxgO5rcI1zExQ6wwTKPUZQrbADR4UdtiBraVoDT14kW7t-xPBdyU-WpmTlvBe7WCUE81HwEkKXobiu-bLi2rVWxr4ja7_uhx_6J_YHSlgaWnD8-26lKjNkFmUpa4lZy8mzTkEPfyKMKzU34US9-VjVqBVQSwGSqVhEw1PXukQ";
  const userInfoUrl = `https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=${accessToken}&userid=${userIdResult.userid}`;
  const userInfoResult = await fetch(userInfoUrl);
  const userInfoJSON = await userInfoResult.json();
  return userIdResult.userid;
}

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const code = params.get("code") as string;
    const state = params.get("state") as string;
    const suiteAccessToken = await SERVICE.getSuiteAccessToken();

    console.log(`accessToken is ${suiteAccessToken}`);
    const userName = await getUserName(suiteAccessToken, code);

    console.error(`next url is ${req.nextUrl}`);

    const response = NextResponse.redirect(`${state}`);
    response.cookies.set("username", userName);
    return response;
  } catch (e) {
    console.error(e);
    return NextResponse.json(`error is ${e}`);
  }
}
