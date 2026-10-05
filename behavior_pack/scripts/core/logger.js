/**
 * Lightweight logger that respects the DEBUG flag.
 * Avoids console spam in production builds.
 */

import { DEBUG } from "./constants.js";

const PREFIX = "[CivilCraft]";

export const Logger = {
  info(message, ...args) {
    if (DEBUG) {
      console.log(`${PREFIX} ${message}`, ...args);
    }
  },

  warn(message, ...args) {
    console.warn(`${PREFIX} ${message}`, ...args);
  },

  error(message, ...args) {
    console.error(`${PREFIX} ${message}`, ...args);
  },

  debug(message, ...args) {
    if (DEBUG) {
      console.log(`${PREFIX} [debug] ${message}`, ...args);
    }
  }
};
