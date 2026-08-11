import { Task, type TaskHandler } from "../../task";
import { EVENT_METADATA_CHANGED } from "../constants";
import type { MetadataListener, MetadataListenerResponse } from "../types";

export class Metadata {
  private store: Record<string, unknown> = {};

  constructor(private readonly task: Task) {}

  /**
   * Invoke a function
   * @param name - The name of the function
   * @param args - The arguments to pass to the function
   * @returns The result of the function
   */
  invoke(name: string, args: unknown[] = []) {
    const fn = this.resolve(name) || (() => {});
    return (fn as Function)(...args);
  }

  /**
   * Resolve a value
   * @param name - The name of the value
   * @returns The value
   */
  resolve(name: string) {
    return this.store[name];
  }

  /**
   * Define a value
   * @param name - The name of the value
   * @param value - The value
   * @param merge - Whether to merge the value with the existing value
   */
  define(name: string, value: unknown, merge: boolean = true) {
    if (merge) {
      if (Array.isArray(value)) {
        value = [...(this.store[name] || []) as unknown[], ...value];
      } else if (typeof value == "object") {
        value = {
          ...(this.store[name] || {}),
          ...value,
        };
      }
    }

    this.store[name] = value;
    this.notify(name, value);
  }

  /**
   * Subscribe to all metadata changes
   */
  subscribe(name: string | MetadataListener, listener?: MetadataListener) {
    // Common case: subscribe to all metadata changes
    if (typeof name === "function") {
      const handler = this.createHandler(name);
      this.task.subscribe(EVENT_METADATA_CHANGED, handler);
      name(this.store);
      
      return () => {
        this.task.unsubscribe(EVENT_METADATA_CHANGED, handler);
      };
    }

    // Special case: subscribe to a specific metadata change
    if (!listener) {
      return () => {};
    }

    // Create a handler for the listener
    const handler = this.createHandler(listener);
    const eventName = `event.metadata.changed.${name}`;

    this.task.subscribe(eventName, handler);
    
    // First notify the listener
    listener({ [name]: this.store[name] });

    return () => {
      this.task.unsubscribe(eventName, handler);
    };
  }

  /**
   * Create a handler for a metadata listener
   * @param listener - The listener to create a handler for
   * @returns The handler
   */
  private createHandler(listener: MetadataListener): TaskHandler {
    return (context) => {
      listener(context.data as MetadataListenerResponse);
    };
  }

  /**
   * Notify all listeners
   * @param name - The name of the value
   * @param value - The value
   */
  private notify(name: string, value: unknown) {
    const keyedResponse = { [name]: value } as MetadataListenerResponse;

    void this.task.invoke(`event.metadata.changed.${name}`, keyedResponse);
    void this.task.invoke(EVENT_METADATA_CHANGED, keyedResponse);
  }
}
