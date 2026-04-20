/**
 * @module Logger
 *
 * This module provides a centralized logging system for the application.
 * It wraps the loglevel library with additional features including:
 * - Multiple log levels (TRACE, DEBUG, INFO, WARN, ERROR)
 * - File-based logging with rotation
 * - In-memory log buffer for recent entries
 * - Event-based log subscription
 *
 * The logger is implemented as a singleton to provide consistent
 * logging behavior throughout the application.
 */

// External dependencies
import loglevel from "loglevel";
import * as fs from "fs";

/**
 * Structure of a log entry
 */
export interface ILogEntry {
  /** ISO-formatted timestamp string */
  Date: string;

  /** Unix timestamp in milliseconds */
  Timestamp: number;

  /** Log level index (0=TRACE through 4=ERROR) */
  LogLevel: number;

  /** The log message content */
  Message: string;
}

/** Function signature for log event subscribers */
type LogListener = (entry: ILogEntry) => void;

/**
 * Logger class providing enhanced logging capabilities
 */
export class Logger {
  /** String representations of log levels */
  private levels: string[] = ["TRACE", "DEBUG", "INFO", "WARN", "ERROR"];

  /** Path to log file if enabled */
  private filePath: string | undefined;

  /** Current line count in log file */
  private fileLength: number = 0;

  /** Maximum lines to keep in log file before rotation */
  private fileMaxLength: number = 500;

  /** In-memory buffer of recent log entries */
  private logBuffer: ILogEntry[] = [];

  /** Maximum entries to keep in memory buffer */
  private logBufferLength: number = 200;

  /** Subscriber callbacks for log events */
  private listeners: LogListener[] = [];

  /** Control flag to prevent recursive event emissions */
  private emitterEnabled = true;

  /**
   * Sets current log level
   */
  public setLevel(level: string) {
    loglevel.setLevel(level as loglevel.LogLevelDesc);
  }

  /**
   * Returns current log level
   */
  public getLevel(): number {
    return loglevel.getLevel();
  }

  /**
   * Sets length of log buffer
   */
  public setLogBufferLength(length: number) {
    this.logBufferLength = length;
  }

  /**
   * Get buffered log entries
   */
  public getLogBuffer(): ILogEntry[] {
    return this.logBuffer;
  }

  /**
   * Configures file-based logging
   *
   * @param filePath - Path where log file should be written
   * @param maxLength - Maximum number of lines to keep in the file
   */
  public setLogFile(filePath: string, maxLength: number = this.fileMaxLength) {
    try {
      // Create the file if it doesn't exist
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, " -- Server Log --\n", { flag: "wx" });
      }

      // Read existing content and determine length
      const content = fs.readFileSync(filePath, "utf-8");
      this.fileLength = content.split("\n").filter(Boolean).length;
      this.fileMaxLength = maxLength;
      this.filePath = filePath;

      const isoDate = new Date().toISOString().slice(0, 19) + "Z";
      loglevel.debug(
        `${isoDate}\tDEBUG\t[Logger] Logfile is ${filePath} length ${this.fileLength}/${this.fileMaxLength}`
      );
    } catch (e) {
      loglevel.error(`Error reading log file ${filePath}:`, e);
      return;
    }
  }

  /**
   * Registers a callback to receive log entry events
   */
  public addListener(listener: LogListener) {
    this.listeners.push(listener);
  }

  /**
   * Logs a trace level message
   */
  public trace(message: string, sender: string = "") {
    if (loglevel.getLevel() <= loglevel.levels.TRACE) {
      loglevel.trace(this.handle(message, 0, sender));
    }
  }

  /**
   * Logs a debug level message
   */
  public debug(message: string, sender: string = "") {
    if (loglevel.getLevel() <= loglevel.levels.DEBUG) {
      loglevel.debug(this.handle(message, 1, sender));
    }
  }

  /**
   * Logs an info level message
   */
  public info(message: string, sender: string = "") {
    if (loglevel.getLevel() <= loglevel.levels.INFO) {
      loglevel.info(this.handle(message, 2, sender));
    }
  }

  /**
   * Logs a warning level message
   */
  public warn(message: string, sender: string = "") {
    if (loglevel.getLevel() <= loglevel.levels.WARN) {
      loglevel.warn(this.handle(message, 3, sender));
    }
  }

  /**
   * Logs an error level message
   */
  public error(message: string, sender: string = "") {
    if (loglevel.getLevel() <= loglevel.levels.ERROR) {
      loglevel.error(this.handle(message, 4, sender));
    }
  }

  /**
   * Processes a log message, writing to file and buffer, then notifying listeners
   *
   * @param message - The message to log
   * @param level - Numeric log level (0-4)
   * @param sender - Optional source module name
   * @returns Formatted log string
   */
  private handle(message: string, level: number, sender: string = ""): string {
    const isoDate = new Date().toISOString().slice(0, 19) + "Z";
    const logString = `${isoDate}\t${this.levels[level]}\t${
      sender ? "[" + sender + "] " : ""
    }${message}\n`;

    // Write to log file if configured
    if (this.filePath) {
      try {
        fs.appendFileSync(this.filePath, logString);
        this.fileLength += message.toString().split("\n").length;

        // Rotate log file if it exceeds maximum length
        if (this.fileLength > this.fileMaxLength) {
          const content = fs.readFileSync(this.filePath || "", "utf-8");
          const lines = content.split("\n").slice(-this.fileMaxLength);
          fs.writeFileSync(this.filePath || "", lines.join("\n"));
        }
      } catch (e: Error | unknown) {
        if (e instanceof Error) {
          loglevel.error("Could not write to log file ", e.message);
        } else {
          loglevel.error("Could not write to log file ", JSON.stringify(e));
        }
      }
    }

    // Add to in-memory buffer if configured
    if (this.logBufferLength) {
      try {
        const logEntry: ILogEntry = {
          Date: isoDate,
          LogLevel: level,
          Message: message,
          Timestamp: Date.now(),
        };

        this.logBuffer.push(logEntry);
        this.logBuffer = this.logBuffer.slice(-this.logBufferLength);
        this.emitUpdate(logEntry);
      } catch (e: Error | unknown) {
        if (e instanceof Error) {
          loglevel.error("Could not write log to buffer ", e.message);
        } else {
          loglevel.error("Could not write log to buffer ", JSON.stringify(e));
        }
      }
    }

    return logString;
  }

  /**
   * Notifies all listeners of a new log entry
   * Uses a flag to prevent recursive emission
   */
  private emitUpdate(logEntry: ILogEntry) {
    if (!this.emitterEnabled) return;

    this.emitterEnabled = false;
    this.listeners.forEach((fn) => fn(logEntry));
    this.emitterEnabled = true;
  }
}

// Create and export a singleton instance of the logger
const log = new Logger();
export default log;
