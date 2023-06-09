import type { ChatRequest, ChatResponse } from "./api/openai/typing";
import { ModelConfig, SessionMsg, useAccessStore, useChatStore } from "./store";
import { showToast } from "./components/ui-lib";
import { json } from "stream/consumers";

export enum MessageSign {
  CONTENT_TYPE = 0,
  CONTEXT_TYPE = 1,

  CONTENT_SIGN = "#c1",
  CONTEXT_SIGN = "#c2",
}

const TIME_OUT_MS = 30000;

const makeRequestParam = (
  messages: Message[],
  options?: {
    filterBot?: boolean;
    stream?: boolean;
  },
): ChatRequest => {
  let sendMessages = messages.map((v) => ({
    role: v.role,
    content: v.content,
  }));

  if (options?.filterBot) {
    sendMessages = sendMessages.filter((m) => m.role !== "assistant");
  }

  const modelConfig = { ...useChatStore.getState().config.modelConfig };

  // @yidadaa: wont send max_tokens, because it is nonsense for Muggles
  // @ts-expect-error
  delete modelConfig.max_tokens;

  return {
    messages: sendMessages,
    stream: options?.stream,
    ...modelConfig,
  };
};

function getHeaders() {
  const accessStore = useAccessStore.getState();
  let headers: Record<string, string> = {};

  if (accessStore.enabledAccessControl()) {
    headers["access-code"] = accessStore.accessCode;
  }

  if (accessStore.token && accessStore.token.length > 0) {
    headers["token"] = accessStore.token;
  }

  if (accessStore.username && accessStore.username.length > 0) {
    headers["username"] = accessStore.username;
  }

  return headers;
}

export function requestOpenaiClient(path: string) {
  return (body: any, method = "POST") =>
    fetch("/api/openai?_vercel_no_cache=1", {
      method,
      headers: {
        "Content-Type": "application/json",
        path,
        ...getHeaders(),
      },
      body: body && JSON.stringify(body),
    });
}

export async function requestChat(messages: Message[]) {
  const req: ChatRequest = makeRequestParam(messages, { filterBot: true });

  const res = await requestOpenaiClient("v1/chat/completions")(req);

  try {
    const response = (await res.json()) as ChatResponse;
    return response;
  } catch (error) {
    console.error("[Request Chat] ", error, res.body);
  }
}

export async function requestUsage() {
  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d
      .getDate()
      .toString()
      .padStart(2, "0")}`;
  const ONE_DAY = 2 * 24 * 60 * 60 * 1000;
  const now = new Date(Date.now() + ONE_DAY);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startDate = formatDate(startOfMonth);
  const endDate = formatDate(now);

  const [used, subs] = await Promise.all([
    requestOpenaiClient(
      `dashboard/billing/usage?start_date=${startDate}&end_date=${endDate}`,
    )(null, "GET"),
    requestOpenaiClient("dashboard/billing/subscription")(null, "GET"),
  ]);

  const response = (await used.json()) as {
    total_usage?: number;
    error?: {
      type: string;
      message: string;
    };
  };

  const total = (await subs.json()) as {
    hard_limit_usd?: number;
  };

  if (response.error && response.error.type) {
    showToast(response.error.message);
    return;
  }

  if (response.total_usage) {
    response.total_usage = Math.round(response.total_usage) / 100;
  }

  return {
    used: response.total_usage,
    subscription: total.hard_limit_usd,
  };
}

export async function requestSuggestions(
  userMessage: Message,
): Promise<string[]> {
  const req = makeRequestParam([userMessage], {
    stream: false,
  });

  const res = await fetch("/api/chat-suggestion", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      path: "v1/chat/completions",
      ...getHeaders(),
    },
    body: JSON.stringify(req),
  });

  const body = await res.json();

  return body["questions"];
}

export async function requestAnalysis(
  userMessage: Message,
  botMessage: Message,
) {
  // 只发送，不反馈
  fetch("/api/analysis", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify({ userMessage, botMessage }),
  });
}

export async function requestAnalysisLike(
  userMessage: Message,
  botMessage: Message,
  type: number,
) {
  // 只发送，不反馈
  fetch("/api/analysis-like", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify({ userMessage, botMessage, type }),
  });
}

export async function requestChatStream(
  messages: Message[],
  options?: {
    filterBot?: boolean;
    modelConfig?: ModelConfig;
    onMessage: (message: string, done: boolean) => void;
    onError: (error: Error, statusCode?: number) => void;
    onController?: (controller: AbortController) => void;
    onContext?: (context: string) => void;
  },
) {
  const req = makeRequestParam(messages, {
    stream: true,
    filterBot: options?.filterBot,
  });

  console.log("[Request] ", req);

  const controller = new AbortController();
  const reqTimeoutId = setTimeout(() => controller.abort(), TIME_OUT_MS);

  try {
    const res = await fetch("/api/chat-stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        path: "v1/chat/completions",
        ...getHeaders(),
      },
      body: JSON.stringify(req),
      signal: controller.signal,
    });
    clearTimeout(reqTimeoutId);

    let responseText = "";
    let responseReg = /#c2(.*?)#c2/g;

    const finish = () => {
      options?.onMessage(responseText, true);
      controller.abort();
    };

    if (res.ok) {
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      options?.onController?.(controller);

      let type = MessageSign.CONTEXT_TYPE;
      while (true) {
        // handle time out, will stop if no response in 10 secs
        const resTimeoutId = setTimeout(() => finish(), TIME_OUT_MS);
        const content = await reader?.read();
        clearTimeout(resTimeoutId);

        if (!content || !content.value) {
          break;
        }

        let text = decoder.decode(content.value, { stream: true });
        // 默认就走这条路
        responseText += text;

        // 使用两个标准判断是否是 context, 从而帮助减少前端的判断请求
        if (type === MessageSign.CONTEXT_TYPE) {
          // 且需要是上下文逻辑
          if (text?.startsWith(MessageSign.CONTEXT_SIGN)) {
            const execArray = responseReg.exec(responseText);
            if (execArray && execArray.length == 2) {
              const contextWrapper = execArray[0];
              const context = execArray[1];
              options?.onContext?.(context);

              // 预期情况
              // 第一种情况 "#c2aaa#c2"    -> ""
              // 第二种情况 "#c2aaa#c2 "   -> " "
              // 第三种情况 "#c2aaa#c2 a"  -> " a"
              responseText = responseText.slice(contextWrapper.length);
              responseText = responseText.trimStart();
              // 立刻切换成其他类型
              type = MessageSign.CONTENT_TYPE;
            }
          }
          continue;
        }

        options?.onMessage(responseText, false);

        const done = content.done;
        if (done) {
          break;
        }
      }

      finish();
    } else if (res.status === 401) {
      console.error("Unauthorized");
      options?.onError(new Error("Unauthorized"), res.status);
    } else if (res.status === 402) {
      console.error("Need Work Wechat Login");
      options?.onError(new Error("Need Work Wechat Login"), res.status);
    } else if (res.status === 500) {
      options?.onError(new Error(""), res.status);
    } else {
      console.error("Stream Error", res.body);
      options?.onError(new Error("Stream Error"), res.status);
    }
  } catch (err) {
    console.error("NetWork Error", err);
    options?.onError(err as Error);
  }
}

export async function requestWithPrompt(messages: Message[], prompt: string) {
  messages = messages.concat([
    {
      role: "user",
      content: prompt,
      date: new Date().toLocaleString(),
    },
  ]);

  const res = await requestChat(messages);

  return res?.choices?.at(0)?.message?.content ?? "";
}

// To store message streaming controller
export const ControllerPool = {
  controllers: {} as Record<string, AbortController>,

  addController(
    sessionIndex: number,
    messageId: number,
    controller: AbortController,
  ) {
    const key = this.key(sessionIndex, messageId);
    this.controllers[key] = controller;
    return key;
  },

  stop(sessionIndex: number, messageId: number) {
    const key = this.key(sessionIndex, messageId);
    const controller = this.controllers[key];
    controller?.abort();
  },

  remove(sessionIndex: number, messageId: number) {
    const key = this.key(sessionIndex, messageId);
    delete this.controllers[key];
  },

  key(sessionIndex: number, messageIndex: number) {
    return `${sessionIndex},${messageIndex}`;
  },
};
