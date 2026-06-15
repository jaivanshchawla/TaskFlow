const isDev = process.env.NODE_ENV === "development";

export const logger = {
  info:  (module: string, msg: string, data?: object) => {
    if (isDev) console.log(`%c[TaskFlow:${module}]`, "color:#8b5cf6;font-weight:bold", msg, data ?? "");
  },
  warn:  (module: string, msg: string, data?: object) => {
    console.warn(`[TaskFlow:${module}]`, msg, data ?? "");
  },
  error: (module: string, msg: string, data?: object) => {
    console.error(`[TaskFlow:${module}]`, msg, data ?? "");
  },
  debug: (module: string, msg: string, data?: object) => {
    if (isDev) console.debug(`[TaskFlow:${module}]`, msg, data ?? "");
  },
};