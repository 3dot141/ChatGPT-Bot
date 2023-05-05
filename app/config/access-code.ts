import md5 from "spark-md5";
import { supabaseClient } from "@/app/lib/embeddings-supabase";

export const dynamic = "force-dynamic";

export class AccessCodeClient {
  private lastQuery: Promise<string[]>;

  private needUpdate: boolean;

  private codes: string[];

  constructor() {
    this.codes = [];
    this.needUpdate = true;
    this.lastQuery = new Promise<string[]>((resolve) => resolve([]));
  }

  private async queryCodes(): Promise<string[]> {
    if (this.needUpdate) {
      const result = await supabaseClient
        .from("documents_username")
        .select("code");
      // @ts-ignore
      this.codes = result.data?.map((e) => e.code);

      this.needUpdate = false;
    }

    return this.codes;
  }

  async updateCodes(): Promise<void> {
    this.needUpdate = true;
  }

  async getAccessCodes(): Promise<Set<string>> {
    // 等待上一个结束
    if (this.lastQuery != null) {
      await this.lastQuery;
    }

    const codesResult = this.queryCodes();

    // 将自己标识为下一个
    this.lastQuery = codesResult;

    try {
      const codes = await codesResult;
      return new Set(codes);
    } catch (e) {
      return new Set();
    }
  }
}

export const accessCodeClient = new AccessCodeClient();
