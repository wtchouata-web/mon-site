import { OpenTelemetryMetric } from "../types/index.js";

export interface IMonitoringService {
  /**
   * Records a counter event (e.g. socket_connections_total)
   */
  recordCounter(name: string, value?: number, tags?: Record<string, string>): void;

  /**
   * Records a gauge event (e.g. active_websocket_users)
   */
  recordGauge(name: string, value: number, tags?: Record<string, string>): void;

  /**
   * Records execution latency histogram metrics
   */
  recordLatency(name: string, durationMs: number, tags?: Record<string, string>): void;

  /**
   * Publishes accumulated metrics to Prometheus/OpenTelemetry agents
   */
  publishMetrics(): Promise<OpenTelemetryMetric[]>;
}
