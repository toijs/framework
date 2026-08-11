export type TaskContext = {
  data: unknown;
  result: unknown;
  index: number;
  end: boolean;
};

export type TaskHandler = (context: TaskContext) => unknown | Promise<unknown>;

export type TaskInvokeType = 'sequential' | 'parallel';
