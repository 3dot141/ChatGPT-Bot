import { BaseChatMemory } from "langchain/memory";
import { AgentExecutor, initializeAgentExecutor, Tool } from "langchain/agents";
import { OpenAI } from "langchain";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query");
  const llm = new OpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    temperature: 0.1,
    maxTokens: 2000,
  });
  const agentExecutor = await initializeAgentExecutor(
    [],
    llm,
    "zero-shot-react-description",
    true,
  );
  const result = await agentExecutor.run(query);
  return new Response(result);
}
