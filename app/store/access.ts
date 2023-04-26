import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uuid } from "uuidv4";
import { v4 } from "uuid";
import { cookies } from "next/headers";

export interface AccessControlStore {
  token: string;
  updateToken: (_: string) => void;

  username: string;
  updateUserName: (_: string) => void;
  needQyWxLogin: boolean;
  enableQyWxLogin: () => boolean;
  isQyWxControl: () => boolean;

  needCode: boolean;
  accessCode: string;
  updateCode: (_: string) => void;
  enabledAccessControl: () => boolean;
  isAccessControl: () => boolean;

  fetch: () => void;
}

export const ACCESS_KEY = "access-control";

let fetchState = 0; // 0 not fetch, 1 fetching, 2 done

function getUserName(): string {
  // 获取所有 cookie
  const cookies = document.cookie;

  // 在 cookie 字符串中查找名为 "username" 的 cookie 值
  const cookieArr = cookies.split("; ");
  for (let i = 0; i < cookieArr.length; i++) {
    const [key, value] = cookieArr[i].split("=");
    if (key === "username") {
      return value;
    }
  }
  return "";
}

export const useAccessStore = create<AccessControlStore>()(
  persist(
    (set, get) => ({
      token: "",
      updateToken(token: string) {
        set((state) => ({ token }));
      },

      username: "",
      updateUserName(username: string) {
        set((state) => ({ username }));
      },
      needQyWxLogin: true,
      enableQyWxLogin() {
        get().fetch();
        return get().needQyWxLogin;
      },
      /**
       * 在控制中
       */
      isQyWxControl() {
        // 如果没开启，说明在控制中
        if (!this.enableQyWxLogin()) {
          return true;
        }
        let hasUsername = !!get().username;
        if (!hasUsername) {
          const username = getUserName();
          if (username) {
            this.updateUserName(username);
          }
        }
        hasUsername = !!get().username;
        // 如果有用户，说明在控制中
        return hasUsername;
      },

      accessCode: "",
      needCode: true,
      enabledAccessControl() {
        get().fetch();

        return get().needCode;
      },
      updateCode(code: string) {
        set((state) => ({ accessCode: code }));
      },
      isAccessControl() {
        // has token or has code or disabled access control
        return (
          !!get().token || !!get().accessCode || !get().enabledAccessControl()
        );
      },
      fetch() {
        if (fetchState > 0) return;
        fetchState = 1;
        fetch("/api/config", {
          method: "post",
          body: null,
        })
          .then((res) => res.json())
          .then((res: DangerConfig) => {
            console.log("[Config] got config from server", res);
            set(() => ({ ...res }));
          })
          .catch(() => {
            console.error("[Config] failed to fetch config");
          })
          .finally(() => {
            fetchState = 2;
          });
      },
    }),
    {
      name: ACCESS_KEY,
      version: 1,
    },
  ),
);
