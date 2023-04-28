declare global {
  type WeComAPI = {
    corpId: string;

    agentId?: string;

    corpSecret?: string;
  };
}

export const WeCom_API: WeComAPI = {
  corpId: process.env.CORP_ID ?? "",
  corpSecret: process.env.CORP_SECRET ?? "",
};

export type WeComResult = {
  errcode: number;
  errmsg: string;
};

class ServiceApp {
  private _suite_id: string;
  private _suite_secret: string;
  private _suite_ticket: string;

  private _token: string;
  private _aeskey: string;

  private _authCode: string;
  private _permanentCode: any;
  private _accessToken: any;

  constructor() {
    this._suite_id = WeCom_API.corpId;
    this._suite_secret = WeCom_API.corpSecret ?? "";
    this._suite_ticket = "";
    this._token = process.env.WECOM_TOKEN ?? "";
    this._aeskey = process.env.WECOM_AESKEY ?? "";
    this._authCode = "";
  }

  get suite_id(): string {
    return this._suite_id;
  }

  set suite_id(value: string) {
    this._suite_id = value;
  }

  get suite_secret(): string {
    return this._suite_secret;
  }

  set suite_secret(value: string) {
    this._suite_secret = value;
  }

  get suite_ticket(): string {
    return "bLK3MzYMjN9mJM_ksu_PrXMxSDTrSECc47KX49NkLLxr3xiQ2StYvXfSeqbpGvoX";
  }

  set suite_ticket(value: string) {
    this._suite_ticket = value;
    console.error("suite_ticket changed", value);
  }

  get token(): string {
    return this._token;
  }

  get aeskey(): string {
    return this._aeskey;
  }

  get authCode(): string {
    return this._authCode;
  }

  set authCode(value: string) {
    this._authCode = value;
    console.log(`auth code is ${this._authCode}`);
    // this.initPermanentCode();
  }

  get permanentCode(): any {
    return this._permanentCode;
  }

  get accessToken(): any {
    return this._accessToken;
  }

  async getSuiteAccessToken(): Promise<string> {
    const url = `https://qyapi.weixin.qq.com/cgi-bin/service/get_suite_token`;
    const body = {
      suite_id: this.suite_id,
      suite_secret: this.suite_secret,
      suite_ticket: this.suite_ticket,
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

  async initPermanentCode() {
    const suite_access_key = await this.getSuiteAccessToken();
    const url = `https://qyapi.weixin.qq.com/cgi-bin/service/get_permanent_code?suite_access_token=${suite_access_key}`;
    const body = {
      auth_code:
        "16eONuqnneljJnDfaxfWFlWlnJTnN25rrrmDU1cCjLaH2lsNQQIaILoqokh7lx5QCtMm2AjBhb-YTd72YtUhtPAVihtTrStLeP8CSIxLOvA",
    };
    const permanentResult = await fetch(url, {
      method: "POST",
      body: JSON.stringify(body),
    });
    const permanentJSON = await permanentResult.json();
    this._permanentCode = permanentJSON.permanent_code;
    this._accessToken = permanentJSON.access_token;
    console.log(`permanentCode is ${this._permanentCode}`);
    console.log(`accessToken is ${this._accessToken}`);
  }
}

type AccessThirdTokenResult = WeComResult & {
  suite_access_token: string;
};

export const SERVICE = new ServiceApp();
