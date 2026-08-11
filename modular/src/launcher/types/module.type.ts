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
  prepare?: () => void;
  register?: () => void;
  ready?: () => void;
};

/**
 * The options for the start function
 * @typedef {Object} StartOptions
 * @param modules - The modules to start
 */
export type StartOptions = {
  modules: ((launcher: Launcher) => Module)[];
};
