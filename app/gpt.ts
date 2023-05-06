export enum TaskResult {
  SUCCESS = 0,
  FAILED = 1,
}

/**
 * 任务执行策略
 */
export enum TaskStrategy {
  /**
   * 全部
   */
  ALL,

  /**
   * 链式执行, 遇到就返回
   */
  CHAIN,
}

export type Task = {
  title: string;

  query: string;
};
