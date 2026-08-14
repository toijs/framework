import { Module, ModuleFactory, StartOptions } from "../types";
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
  public options: StartOptions = {
    modules: [] as ModuleFactory[],
  } as StartOptions;
  public instances: Map<string, Module> = new Map();

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
   * Register a module
   * @param module - The module to register
   */
  modules(modules: ModuleFactory[]) {
    this.options.modules.push(...modules);
    return this;
  }

  /**
   * Resolve the module instances
   * @param modules - The modules to resolve
   * @returns The module instances
   */
  private async resolveModuleInstances(modules: ModuleFactory[], instances: Module[] = []) {
    for (const module of modules) {
      const moduleInstance = module(this);

      // If the module is already registered, skip it
      if (this.instances.has(moduleInstance.name) || !moduleInstance.name) {
        continue;
      }

      // Register the module instance
      this.instances.set(moduleInstance.name, moduleInstance);
      instances.push(moduleInstance);

      // Resolve the module instances
      if (moduleInstance.dependencies) {
        instances = await this.resolveModuleInstances(moduleInstance.dependencies, instances);
      }
    }

    return instances;
  }

  /**
   * Start the application
   */
  async start() {
    if (this.options.modules.length === 0) {
      throw new Error("No modules registered");
    }

    let instances: Module[] = await this.resolveModuleInstances(this.options.modules);

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
