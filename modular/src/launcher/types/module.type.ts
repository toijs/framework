import { Launcher } from "../services";

/**
 * A module that can be registered and started
 * @param name - The name of the module
 * @param prepare - The function to prepare the module
 * @param register - The function to register the module
 * @param ready - The function to ready the module
 */
export type Module = {
  name: string;
  dependencies?: ModuleFactory[];
  prepare?: () => void | Promise<void>;
  register?: () => void | Promise<void>;
  ready?: () => void | Promise<void>;
};

/**
 * A factory function that creates a module
 * @param launcher - The launcher instance
 * @returns The module instance
 */
export type ModuleFactory = (launcher: Launcher) => Module;

/**
 * The options for the start function
 * @typedef {Object} StartOptions
 * @param modules - The modules to start
 */
export type StartOptions = {
  modules: ModuleFactory[];
};
