import { requestEmbedding } from "@/app/api/common";
import { CreateChatCompletionRequest } from "openai/api";
import { HelperMessage } from "@/app/api/prompts/helper-message";
import { QuestionMessage } from "@/app/api/prompts/question-message";
import { AssistantMessage } from "@/app/api/prompts/assistant-message";
import { ChatCustomRequest } from "@/app/api/chat-stream/route";
import { CommonCache } from "@/app/lib/common-cache";

export type SessionMsg = {
  userMessage: Message;
  recentMessages: Message[];
  context?: MessageContext;
};

export enum QueryType {
  FR_HELPER = 1,
  FR_QUESTION = 2,
}

export type Document = { title: string; content: string; url: string };

export type MessageChain = {
  systemContent: string;
  userContent: string;
  assistantContent: string;
  queryMessage: Message;

  context?: MessageContext;
};

export interface MessageMaker {
  queryDocuments(embedding: []): Promise<Document[]>;

  parseDoc2MessageChain(
    documents: Document[],
    userMessage: Message,
  ): MessageChain;
}

const embeddingCache = new CommonCache<string, any>();

const docCache = new CommonCache<any, Document[]>();

async function makeFrMsgChain(
  apiKey: string,
  userMessage: Message,
  // content: string,
  recentMessages: Message[],
  messageMaker: MessageMaker,
): Promise<SessionMsg> {
  // OpenAI recommends replacing newlines with spaces for best results
  userMessage.content = userMessage.content.replace(/\n/g, " ");

  const cacheKey: string = userMessage.content;
  let embedding = (await embeddingCache.getOrLoad(cacheKey, async () => {
    const embeddingResponse = await requestEmbedding(apiKey, cacheKey);
    const embeddingData = await embeddingResponse.json();
    if (embeddingData.error) {
      throw new Error(JSON.stringify(embeddingData.error));
    }
    const [{ embedding }] = embeddingData.data;
    return embedding;
  })) as any;

  let documents =
    (await docCache.getOrLoad(embedding, async () => {
      return await messageMaker.queryDocuments(embedding);
    })) ?? [];

  const {
    systemContent,
    userContent,
    assistantContent,
    queryMessage,
    context,
  } = messageMaker.parseDoc2MessageChain(documents, userMessage);

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
  return { userMessage: queryMessage, recentMessages: recentMsgList, context };
}

/**
 * 创建信息链条
 *
 * @param apiKey
 * @param userMessage
 * @param recentMessages
 */
async function makeChatMessages(
  apiKey: string,
  userMessage: Message,
  recentMessages: Message[],
): Promise<SessionMsg> {
  const content = userMessage.content;

  const splits = content.split(" ");
  if (splits && splits.length !== 0) {
    const promptKey = splits[0].toLowerCase();
    userMessage.content = splits.slice(1).join(" ");

    if ("fr" === promptKey) {
      const helperMessage = new HelperMessage();
      // @ts-ignore
      return await makeFrMsgChain(
        apiKey,
        userMessage,
        recentMessages,
        helperMessage,
      );
    }
    if ("fr-que" === promptKey) {
      const questionMessage = new QuestionMessage();
      // @ts-ignore
      return await makeFrMsgChain(
        apiKey,
        userMessage,
        recentMessages,
        questionMessage,
      );
    }
    if ("fr-front" === promptKey) {
      const assistantMessage = new AssistantMessage();
      // @ts-ignore
      return await makeFrMsgChain(
        apiKey,
        userMessage,
        recentMessages,
        assistantMessage,
      );
    }
  }

  return { userMessage: userMessage, recentMessages: recentMessages };
}

export async function preHandleMessage(
  apiKey: string,
  completionReq: CreateChatCompletionRequest,
): Promise<ChatCustomRequest> {
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
      context: chatMessage.context,
    };
  } catch (e) {
    throw e;
  }
}
