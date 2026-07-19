import { IMonitoringService } from "../interfaces/IMonitoringService.js";
import { OpenTelemetryMetric } from "../types/index.js";

/**
 * High-performance System Telemetry.
 * Tracks active socket pools, latency charts, and event dispatches.
 */
export class MonitoringService implements IMonitoringService {
  private static instance: MonitoringService;
  private metricsMap = new Map<string, { value: number; type: "counter" | "gauge"; tags?: Record<string, string> }>();
  private latencies: { name: string; durationMs: number; timestamp: Date }[] = [];

  private constructor() {}

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  public recordCounter(name: string, value = 1, tags?: Record<string, string>): void {
    const key = this.buildMetricKey(name, tags);
    const existing = this.metricsMap.get(key) || { value: 0, type: "counter", tags };
    existing.value += value;
    this.metricsMap.set(key, existing);
  }

  public recordGauge(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.buildMetricKey(name, tags);
    this.metricsMap.set(key, { value, type: "gauge", tags });
  }

  public recordLatency(name: string, durationMs: number, tags?: Record<string, string>): void {
    this.latencies.push({ name, durationMs, timestamp: new Date() });
    // Cap memory usage
    if (this.latencies.length > 5000) {
      this.latencies.shift();
    }
    // Increment telemetry counters
    this.recordCounter(`${name}_total_calls`, 1, tags);
  }

  public async publishMetrics(): Promise<OpenTelemetryMetric[]> {
    const list: OpenTelemetryMetric[] = [];
    const now = new Date();

    for (const [key, data] of this.metricsMap.entries()) {
      list.push({
        name: key.split("::")[0],
        value: data.value,
        tags: data.tags,
        timestamp: now
      });
    }

    return list;
  }

  private buildMetricKey(name: string, tags?: Record<string, string>): string {
    if (!tags) return name;
    const sortedTags = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(",");
    return `${name}::${sortedTags}`;
  }
}
