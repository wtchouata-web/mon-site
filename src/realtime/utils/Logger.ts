/**
 * Structured Logging Engine for Real-Time Telemetry.
 * Tracks connection/disconnection logs, payload sizing, response latencies, IP metrics, and device formats.
 */
export class RealtimeLogger {
  private static formatLog(level: "INFO" | "WARN" | "ERROR", category: string, message: string, meta?: Record<string, any>): string {
    const timestamp = new Date().toISOString();
    const metaString = meta ? ` | Meta: ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] [${level}] [RT-${category}] ${message}${metaString}`;
  }

  public static info(category: string, message: string, meta?: Record<string, any>): void {
    console.log(this.formatLog("INFO", category, message, meta));
  }

  public static warn(category: string, message: string, meta?: Record<string, any>): void {
    console.warn(this.formatLog("WARN", category, message, meta));
  }

  public static error(category: string, message: string, error?: any, meta?: Record<string, any>): void {
    const errorMeta = error ? { ...meta, errorName: error.name, errorMessage: error.message, stack: error.stack } : meta;
    console.error(this.formatLog("ERROR", category, message, errorMeta));
  }

  /**
   * Profiles performance bottlenecks in event pipelines
   */
  public static profile(category: string, taskName: string, startTime: [number, number], meta?: Record<string, any>): void {
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const ms = seconds * 1000 + nanoseconds / 1000000;
    this.info(category, `Performance Profile: ${taskName} executed in ${ms.toFixed(3)}ms`, {
      ...meta,
      latencyMs: ms
    });
  }
}
