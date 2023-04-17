import { ChatCompletionResponseMessage } from "openai";
import { supabaseClient } from "@/app/lib/embeddings-supabase";
import GPT3Tokenizer from "gpt3-tokenizer";
import { requestEmbedding } from "@/app/api/common";
import { CreateChatCompletionRequest } from "openai/api";
import { HelperMessage } from "@/app/api/prompts/helper-message";
import { QuestionMessage } from "@/app/api/prompts/question-message";
import { AssistantMessage } from "@/app/api/prompts/assistant-message";

export type Message = ChatCompletionResponseMessage;

export type SessionMsg = {
  userMessage: Message;
  recentMessages: Message[];
};

export enum QueryType {
  FR_HELPER = 1,
  FR_QUESTION = 2,
}

export type Document = { content: string; url: string };

export type MessageChain = {
  systemContent: string;
  userContent: string;
  assistantContent: string;
  queryMessage: Message;
};

export interface MessageMaker {
  queryDocuments(embedding: []): Promise<Document[]>;

  parseDoc2MessageChain(documents: Document[], query: string): MessageChain;
}
async function makeFrMsgChain(
  apiKey: string,
  content: string,
  recentMessages: Message[],
  messageMaker: MessageMaker,
) {
  const query = content.slice(3);

  // OpenAI recommends replacing newlines with spaces for best results
  const input = query.replace(/\n/g, " ");
  // console.log("input: ", input);

  const embeddingResponse = await requestEmbedding(apiKey, input);

  const embeddingData = await embeddingResponse.json();
  if (embeddingData.error) {
    throw new Error(JSON.stringify(embeddingData.error));
  }
  const [{ embedding }] = embeddingData.data;
  // console.log("embedding: ", embedding);

  const documents = await messageMaker.queryDocuments(embedding);

  const { systemContent, userContent, assistantContent, queryMessage } =
    messageMaker.parseDoc2MessageChain(documents, query);

  const recentMsgList: Message[] = [
    ...recentMessages,
    {
      role: "system",
      content: systemContent,
    },
    {
      role: "user",
      content: userContent,
    },
    {
      role: "assistant",
      content: assistantContent,
    },
  ];

  console.log("messages: ", queryMessage);
  return { userMessage: queryMessage, recentMessages: recentMsgList };
}

/**
 * 创建信息链条
 *
 * @param apiKey
 * @param userMessage
 * @param recentMessages
 */
async function makeChatMessages(
  apiKey: string | null,
  userMessage: Message,
  recentMessages: Message[],
): Promise<SessionMsg> {
  const content = userMessage.content;

  const splits = content.split(" ");
  if (splits && splits.length !== 0) {
    const promptKey = splits[0].toLowerCase();
    if ("fr" === promptKey) {
      const helperMessage = new HelperMessage();
      // @ts-ignore
      return await makeFrMsgChain(
        apiKey,
        content,
        recentMessages,
        helperMessage,
      );
    }
    if ("fr-question" === promptKey) {
      const questionMessage = new QuestionMessage();
      // @ts-ignore
      return await makeFrMsgChain(
        apiKey,
        content,
        recentMessages,
        questionMessage,
      );
    }
    if ("fr-knowledge" === promptKey) {
      const assistantMessage = new AssistantMessage();
      // @ts-ignore
      return await makeFrMsgChain(
        apiKey,
        content,
        recentMessages,
        assistantMessage,
      );
    }
  }

  return { userMessage: userMessage, recentMessages: recentMessages };
}
export async function preHandleMessage(
  apiKey: string | null,
  completionReq: CreateChatCompletionRequest,
): Promise<CreateChatCompletionRequest> {
  try {
    const messages = completionReq.messages;
    const sessionMsg: SessionMsg = {
      userMessage: messages[messages.length - 1],
      recentMessages: messages.slice(0, messages.length - 1),
    };
    const chatMessage = await makeChatMessages(
      apiKey,
      sessionMsg.userMessage,
      sessionMsg.recentMessages,
    );
    return {
      ...completionReq,
      messages: [...chatMessage.recentMessages, chatMessage.userMessage],
    };
  } catch (e) {
    throw e;
  }
}
