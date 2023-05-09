import {
  MessageChain,
  Document,
  MessageMaker,
} from "@/app/api/prompts/chat-message";
import GPT3Tokenizer from "gpt3-tokenizer";
import { supabaseClient } from "@/app/lib/embeddings-supabase";
import { MessageSourceType } from "@/app/api/common";

export class AssistantMessage implements MessageMaker {
  async queryDocuments(embedding: []): Promise<Document[]> {
    const { data: documents, error } = await supabaseClient.rpc(
      "match_documents_qa_v1",
      {
        query_embedding: embedding,
        similarity_threshold: 0.1, // Choose an appropriate threshold for your data
        match_count: 5, // Choose the number of matches
      },
    );

    if (error) {
      console.error(error);
      throw error;
    }

    for (let document of documents) {
      const content = document.content;
      const splits = content.split(">>");
      // 截断一下，不要太长
      const questions = splits[1].split(";");
      document.title = questions.splice(0, 3).join(";");
      document.content = splits[2];
    }
    return documents;
  }

  parseDoc2MessageChain(
    documents: Document[],
    userMessage: Message,
  ): MessageChain {
    const tokenizer = new GPT3Tokenizer({ type: "gpt3" });
    let tokenCount = 0;
    let contextText = "";

    // console.log("documents: ", documents);

    // Concat matched documents
    let sources: MessageSource[] = [];
    if (documents) {
      for (let i = 0; i < documents.length; i++) {
        const document = documents[i];
        const content = document.content;
        const url = document.url;
        const encoded = tokenizer.encode(content);
        tokenCount += encoded.text.length;

        // Limit context to max 1500 tokens (configurable)
        if (tokenCount > 3000) {
          break;
        }

        sources.push({
          type: MessageSourceType.TEXT,
          title: document.title,
          content: content,
        });

        contextText += `${content.trim()} \n`;
      }
    }
    let context: MessageContext = { sources };

    const systemContent =
      `You are a helpful assistant. When given CONTEXT you answer questions using only that information,` +
      `and you always format your output in markdown. You include code snippets if relevant. ` +
      `If you are unsure and the answer is not explicitly written in the CONTEXT provided, you must say: "对不起，我不知道如何帮助你。"`;

    const userContent = `CONTEXT:
  """Next.js是一个React框架，用于创建网络应用。"""
  
  QUESTION: 
  """what is nextjs?"""
  `;

    const assistantContent = `Next.js是一个React框架，用于创建网络应用。
  \`\`\`js
  function HomePage() {
    return <div>Welcome to Next.js!</div>
  }
  \`\`\`
  `;

    const queryMessage: Message = {
      role: "user",
      content: `CONTEXT:
  """${contextText}"""
  
  USER QUESTION: 
  """${userMessage.content}"""
  `,
    };
    return {
      systemContent,
      userContent,
      assistantContent,
      queryMessage,
      context,
    };
  }
}
