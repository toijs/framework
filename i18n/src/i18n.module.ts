import type { Module } from "@toijs/modular";
import { Launcher } from "@toijs/modular";
import { METADATA_I18N } from "./constants";
import { i18n } from "./services";

/**
 * Attach the i18n singleton to launcher metadata so other modules can resolve it.
 */
export function I18nModule(launcher: Launcher): Module {
  const prepare = () => {
    launcher.metadata.define(METADATA_I18N, i18n);
  };

  return {
    name: "toijs.i18n",
    prepare,
  };
}
