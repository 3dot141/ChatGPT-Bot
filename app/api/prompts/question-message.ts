import {
  MessageChain,
  Document,
  MessageMaker,
  Message,
} from "@/app/api/prompts/chat-message";
import GPT3Tokenizer from "gpt3-tokenizer";
import { supabaseClient } from "@/app/lib/embeddings-supabase";
import { MessageSourceType } from "@/app/api/common";

export class QuestionMessage implements MessageMaker {
  async queryDocuments(embedding: []): Promise<Document[]> {
    const { data: documents, error } = await supabaseClient.rpc(
      "match_documents_answer",
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
    return documents;
  }

  parseDoc2MessageChain(documents: Document[], query: string): MessageChain {
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

        const title = `问题库${i}`;
        sources.push({
          type: MessageSourceType.TEXT,
          title,
          content: content,
        });

        contextText += `TEXT: """TITLE:${title} CONTENT:${content.trim()}"""`;
      }
    }

    let context: MessageContext = { sources };

    const systemContent = `你是一个严谨、精明、注重格式、表达详细的助手。
  当给你"""CONTEXT"""时，你只用这些信息来回答问题。
  你以 markdown 的形式输出。如果有代码片段，那么就输出为代码格式。
  如果有多个步骤或者需要说明多个信息，就用 1- 2- 3- 这样的形式输出。
  如果你不确定且答案没有明确写在提供的CONTEXT中，你就说:"对不起，我不知道如何帮助你。" 
  如果 CONTEXT 包含 URL，请在回答的最后将它们去重，然后以列表的形式，输出他的网页名和网页链接在 "SOURCES" 的下面。
  注意，不要输出null, 不要编造URL`;

    const userContent = `CONTEXT:
  Next.js是一个React框架，用于创建网络应用。
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
  \- [next.js官网](https://nextjs.org/docs/faq)`;

    const queryMessage: Message = {
      role: "user",
      content: `CONTEXT:
  ${contextText}
  
  USER QUESTION: 
  在FineReport中，${query}
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
