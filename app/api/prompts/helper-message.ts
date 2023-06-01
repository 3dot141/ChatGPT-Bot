import {
  createShotMessage,
  DocContext,
  Document,
  MessageChain,
  MessageMaker,
  QueryType,
} from "@/app/api/prompts/chat-message";
import GPT3Tokenizer from "gpt3-tokenizer";
import { supabaseClient } from "@/app/lib/embeddings-supabase";
import { MessageSourceType } from "@/app/api/common";

export class HelperMessage implements MessageMaker {
  async queryDocuments(embedding: []): Promise<Document[]> {
    async function queryDocByTitleEmbedding() {
      const { data: titleDoc, error } = await supabaseClient.rpc(
        "match_documents_v4_title_embedding",
        {
          query_embedding: embedding,
          similarity_threshold: 0.8, // Choose an appropriate threshold for your data
          match_count: 1, // Choose the number of matches
        },
      );

      if (error) {
        console.error(error);
        throw error;
      }
      return titleDoc;
    }

    const titleBeans = await queryDocByTitleEmbedding();

    async function queryByTitle() {
      const documents = [];
      for (let titleBean of titleBeans) {
        const { data: titleDocs, error } = await supabaseClient.rpc(
          "match_documents_v4_title",
          {
            query_title: titleBean.title,
            match_count: 3, // Choose the number of matches
          },
        );

        if (error) {
          console.error(error);
          throw error;
        }

        for (let titleDoc of titleDocs) {
          documents.push({
            ...titleDoc,
            similarity: titleBean.similarity,
          });
        }
      }
      return documents;
    }

    async function queryByContentEmbedding() {
      const { data: documents, error } = await supabaseClient.rpc(
        "match_documents_v4_content_embedding",
        {
          query_embedding: embedding,
          similarity_threshold: 0.8, // Choose an appropriate threshold for your data
          match_count: 5, // Choose the number of matches
        },
      );

      if (error) {
        console.error(error);
        throw error;
      }

      return documents;
    }

    const [docBeanByTitle, docBeanByContent] = await Promise.all([
      queryByTitle(),
      queryByContentEmbedding(),
    ]);

    // filter out duplicate documents by id
    // @ts-ignore
    const docBeanByContentFiltered = docBeanByContent.filter((docBean) => {
      return !docBeanByTitle.some((docBean2) => {
        return docBean.id === docBean2.id;
      });
    });

    // concat two arrays to new array
    const docBeans = docBeanByTitle.concat(docBeanByContentFiltered);

    for (let document of docBeans) {
      const content = document.content;
      const splits = content.split(">>");
      document.content = splits[2];
      document.title = [splits[0], splits[1]].join(">>");
    }

    // sort by similarity
    const sortedDocBeans = docBeans.sort((a, b) => {
      return b.similarity - a.similarity;
    });

    return sortedDocBeans;
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
        if (tokenCount > 3500) {
          break;
        }

        sources.push({
          type: MessageSourceType.LINK,
          link: url,
          title: `${i}-${document.title}`,
          content: content,
        });
      }
    }

    let context: MessageContext = { sources };
    return { context };
  }
}
