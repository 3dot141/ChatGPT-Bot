import {
  MessageChain,
  Document,
  MessageMaker,
  createShotMessage,
  DocContext,
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

  parseDoc2Context(documents: Document[]): DocContext {
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
          title: `${i}-${title}`,
          content: content,
        });
      }
    }

    let context: MessageContext = { sources };
    return { context: context };
  }
}
