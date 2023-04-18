import {
  Document,
  Message,
  MessageChain,
  MessageMaker,
  QueryType,
} from "@/app/api/prompts/chat-message";
import GPT3Tokenizer from "gpt3-tokenizer";
import { supabaseClient } from "@/app/lib/embeddings-supabase";

export class HelperMessage implements MessageMaker {
  async queryDocuments(embedding: []): Promise<Document[]> {
    const { data: documents, error } = await supabaseClient.rpc(
      "match_documents_v2_type",
      {
        query_embedding: embedding,
        similarity_threshold: 0.1, // Choose an appropriate threshold for your data
        match_count: 5, // Choose the number of matches
        type: QueryType.FR_HELPER,
      },
    );

    if (error) {
      console.error(error);
      throw error;
    }

    for (let document of documents) {
      const content = document.content;
      const splits = content.split(">>");
      document.content = splits[2];
      document.title = [splits[0], splits[1]].join(">>");
    }
    return documents;
  }

  parseDoc2MessageChain(documents: Document[], query: string): MessageChain {
    const tokenizer = new GPT3Tokenizer({ type: "gpt3" });
    let tokenCount = 0;
    let contextText = "";

    // console.log("documents: ", documents);

    // Concat matched documents
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

        contextText += `${content.trim()}\nTITLE: ${
          document.title
        } \n SOURCE: ${url}\n---\n`;
      }
    }

    const systemContent = `你是一个严谨、精明、注重格式、表达详细的助手。
  当给你 CONTEXT 时，你只用这些信息来回答问题。
  你以 markdown 的形式输出。如果有代码片段，那么就输出为代码格式。
  如果有多个步骤或者需要说明多个信息，就用 1- 2- 3- 这样的形式输出。
  如果你不确定且答案没有明确写在提供的CONTEXT中，你就说:"对不起，我不知道如何帮助你。" 
  如果 CONTEXT 包含 SOURCE 和 TITLE，请在回答的最后将它们去重且按照匹配度降序，然后以列表的形式，输出超链接在 "SOURCES" 的下面，并附上匹配度。
  注意，不要输出null, 不要编造URL`;

    const userContent = `CONTEXT:
  Next.js是一个React框架，用于创建网络应用。
  TITLE: next.js官网
  SOURCE: nextjs.org/docs/faq
  
  QUESTION: 
  what is nextjs?
  `;

    const assistantContent = `Next.js是一个React框架，用于创建网络应用。
  \`\`\`js
  function HomePage() {
    return <div>Welcome to Next.js!</div>
  }
  \`\`\`
  
  SOURCES:
  \- [next.js官网](https://nextjs.org/docs/faq)-匹配度100`;

    const queryMessage: Message = {
      role: "user",
      content: `CONTEXT:
  ${contextText}
  
  USER QUESTION: 
  在FineReport中，${query}
  `,
    };
    return { systemContent, userContent, assistantContent, queryMessage };
  }
}
