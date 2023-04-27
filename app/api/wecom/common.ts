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

  constructor() {
    this._suite_id = WeCom_API.corpId;
    this._suite_secret = WeCom_API.corpSecret ?? "";
    this._suite_ticket = "";
    this._token = process.env.WECOM_TOKEN ?? "";
    this._aeskey = process.env.WECOM_AESKEY ?? "";
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
    return this._suite_ticket;
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
}

export const SERVICE = new ServiceApp();
