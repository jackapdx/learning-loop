export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private format(level: string, message: string): string {
    return `[${new Date().toISOString()}] [${level}] [${this.context}] ${message}`;
  }

  info(message: string, data?: Record<string, unknown>) {
    if (data && Object.keys(data).length > 0) {
      console.log(this.format("INFO", message), data);
    } else {
      console.log(this.format("INFO", message));
    }
  }

  error(message: string, error?: unknown) {
    if (error) {
      console.error(this.format("ERROR", message), error);
    } else {
      console.error(this.format("ERROR", message));
    }
  }

  warn(message: string, data?: Record<string, unknown>) {
    if (data && Object.keys(data).length > 0) {
      console.warn(this.format("WARN", message), data);
    } else {
      console.warn(this.format("WARN", message));
    }
  }

  debug(message: string, data?: Record<string, unknown>) {
    if (data && Object.keys(data).length > 0) {
      console.debug(this.format("DEBUG", message), data);
    } else {
      console.debug(this.format("DEBUG", message));
    }
  }
}

export function createLogger(context: string) {
  return new Logger(context);
}
