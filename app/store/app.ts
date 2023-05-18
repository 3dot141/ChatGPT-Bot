import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  ControllerPool,
  requestAnalysis,
  requestChatStream,
  requestSuggestions,
  requestWithPrompt,
} from "../requests";
import { isMobileScreen, trimTopic } from "../utils";

import Locale from "../locales";
import { showToast } from "../components/ui-lib";
import { SearchService } from "@/app/store/prompt";
import { Task, TaskResult, TaskStrategy } from "@/app/gpt";

export function createMessage(override: Partial<Message>): Message {
  return {
    id: Date.now(),
    date: new Date().toLocaleString(),
    role: "user",
    content: "",
    ...override,
  };
}

export type SessionMsg = {
  userMessage: Message;
  recentMessages: Message[];
};

export enum SubmitKey {
  Enter = "Enter",
  CtrlEnter = "Ctrl + Enter",
  ShiftEnter = "Shift + Enter",
  AltEnter = "Alt + Enter",
  MetaEnter = "Meta + Enter",
}

export enum Theme {
  Auto = "auto",
  Dark = "dark",
  Light = "light",
}

export interface ChatConfig {
  historyMessageCount: number; // -1 means all
  compressMessageLengthThreshold: number;
  sendBotMessages: boolean; // send bot's message or not
  submitKey: SubmitKey;
  avatar: string;
  fontSize: number;
  theme: Theme;
  tightBorder: boolean;
  sendPreviewBubble: boolean;
  sidebarWidth: number;

  disablePromptHint: boolean;

  modelConfig: {
    model: string;
    temperature: number;
    max_tokens: number;
    presence_penalty: number;
  };
}

export type ModelConfig = ChatConfig["modelConfig"];

export const ROLES: Message["role"][] = ["system", "user", "assistant"];

const ENABLE_GPT4 = true;

export const ALL_MODELS = [
  {
    name: "gpt-4",
    available: ENABLE_GPT4,
  },
  {
    name: "gpt-4-0314",
    available: ENABLE_GPT4,
  },
  {
    name: "gpt-4-32k",
    available: ENABLE_GPT4,
  },
  {
    name: "gpt-4-32k-0314",
    available: ENABLE_GPT4,
  },
  {
    name: "gpt-3.5-turbo",
    available: true,
  },
  {
    name: "gpt-3.5-turbo-0301",
    available: true,
  },
];

export function limitNumber(
  x: number,
  min: number,
  max: number,
  defaultValue: number,
) {
  if (typeof x !== "number" || isNaN(x)) {
    return defaultValue;
  }

  return Math.min(max, Math.max(min, x));
}

export function limitModel(name: string) {
  return ALL_MODELS.some((m) => m.name === name && m.available)
    ? name
    : ALL_MODELS[4].name;
}

export const ModalConfigValidator = {
  model(x: string) {
    return limitModel(x);
  },
  max_tokens(x: number) {
    return limitNumber(x, 0, 32000, 2000);
  },
  presence_penalty(x: number) {
    return limitNumber(x, -2, 2, 0);
  },
  temperature(x: number) {
    return limitNumber(x, 0, 2, 1);
  },
};

const DEFAULT_CONFIG: ChatConfig = {
  historyMessageCount: 4,
  compressMessageLengthThreshold: 1000,
  sendBotMessages: true as boolean,
  submitKey: SubmitKey.Enter as SubmitKey,
  avatar: "1f603",
  fontSize: 14,
  theme: Theme.Auto as Theme,
  tightBorder: false,
  sendPreviewBubble: true,
  sidebarWidth: 300,

  disablePromptHint: false,

  modelConfig: {
    model: "gpt-3.5-turbo",
    temperature: 1,
    max_tokens: 2000,
    presence_penalty: 0,
  },
};

export interface ChatStat {
  tokenCount: number;
  wordCount: number;
  charCount: number;
}

export interface ChatSession {
  id: number;
  topic: string;
  sendMemory: boolean;
  memoryPrompt: string;
  context: Message[];
  messages: Message[];
  suggestions: string[];
  stat: ChatStat;
  lastUpdate: string;
  lastSummarizeIndex: number;
}

const DEFAULT_TOPIC = Locale.Store.DefaultTopic;
export const BOT_HELLO: Message = createMessage({
  role: "assistant",
  content: Locale.Store.BotHello,
});

function createEmptySession(): ChatSession {
  const createDate = new Date().toLocaleString();

  return {
    id: Date.now(),
    topic: DEFAULT_TOPIC,
    sendMemory: true,
    memoryPrompt: "",
    context: [],
    messages: [],
    suggestions: [],
    stat: {
      tokenCount: 0,
      wordCount: 0,
      charCount: 0,
    },
    lastUpdate: createDate,
    lastSummarizeIndex: 0,
  };
}

interface ChatStore {
  config: ChatConfig;
  sessions: ChatSession[];
  currentSessionIndex: number;
  clearSessions: () => void;
  removeSession: (index: number) => void;
  moveSession: (from: number, to: number) => void;
  selectSession: (index: number) => void;
  newSession: () => void;
  deleteSession: (index?: number) => void;
  currentSession: () => ChatSession;
  onNewMessage: (message: Message) => void;
  onUserInput: (content: string) => Promise<void>;
  onUserSuggestion: (content: string) => Promise<void>;
  clearSuggestion: () => void;
  /**
   * 创建助手的应答
   *
   * @param recentMessages 最近消息
   * @param userMessage 用户消息
   * @param callback 回调函数
   */
  onAssistantOutput: (
    recentMessages: Message[],
    userMessage: Message,
    callback?: (botMessage: Message) => void,
  ) => Promise<void>;
  /**
   * 执行目标
   * 没有上下文记忆功能
   *
   * @param task 任务
   * @param taskStrategy 任务策略
   */
  doGoalChat: (task: Task, taskStrategy: TaskStrategy) => Promise<void>;
  summarizeSession: () => void;
  updateStat: (message: Message) => void;
  updateCurrentSession: (updater: (session: ChatSession) => void) => void;
  updateMessage: (
    sessionIndex: number,
    messageIndex: number,
    updater: (message?: Message) => void,
  ) => void;
  resetSession: () => void;
  getMessagesWithMemory: () => Message[];
  getMemoryPrompt: () => Message;

  getConfig: () => ChatConfig;
  resetConfig: () => void;
  updateConfig: (updater: (config: ChatConfig) => void) => void;
  clearAllData: () => void;
}

function countMessages(msgs: Message[]) {
  return msgs.reduce((pre, cur) => pre + cur.content.length, 0);
}

const LOCAL_KEY = "chat-next-web-store";

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      sessions: [createEmptySession()],
      currentSessionIndex: 0,
      config: {
        ...DEFAULT_CONFIG,
      },

      clearSessions() {
        set(() => ({
          sessions: [createEmptySession()],
          currentSessionIndex: 0,
        }));
      },

      resetConfig() {
        set(() => ({ config: { ...DEFAULT_CONFIG } }));
      },

      getConfig() {
        return get().config;
      },

      updateConfig(updater) {
        const config = get().config;
        updater(config);
        set(() => ({ config }));
      },

      selectSession(index: number) {
        set({
          currentSessionIndex: index,
        });
      },

      removeSession(index: number) {
        set((state) => {
          let nextIndex = state.currentSessionIndex;
          const sessions = state.sessions;

          if (sessions.length === 1) {
            return {
              currentSessionIndex: 0,
              sessions: [createEmptySession()],
            };
          }

          sessions.splice(index, 1);

          if (nextIndex === index) {
            nextIndex -= 1;
          }

          return {
            currentSessionIndex: nextIndex,
            sessions,
          };
        });
      },

      moveSession(from: number, to: number) {
        set((state) => {
          const { sessions, currentSessionIndex: oldIndex } = state;

          // move the session
          const newSessions = [...sessions];
          const session = newSessions[from];
          newSessions.splice(from, 1);
          newSessions.splice(to, 0, session);

          // modify current session id
          let newIndex = oldIndex === from ? to : oldIndex;
          if (oldIndex > from && oldIndex <= to) {
            newIndex -= 1;
          } else if (oldIndex < from && oldIndex >= to) {
            newIndex += 1;
          }

          return {
            currentSessionIndex: newIndex,
            sessions: newSessions,
          };
        });
      },

      newSession() {
        set((state) => ({
          currentSessionIndex: 0,
          sessions: [createEmptySession()].concat(state.sessions),
        }));
      },

      deleteSession(i?: number) {
        const deletedSession = get().currentSession();
        const index = i ?? get().currentSessionIndex;
        const isLastSession = get().sessions.length === 1;
        if (!isMobileScreen() || confirm(Locale.Home.DeleteChat)) {
          get().removeSession(index);

          showToast(
            Locale.Home.DeleteToast,
            {
              text: Locale.Home.Revert,
              onClick() {
                set((state) => ({
                  sessions: state.sessions
                    .slice(0, index)
                    .concat([deletedSession])
                    .concat(
                      state.sessions.slice(index + Number(isLastSession)),
                    ),
                }));
              },
            },
            5000,
          );
        }
      },

      currentSession() {
        let index = get().currentSessionIndex;
        const sessions = get().sessions;

        if (index < 0 || index >= sessions.length) {
          index = Math.min(sessions.length - 1, Math.max(0, index));
          set(() => ({ currentSessionIndex: index }));
        }

        const session = sessions[index];

        return session;
      },

      onNewMessage(message) {
        get().updateCurrentSession((session) => {
          session.lastUpdate = new Date().toLocaleString();
        });
        get().updateStat(message);
        get().summarizeSession();
      },

      async doGoalChat(task: Task, taskStrategy: TaskStrategy) {
        // 获取纯粹的问题
        const query = task.query;
        const tasks: Task[] = [
          { title: "fr-help", query: `fr-help ${query}` },
          {
            title: "fr-que",
            query: `fr-que ${query}`,
          },
          { title: "fr-front", query: `fr-front ${query}` },
          { title: "gpt", query: `请用中文回答， 在FineReport中, ${query}` },
        ];
        for (let task of tasks) {
          const warning =
            task.title === "gpt" ? "注意：GPT 可能会捏造信息, 请自行分辨" : "";
          const thinkingMessage = createMessage({
            role: "assistant",
            content: `正在借助 "${task.title.trim()}" 思考问题 "${query.trim()}" ${warning} `,
            context: { cot_thinking: true },
          });

          get().updateCurrentSession((session) => {
            session.messages.push(thinkingMessage);
          });
          const userMessage: Message = createMessage({
            role: "user",
            content: task.query,
            context: { cot_question: true },
          });

          const result = await new Promise<TaskResult>((resolve) => {
            get().onAssistantOutput([], userMessage, (botMessage: Message) => {
              // 查询失败的反馈
              if (botMessage && botMessage.content.startsWith("对不起")) {
                thinkingMessage.isError = true;
                botMessage.isError = true;
                resolve(TaskResult.FAILED);
              } else {
                resolve(TaskResult.SUCCESS);
              }
            });
          });

          if (result === TaskResult.SUCCESS) {
            if (taskStrategy == TaskStrategy.CHAIN) {
              break;
            }
          }
        }
      },

      clearSuggestion(): void {
        get().updateCurrentSession((session) => {
          session.suggestions = [];
        });
      },

      async onUserSuggestion(content: string): Promise<void> {
        requestSuggestions({
          content: content,
          role: "user",
        }).then((result) => {
          get().updateCurrentSession((session) => {
            session.suggestions = result;
          });
        });
      },

      async onAssistantOutput(
        recentMessages: Message[],
        userMessage: Message,
        callback?: (botMessage: Message) => void,
      ): Promise<void> {
        const botMessage: Message = createMessage({
          role: "assistant",
          streaming: true,
        });

        get().updateCurrentSession((session) => {
          session.messages.push(botMessage);
        });

        const sendMessages = recentMessages.concat(userMessage);
        const sessionIndex = get().currentSessionIndex;
        const messageIndex = get().currentSession().messages.length + 1;

        await requestChatStream(sendMessages, {
          onMessage(content, done) {
            // stream response
            if (done) {
              botMessage.streaming = false;
              botMessage.content = content;
              get().onNewMessage(botMessage);
              ControllerPool.remove(
                sessionIndex,
                botMessage.id ?? messageIndex,
              );
              callback && callback(botMessage);
              requestAnalysis(userMessage, botMessage);
            } else {
              botMessage.content = content;
              set(() => ({}));
            }
          },
          // 将上下文放到这里
          onContext(context) {
            try {
              if (context) {
                botMessage.context = JSON.parse(context) as MessageContext;
                set(() => ({}));
              }
            } catch (e) {
              console.error(`context is ${context}`, e);
            }
          },
          onError(error, statusCode) {
            if (statusCode === 401) {
              botMessage.content = Locale.Error.NoAccess;
            } else if (statusCode === 402) {
              botMessage.content = Locale.Error.NoQyLogin;
            } else if (statusCode === 500) {
              botMessage.content = Locale.Store.Focus;
            } else {
              botMessage.content += "\n\n" + Locale.Store.Error;
            }
            botMessage.streaming = false;
            userMessage.isError = true;
            botMessage.isError = true;
            set(() => ({}));
            ControllerPool.remove(sessionIndex, botMessage.id ?? messageIndex);
            requestAnalysis(userMessage, botMessage);
          },
          onController(controller) {
            // collect controller for stop/retry
            ControllerPool.addController(
              sessionIndex,
              botMessage.id ?? messageIndex,
              controller,
            );
          },
          filterBot: !get().config.sendBotMessages,
          modelConfig: get().config.modelConfig,
        });
      },

      async onUserInput(content) {
        get().clearSuggestion();

        const userMessage: Message = createMessage({
          role: "user",
          content,
        });

        // get recent messages
        const recentMessages = get().getMessagesWithMemory();

        // save user's and bot's message
        get().updateCurrentSession((session) => {
          session.messages.push(userMessage);
        });

        if (!content?.startsWith("gpt ")) {
          content = `fr ${content}`;
        }

        const doChatStream = async () => {
          if (content?.startsWith("gpt ")) {
            const customUserMessage = {
              ...userMessage,
              content: userMessage.content.slice(4),
            };
            await get().onAssistantOutput(recentMessages, customUserMessage);
            return;
          }

          if (content?.startsWith("fr-goal-chain ")) {
            await get().doGoalChat(
              { title: "fr-goal-chain", query: content },
              TaskStrategy.CHAIN,
            );
            return;
          }
          if (content?.startsWith("fr ")) {
            await get().doGoalChat(
              { title: "fr", query: content },
              TaskStrategy.CHAIN,
            );
            return;
          }
          if (content?.startsWith("fr-goal-all ")) {
            await get().doGoalChat(
              { title: "fr-goal-all", query: content },
              TaskStrategy.ALL,
            );
            return;
          }

          await get().onAssistantOutput(recentMessages, userMessage);
        };
        await doChatStream();

        let pureContent = content;
        if (content?.startsWith("fr ")) {
          pureContent = content.slice(3).trim();
        }
        await get().onUserSuggestion(pureContent);
      },

      getMemoryPrompt() {
        const session = get().currentSession();

        return {
          role: "system",
          content: Locale.Store.Prompt.History(session.memoryPrompt),
          date: "",
        } as Message;
      },

      getMessagesWithMemory() {
        const session = get().currentSession();
        const config = get().config;
        // 过滤错误/ cot-思考/问题
        const messages = session.messages.filter(
          (msg) =>
            !msg.isError ||
            !msg.context?.cot_thinking ||
            !msg.context?.cot_question,
        );
        const n = messages.length;

        const context = session.context.slice();

        if (
          session.sendMemory &&
          session.memoryPrompt &&
          session.memoryPrompt.length > 0
        ) {
          const memoryPrompt = get().getMemoryPrompt();
          context.push(memoryPrompt);
        }

        const recentMessages = context.concat(
          messages.slice(Math.max(0, n - config.historyMessageCount)),
        );

        return recentMessages;
      },

      updateMessage(
        sessionIndex: number,
        messageIndex: number,
        updater: (message?: Message) => void,
      ) {
        const sessions = get().sessions;
        const session = sessions.at(sessionIndex);
        const messages = session?.messages;
        updater(messages?.at(messageIndex));
        set(() => ({ sessions }));
      },

      resetSession() {
        get().updateCurrentSession((session) => {
          session.messages = [];
          session.memoryPrompt = "";
        });
      },

      summarizeSession() {
        const session = get().currentSession();

        // should summarize topic after chating more than 50 words
        const SUMMARIZE_MIN_LEN = 50;
        if (
          session.topic === DEFAULT_TOPIC &&
          countMessages(session.messages) >= SUMMARIZE_MIN_LEN
        ) {
          requestWithPrompt(session.messages, Locale.Store.Prompt.Topic).then(
            (res) => {
              get().updateCurrentSession(
                (session) =>
                  (session.topic = res ? trimTopic(res) : DEFAULT_TOPIC),
              );
            },
          );
        }

        const config = get().config;
        let toBeSummarizedMsgs = session.messages.slice(
          session.lastSummarizeIndex,
        );

        const historyMsgLength = countMessages(toBeSummarizedMsgs);

        if (historyMsgLength > get().config?.modelConfig?.max_tokens ?? 4000) {
          const n = toBeSummarizedMsgs.length;
          toBeSummarizedMsgs = toBeSummarizedMsgs.slice(
            Math.max(0, n - config.historyMessageCount),
          );
        }

        // add memory prompt
        toBeSummarizedMsgs.unshift(get().getMemoryPrompt());

        const lastSummarizeIndex = session.messages.length;

        console.log(
          "[Chat History] ",
          toBeSummarizedMsgs,
          historyMsgLength,
          config.compressMessageLengthThreshold,
        );

        if (historyMsgLength > config.compressMessageLengthThreshold) {
          requestChatStream(
            toBeSummarizedMsgs.concat({
              role: "system",
              content: Locale.Store.Prompt.Summarize,
              date: "",
            }),
            {
              filterBot: false,
              onMessage(message, done) {
                session.memoryPrompt = message;
                if (done) {
                  console.log("[Memory] ", session.memoryPrompt);
                  session.lastSummarizeIndex = lastSummarizeIndex;
                }
              },
              onError(error) {
                console.error("[Summarize] ", error);
              },
            },
          );
        }
      },

      updateStat(message) {
        get().updateCurrentSession((session) => {
          session.stat.charCount += message.content.length;
          // TODO: should update chat count and word count
        });
      },

      updateCurrentSession(updater) {
        const sessions = get().sessions;
        const index = get().currentSessionIndex;
        updater(sessions[index]);
        set(() => ({ sessions }));
      },

      clearAllData() {
        if (confirm(Locale.Store.ConfirmClearAll)) {
          localStorage.clear();
          location.reload();
        }
      },
    }),
    {
      name: LOCAL_KEY,
      version: 1.2,
      migrate(persistedState, version) {
        const state = persistedState as ChatStore;

        if (version === 1) {
          state.sessions.forEach((s) => (s.context = []));
        }

        if (version < 1.2) {
          state.sessions.forEach((s) => (s.sendMemory = true));
        }

        return state;
      },
    },
  ),
);
