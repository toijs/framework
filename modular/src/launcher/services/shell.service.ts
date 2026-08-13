import { Metadata } from "../../metadata";
import { Task, TaskContext } from "../../task";
import { TASK_ROOT_READY, TASK_ROOT_REGISTER } from "../constants";

export class Shell {
  private instance: unknown;

  constructor(private readonly task: Task, private readonly metadata: Metadata) {}

  /**
   * Get the app instance
   * @returns The app instance
   */
  getInstance() {
    return this.instance;
  }
  
  /**
   * Subscribe to the app create event
   * @param callback - The callback to subscribe to the app create event
   */
  async create(callback: () => unknown) {
    const instance = await callback();
    this.instance = instance;
    await this.task.invoke(TASK_ROOT_REGISTER, instance);
    await this.task.invoke(TASK_ROOT_READY, instance);
  }

  /**
   * Subscribe to the app instance event
   * @param callback - The callback to subscribe to the app instance event
   */
  register(callback: (context: TaskContext) => void) {
    return this.task.subscribe(TASK_ROOT_REGISTER, callback);
  }

  /**
   * Subscribe to the app mounted event
   * @param callback - The callback to subscribe to the app mounted event
   */
  ready(callback: (context: TaskContext) => void) {
    return this.task.subscribe(TASK_ROOT_READY, callback);
  }
}
