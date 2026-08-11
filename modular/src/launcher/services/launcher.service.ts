import { Module, StartOptions } from "../types";
import { Container, type InjectionToken } from "../../di";
import { Metadata } from "../../metadata";
import { Task } from "../../task";
import { Config } from "../../config";
import { Shell } from "./shell.service";

export class Launcher {
  public task: Task;
  public metadata: Metadata;
  public container: Container;
  public shell: Shell;
  public config: Config;

  constructor() {
    this.container = new Container();
    this.task = new Task();
    this.metadata = new Metadata(this.task);
    this.config = new Config(this.metadata);
    this.shell = new Shell(this.task, this.metadata);
    this.container.register({
      provide: Launcher,
      useValue: this,
    });
    this.container.register({
      provide: Task,
      useValue: this.task,
    });
    this.container.register({
      provide: Metadata,
      useValue: this.metadata,
    });
    this.container.register({
      provide: Config,
      useValue: this.config,
    });
    this.container.register({
      provide: Shell,
      useValue: this.shell,
    });
  }

  /**
   * Attach a capability onto the launcher (and optionally register it in DI).
   * @param key - Property name on the launcher instance
   * @param value - Capability instance
   * @param token - Optional DI token (defaults to `key` as string token)
   */
  define<K extends string, V>(
    key: K,
    value: V,
    token?: InjectionToken<V>,
  ): this & Record<K, V> {
    if (key in this) {
      throw new Error(`Launcher: property "${key}" already exists`);
    }

    Object.defineProperty(this, key, {
      value,
      writable: false,
      enumerable: true,
      configurable: false,
    });

    this.container.register({
      provide: (token ?? key) as InjectionToken<V>,
      useValue: value,
    });

    return this as this & Record<K, V>;
  }

  /**
   * Start the application
   * @param options - The start options
   */
  async start(options: StartOptions) {
    const instances: Module[] = [];

    for (const module of options.modules) {
      const moduleInstance = module(this);
      instances.push(moduleInstance);
    }

    for (const instance of instances) {
      instance.prepare?.();
    }

    for (const instance of instances) {
      instance.register?.();
    }

    for (const instance of instances) {
      instance.ready?.();
    }
  }
}
