import { SubmitKey } from "../store/app";
import type { LocaleType } from "./index";

const en: LocaleType = {
  WIP: "WIP...",
  Error: {
    NoAccess: "现在是未授权状态，请点击左下角设置按钮输入访问密码。",
    NoQyLogin: "企业微信未授权，请点击左下角设置按钮进行企业微信授权。",
  },
  ChatItem: {
    ChatItemCount: (count: number) => `${count} messages`,
  },
  Chat: {
    SubTitle: (count: number) => `${count} messages with ChatGPT`,
    Actions: {
      ChatList: "Go To Chat List",
      CompressedHistory: "Compressed History Memory Prompt",
      Export: "Export All Messages as Markdown",
      Copy: "Copy",
      Stop: "Stop",
      Retry: "Retry",
    },
    Rename: "Rename Chat",
    Typing: "Typing…",
    Input: (submitKey: string) => {
      var inputHints = `${submitKey} to send`;
      if (submitKey === String(SubmitKey.Enter)) {
        inputHints += ", Shift + Enter to wrap";
      }
      return inputHints + ", / to search prompts";
    },
    Send: "Send",
  },
  Export: {
    Title: "All Messages",
    Copy: "Copy All",
    Download: "Download",
    MessageFromYou: "Message From You",
    MessageFromChatGPT: "Message From ChatGPT",
  },
  Memory: {
    Title: "Memory Prompt",
    EmptyContent: "Nothing yet.",
    Send: "Send Memory",
    Copy: "Copy Memory",
    Reset: "Reset Session",
    ResetConfirm:
      "Resetting will clear the current conversation history and historical memory. Are you sure you want to reset?",
  },
  Home: {
    NewChat: "New Chat",
    DeleteChat: "Confirm to delete the selected conversation?",
    DeleteToast: "Chat Deleted",
    Revert: "Revert",
  },
  Settings: {
    Title: "Settings",
    SubTitle: "All Settings",
    Actions: {
      ClearAll: "Clear All Data",
      ResetAll: "Reset All Settings",
      Close: "Close",
      ConfirmResetAll: {
        Confirm: "Are you sure you want to reset all configurations?",
      },
      ConfirmClearAll: {
        Confirm: "Are you sure you want to reset all chat?",
      },
    },
    Lang: {
      Name: "Language", // ATTENTION: if you wanna add a new translation, please do not translate this value, leave it as `Language`
      Options: {
        cn: "简体中文",
        en: "English",
        tw: "繁體中文",
        es: "Español",
        it: "Italiano",
        tr: "Türkçe",
        jp: "日本語",
      },
    },
    Avatar: "Avatar",
    FontSize: {
      Title: "Font Size",
      SubTitle: "Adjust font size of chat content",
    },
    Update: {
      Version: (x: string) => `Version: ${x}`,
      IsLatest: "Latest version",
      CheckUpdate: "Check Update",
      IsChecking: "Checking update...",
      FoundUpdate: (x: string) => `Found new version: ${x}`,
      GoToUpdate: "Update",
    },
    SendKey: "Send Key",
    Theme: "Theme",
    TightBorder: "Tight Border",
    SendPreviewBubble: "Send Preview Bubble",
    Prompt: {
      Disable: {
        Title: "Disable auto-completion",
        SubTitle: "Input / to trigger auto-completion",
      },
      List: "Prompt List",
      ListCount: (builtin: number, custom: number) =>
        `${builtin} built-in, ${custom} user-defined`,
      Edit: "Edit",
    },
    HistoryCount: {
      Title: "Attached Messages Count",
      SubTitle: "Number of sent messages attached per request",
    },
    CompressThreshold: {
      Title: "History Compression Threshold",
      SubTitle:
        "Will compress if uncompressed messages length exceeds the value",
    },
    Token: {
      Title: "API Key",
      SubTitle: "Use your key to ignore access code limit",
      Placeholder: "OpenAI API Key",
    },
    Usage: {
      Title: "Account Balance",
      SubTitle(used: any, total: any) {
        return `Used this month $${used}, subscription $${total}`;
      },
      IsChecking: "Checking...",
      Check: "Check Again",
      NoAccess: "Enter API Key to check balance",
    },
    AccessCode: {
      Title: "Access Code",
      SubTitle: "Access control enabled",
      Placeholder: "Need Access Code",
    },
    Model: "Model",
    Temperature: {
      Title: "Temperature",
      SubTitle: "A larger value makes the more random output",
    },
    MaxTokens: {
      Title: "Max Tokens",
      SubTitle: "Maximum length of input tokens and generated tokens",
    },
    PresencePenlty: {
      Title: "Presence Penalty",
      SubTitle:
        "A larger value increases the likelihood to talk about new topics",
    },
    Login: {
      Title: "企微授权",
      SubTitle: "点击右边的按钮后，扫码授权",
      Text: "授权",
    },
  },
  Store: {
    DefaultTopic: "New Conversation",
    BotHello: "Hello! How can I assist you today?",
    Error: "Something went wrong, please try again later.",
    Focus:
      "当前的工具是作为效率工具，请按照规范提问。\n 输入 / 触发补全查看使用目前支持的范式。\n 或者直接输入 fr空格，示： \n 输入【fr 定时调度】",
    Prompt: {
      History: (content: string) =>
        "This is a summary of the chat history between the AI and the user as a recap: " +
        content,
      Topic:
        "Please generate a four to five word title summarizing our conversation without any lead-in, punctuation, quotation marks, periods, symbols, or additional text. Remove enclosing quotation marks.",
      Summarize:
        "Summarize our discussion briefly in 200 words or less to use as a prompt for future context.",
    },
    ConfirmClearAll: "Confirm to clear all chat and setting data?",
  },
  Copy: {
    Success: "Copied to clipboard",
    Failed: "Copy failed, please grant permission to access clipboard",
  },
  Context: {
    Toast: (x: any) => `With ${x} contextual prompts`,
    Edit: "Contextual and Memory Prompts",
    Add: "Add One",
  },
};

export default en;
