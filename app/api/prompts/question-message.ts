import {
  MessageChain,
  Document,
  MessageMaker,
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

        let title = "";
        const questionRegex = /问题: (.*)\n/g;
        const execArray = questionRegex.exec(content);
        if (execArray && execArray.length > 1) {
          title = execArray[1];
        } else {
          title = `问题库${i}`;
        }
        sources.push({
          type: MessageSourceType.TEXT,
          title,
          content: content,
        });

        contextText += `CONTENT: ${content.trim()}\n
          TITLE: ${document.title} \n 
          SOURCE: ${url}\n\n`;
      }
    }

    let context: MessageContext = { sources };

    const systemContent = `You are a helpful assistant. You always format your output in markdown. You include code snippets if relevant. 
        Compose a comprehensive reply to the query using the CONTEXT given. 
        Cite each reference using [TITLE] notation (every result has this number at the beginning). 
        Citation should be done at the end of each sentence. Only include information found in the CONTEXT and 
        don't add any additional information. Make sure the answer is correct and don't output false content. 
        If the text does not relate to the query, give me (one to three) sub-questions such that my question can be answered by the CONTEXT like '对不起，我不知道如何帮助你, 根据上下文，你也许想问'. 
        Only answer what is asked. The answer should be short and concise. Answer step-by-step. `;

    const userContent = `CONTEXT:
      CONTENT: Next.js是一个React框架，用于创建网络应用。
      TITLE: next.js官网
      SOURCE: nextjs.org/docs/faq
      
      QUESTION: 
      what is nextjs?`;

    const assistantContent = `Next.js是一个React框架，用于创建网络应用。
  \`\`\`js
  function HomePage() {
    return <div>Welcome to Next.js!</div>
  }
  \`\`\`
  [next.js官网]`;

    const queryMessage: Message = {
      role: "user",
      content: `CONTEXT:
  ${contextText}
  
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
