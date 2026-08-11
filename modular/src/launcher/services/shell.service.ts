import { Metadata } from "../../metadata";
import { Task, TaskContext } from "../../task";
import { METADATA_SHELL, TASK_ROOT_READY } from "../constants";

export class Shell {
  constructor(private readonly task: Task, private readonly metadata: Metadata) {}

  /**
   * Resolve the app instance
   * @returns The app instance
   */
  resolve() {
    return this.metadata.resolve(METADATA_SHELL);
  }

  /**
   * Subscribe to the app create event
   * @param callback - The callback to subscribe to the app create event
   */
  async create(callback: () => unknown) {
    const instance = await callback();
    this.metadata.define(METADATA_SHELL, instance);
    await this.task.invoke(TASK_ROOT_READY, instance);
  }

  /**
   * Subscribe to the app mounted event
   * @param callback - The callback to subscribe to the app mounted event
   */
  ready(callback: (context: TaskContext) => void) {
    return this.task.subscribe(TASK_ROOT_READY, callback);
  }
}
