import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/app/lib/embeddings-supabase";
import {
  ChatCompletionRequestMessage,
  CreateChatCompletionRequest,
} from "openai";
import { doRequestOpenai, requestOpenai } from "@/app/api/common";

function createSuggestionPromptTemplate(input: string): string {
  return `
  你是一个内容转化器，下面我会给你一段内容，你要按照规则转换这段内容为三个问题。规则：将内容转化为三个问题：1、内容的排查方案是什么，2、内容的解决方法是什么，3、内容的排查思路是什么。请思考内容的替换方式，但是排查方案、解决方法、排查思路不会丢失。你要考虑转化的合理性，即当前的内容是否是需要排查方案、解决方法、排查思路。不是，则返回空数组。是只需要返回三个问题的数组即可。返回内容需要非常简洁，只需要返回 json 格式的回答。不需要额外的信息。
example
input: 目录权限设置不生效 
output: 
{
"questions": ["目录权限设置不生效的排查方案是什么?","有哪些常见的解决方法可用于修复目录权限设置不生效的问题？","面对目录权限设置不生效的问题，应该优先考虑哪些排查思路？"]
}
下面，请转化我给出的内容：input: ${input}, output:
  `;
}

export async function POST(req: NextRequest) {
  try {
    const clientCompletion = (await req.json()) as CreateChatCompletionRequest;
    const userMessage = clientCompletion.messages[0];
    const prompt = createSuggestionPromptTemplate(userMessage.content);
    const serverCompletion: CreateChatCompletionRequest = {
      ...clientCompletion,
      messages: [
        {
          ...userMessage,
          content: prompt,
        },
      ],
    };

    const openaiRequest = new NextRequest("https://demo.com/chat-guess", {
      headers: req.headers,
      method: "POST",
      body: JSON.stringify(serverCompletion),
    });
    const response = await requestOpenai(openaiRequest);
    const result = await response.json();
    //choices' structure
    //[
    //   {
    //     "message": {
    //       "role": "assistant",
    //       "content": "{\n\"questions\": []\n}"
    //     },
    //     "finish_reason": "stop",
    //     "index": 0
    //   }
    // ]
    const assistantMessage = result.choices[0].message as Message;
    const content = assistantMessage.content;
    const body = JSON.parse(content);
    console.log(`[chat-suggestion] ${content}`);
    return NextResponse.json(body);
  } catch (e) {
    return NextResponse.json("error");
  }
}
