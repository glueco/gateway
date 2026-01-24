/**
 * Browser-safe logging utility for the demo app.
 *
 * Provides consistent, structured logging in the browser console.
 * Designed to be easy to read during development and debugging.
 */

// ============================================
// TYPES
// ============================================

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  [key: string]: unknown;
}

// ============================================
// CONFIGURATION
// ============================================

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Check if we're in debug mode
const isDebug =
  typeof window !== "undefined" &&
  (window.localStorage.getItem("debug") === "true" ||
    new URLSearchParams(window.location.search).has("debug"));

const minLevel = isDebug ? LOG_LEVELS.debug : LOG_LEVELS.info;

// ============================================
// LOGGER
// ============================================

class BrowserLogger {
  private namespace: string;

  constructor(namespace: string = "app") {
    this.namespace = namespace;
  }

  /**
   * Create a child logger with a specific namespace
   */
  child(namespace: string): BrowserLogger {
    return new BrowserLogger(`${this.namespace}:${namespace}`);
  }

  /**
   * Log at debug level
   */
  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  /**
   * Log at info level
   */
  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  /**
   * Log at warn level
   */
  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  /**
   * Log at error level
   */
  error(message: string, context?: LogContext): void {
    this.log("error", message, context);
  }

  /**
   * Log an error with stack trace
   */
  errorWithStack(message: string, error: Error, context?: LogContext): void {
    this.log("error", message, {
      ...context,
      errorName: error.name,
      errorMessage: error.message,
    });
    console.error(error);
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (LOG_LEVELS[level] < minLevel) {
      return;
    }

    const styles: Record<LogLevel, string> = {
      debug: "color: gray",
      info: "color: #0ea5e9",
      warn: "color: #f59e0b",
      error: "color: #ef4444; font-weight: bold",
    };

    const prefix = `%c[${this.namespace}]`;
    const style = styles[level];

    if (context && Object.keys(context).length > 0) {
      console[level](prefix, style, message, context);
    } else {
      console[level](prefix, style, message);
    }
  }
}

// ============================================
// SINGLETON INSTANCES
// ============================================

export const logger = new BrowserLogger("proxy-check");

// Pre-configured loggers for common areas
export const connectLogger = logger.child("connect");
export const requestLogger = logger.child("request");
export const sessionLogger = logger.child("session");

// ============================================
// CONVENIENCE EXPORTS
// ============================================

export default logger;

/**
 * Enable debug logging by setting localStorage
 */
export function enableDebugLogging(): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("debug", "true");
    console.info("Debug logging enabled. Refresh the page to see debug logs.");
  }
}

/**
 * Disable debug logging
 */
export function disableDebugLogging(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("debug");
    console.info("Debug logging disabled. Refresh the page to apply changes.");
  }
}
