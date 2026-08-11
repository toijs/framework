import { Metadata } from "../../metadata";
import { METADATA_CONFIG } from "../constants";

export class Config {
  constructor(private readonly metadata: Metadata) {}

  /**
   * Get the config. Supports nested access via dot notation,
   * including array indices (e.g. `servers.0.host`).
   * @param key - Optional path (dot-separated)
   * @returns The config value at the path, or the full config
   */
  resolve(key?: string | undefined) {
    const value = this.metadata.resolve(METADATA_CONFIG) || {};
    if (!key) {
      return value;
    }

    return key.split(".").reduce((current: unknown, segment) => {
      if (current == null || typeof current !== "object") {
        return undefined;
      }
      return (current as Record<string | number, unknown>)[segment];
    }, value as unknown);
  }

  /**
   * Set the config
   * @param config - The config
   */
  define(config: any) {
    this.metadata.define(METADATA_CONFIG, config, true);
  }
}
