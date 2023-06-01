import { requestEmbedding } from "@/app/api/common";
import { CreateChatCompletionRequest } from "openai/api";
import { HelperMessage } from "@/app/api/prompts/helper-message";
import { QuestionMessage } from "@/app/api/prompts/question-message";
import { AssistantMessage } from "@/app/api/prompts/assistant-message";
import { ChatCustomRequest } from "@/app/api/chat-stream/route";
import { CommonCache } from "@/app/lib/common-cache";
import context from "react-redux/src/components/Context";
import { JiraMessage } from "@/app/api/prompts/jira-message";

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
  systemMessage: Message;
  fewShotMessages: Message[];
  queryMessage: Message;

  context?: MessageContext;
};

export type DocContext = {
  context: MessageContext;
};

export interface MessageMaker {
  queryDocuments(embedding: []): Promise<Document[]>;

  parseDoc2Context(documents: Document[]): DocContext;
}

export function createShotMessage(
  name: string,
  userContent: string,
  assistantMessage: string,
): Message[] {
  return [
    {
      role: "user",
      content: userContent,
      ...{ name },
    },
    {
      role: "assistant",
      content: assistantMessage,
      ...{ name },
    },
  ];
}

const embeddingCache = new CommonCache<string, any>();

async function makeFrMsgChain(
  apiKey: string,
  userMessage: Message,
  // content: string,
  recentMessages: Message[],
  messageMaker: MessageMaker,
): Promise<SessionMsg> {
  // OpenAI recommends replacing newlines with spaces for best results
  userMessage.content = userMessage.content.replace(/\n/g, " ");

  let start = new Date().getDate();
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
  let end = new Date().getDate();
  console.log(`[embedding] cost ${end - start} ms`);

  start = new Date().getDate();
  const documents = await messageMaker.queryDocuments(embedding);
  end = new Date().getDate();
  console.log(`[query] cost ${end - start} ms`);

  const docContext = messageMaker.parseDoc2Context(documents);

  const { systemMessage, fewShotMessages, queryMessage, context } =
    convertDocContext2MessageChain(docContext, userMessage);

  const recentMsgList: Message[] = [
    ...recentMessages,
    systemMessage,
    ...fewShotMessages,
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
  if (splits && splits.length > 1) {
    const promptKey = splits[0].toLowerCase();
    userMessage.content = splits.slice(1).join(" ");

    if ("fr-help" === promptKey) {
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

    if ("fr-jira" === promptKey) {
      const jiraMessage = new JiraMessage();
      return await makeFrMsgChain(
        apiKey,
        userMessage,
        recentMessages,
        jiraMessage,
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
  userMessage.content = content;

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

function convertDocContext2MessageChain(
  docContext: DocContext,
  userMessage: Message,
): MessageChain {
  const contextText = JSON.stringify(docContext);

  const systemContent = `You are a helpful assistant. You always format your output in markdown. You include code snippets if relevant. 
  Compose a comprehensive reply to the query using the CONTEXT given.
  Don't use any information exclude the CONTEXT given. 
  Cite each reference using [TITLE]() notation (TITLE always be in the CONTEXT). 
  Citation should be done at the end of each sentence. Only include information found in the CONTEXT and 
  Don't add any additional information. Make sure the answer is correct and don't output false content. 
  If the text does not relate to the query, only say:'对不起，我不知道如何帮助你'.
  Only answer what is asked. The answer should be short and concise. Answer step-by-step. Please answered in chinese`;

  const userContent = `{
  "CONTEXT": [{
  "CONTENT": "Next.js是一个React框架，用于创建网络应用。",
  "TITLE": "next.js官网",
  "LINK": "nextjs.org/docs/faq"
  }]
  }
  ---
  
  QUESTION: 
  what is nextjs?`;

  const assistantContent = `Next.js是一个React框架，用于创建网络应用。
  \`\`\`js
  function HomePage() {
    return <div>Welcome to Next.js!</div>
  }
  \`\`\`
  [next.js官网](nextjs.org/docs/faq)`;

  const queryMessage: Message = {
    role: "user",
    content: `
  ${contextText}
  
  QUESTION: 
  ${userMessage.content}?  
  `,
  };
  return {
    systemMessage: {
      role: "system",
      content: systemContent,
    },
    fewShotMessages: [
      ...createShotMessage("example_1", userContent, assistantContent),
    ],
    queryMessage,
    context: docContext.context,
  };
}
