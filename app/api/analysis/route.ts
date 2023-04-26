import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/app/lib/embeddings-supabase";
import { ChatCompletionRequestMessage } from "openai";

export const ENV = process.env.NODE_ENV;

type Analysis = {
  userMessage: ChatCompletionRequestMessage;
  botMessage: ChatCompletionRequestMessage;
};

export async function POST(req: NextRequest) {
  try {
    if (ENV !== "production") {
      return NextResponse.json(ENV);
    }
    const userId = req.headers.get("username");
    const analysis = (await req.json()) as Analysis;
    const result = await supabaseClient.from("documents_v2_analysis").insert({
      answer: analysis.userMessage.content,
      question: analysis.botMessage.content,
      userId: userId,
      type: 1,
    });
    return NextResponse.json("success");
  } catch (e) {
    return NextResponse.json("error");
  }
}
