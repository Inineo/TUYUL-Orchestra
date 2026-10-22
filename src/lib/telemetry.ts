/**
 * Rekaman telemetri per-model dalam memori.
 * Ponytail: in-memory, hilang saat reload. Pindah ke backend/SQLite kalau butuh histori lintas sesi.
 */
export interface ModelStat {
  model: string;
  calls: number;
  errors: number;
  tokensIn: number;
  tokensOut: number;
  totalLatencyMs: number;
  lastLatencyMs: number;
  lastError?: string;
}

const stats = new Map<string, ModelStat>();
const MAX_MODELS = 100;

export function recordRouterCall(params: {
  model: string;
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
  error?: string;
}): void {
  const { model, latencyMs, promptTokens = 0, completionTokens = 0, error } = params;
  let entry = stats.get(model);
  if (!entry) {
    if (stats.size >= MAX_MODELS) return;
    entry = {
      model,
      calls: 0,
      errors: 0,
      tokensIn: 0,
      tokensOut: 0,
      totalLatencyMs: 0,
      lastLatencyMs: 0,
    };
    stats.set(model, entry);
  }
  entry.calls += 1;
  entry.totalLatencyMs += latencyMs;
  entry.lastLatencyMs = Math.round(latencyMs);
  entry.tokensIn += promptTokens;
  entry.tokensOut += completionTokens;
  if (error) {
    entry.errors += 1;
    entry.lastError = error.slice(0, 160);
  }
}

export function getModelStats(): ModelStat[] {
  return Array.from(stats.values()).sort((a, b) => b.calls - a.calls);
}

export function resetModelStats(): void {
  stats.clear();
}
