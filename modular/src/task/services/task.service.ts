import type { TaskContext, TaskHandler, TaskInvokeType } from "../types";

export class Task {
  private handlers: Record<string, TaskHandler[]> = {};

  /**
   * Subscribe to a task
   */
  subscribe(name: string, fn: TaskHandler) {
    if (!this.handlers[name]) {
      this.handlers[name] = [];
    }

    this.handlers[name].push(fn);

    return () => {
      this.unsubscribe(name, fn);
    };
  }

  /**
   * Unsubscribe from a task
   */
  unsubscribe(name: string, fn: unknown) {
    const tasks = this.handlers[name];
    if (!tasks) return;

    const index = tasks.indexOf(fn as TaskHandler);
    if (index > -1) {
      tasks.splice(index, 1);
    }
  }

  /**
   * Invoke a task sequentially
   */
  private async invokeSequential(name: string, data: unknown = null) {
    const tasks = this.handlers[name] || [];
    let rs: unknown = undefined;
    const max = tasks.length - 1;

    for (const [i, fn] of tasks.entries()) {
      const nrs = await fn({ data, result: rs, index: i, end: max === i } as TaskContext);
      if (nrs !== undefined) rs = nrs;
    }

    return rs;
  }

  /**
   * Invoke a task in parallel
   */
  private async invokeParallel(name: string, data: unknown = null) {
    const tasks = this.handlers[name] || [];
    return Promise.all(tasks.map(fn => fn({ data } as TaskContext)));
  }

  /**
   * Execute a task
   */
  async invoke(name: string, data: unknown = null, type: TaskInvokeType = 'sequential') {
    if (type === 'sequential') {
      return this.invokeSequential(name, data);
    }

    return this.invokeParallel(name, data);
  }
}
