/**
 * Pengirim telemetri ke backend SQLite.
 * Ponytail: fire-and-forget, gagal kirim tidak boleh merusak alur task.
 * Riwayat dibaca lewat GET /api/backend/telemetry/summary.
 */
export interface TelemetryEvent {
  model: string;
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
  error?: string;
}

export interface ModelSummary {
  model: string;
  calls: number;
  errors: number;
  tokens_in: number;
  tokens_out: number;
  avg_latency_ms: number;
  last_seen: string;
  last_error: string | null;
}

export interface TelemetrySummary {
  window_hours: number;
  models: ModelSummary[];
  overall: {
    total_events: number;
    first_event: string | null;
    last_event: string | null;
  };
}

export function recordRouterCall(event: TelemetryEvent): void {
  void fetch('/api/backend/telemetry/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: event.model,
      latency_ms: Math.round(event.latencyMs),
      prompt_tokens: event.promptTokens ?? 0,
      completion_tokens: event.completionTokens ?? 0,
      error: event.error ?? null,
    }),
  }).catch((err) => {
    console.warn('Telemetry record failed:', err);
  });
}

export async function fetchTelemetrySummary(hours = 24): Promise<TelemetrySummary | null> {
  try {
    const res = await fetch(`/api/backend/telemetry/summary?hours=${hours}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Telemetry summary fetch failed:', err);
    return null;
  }
}

export async function purgeTelemetry(): Promise<boolean> {
  try {
    const res = await fetch('/api/backend/telemetry', { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    console.warn('Telemetry purge failed:', err);
    return false;
  }
}
