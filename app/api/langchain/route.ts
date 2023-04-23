import { OpenAI } from "langchain/llms";
import { initializeAgentExecutor } from "langchain/agents";
import { Calculator } from "langchain/tools";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const model = new OpenAI({ temperature: 0 });
  const tools = [new Calculator()];

  const executor = await initializeAgentExecutor(
    tools,
    model,
    "zero-shot-react-description",
    true,
  );
  console.log("Loaded agent.");

  const input =
    "Who is Olivia Wilde's boyfriend?" +
    " What is his current age raised to the 0.23 power?";
  console.log(`Executing with input "${input}"...`);

  const result = await executor.call({ input });

  console.log(`Got output ${result.output}`);
}
