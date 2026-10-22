/**
 * Self-check agregasi telemetri. Jalankan: npx tsx src/lib/telemetry.check.ts
 * Tidak diimpor aplikasi; hanya verifikasi manual.
 */
import assert from 'node:assert';
import { recordRouterCall, getModelStats, resetModelStats } from './telemetry';

resetModelStats();

recordRouterCall({ model: 'a', latencyMs: 100, promptTokens: 10, completionTokens: 20 });
recordRouterCall({ model: 'a', latencyMs: 300, promptTokens: 5, completionTokens: 5 });
recordRouterCall({ model: 'b', latencyMs: 50, error: 'boom' });

const stats = getModelStats();
assert.strictEqual(stats.length, 2, 'dua model tercatat');
assert.strictEqual(stats[0].model, 'a', 'diurutkan turun berdasarkan calls');

const a = stats.find((s) => s.model === 'a')!;
assert.strictEqual(a.calls, 2);
assert.strictEqual(a.errors, 0);
assert.strictEqual(a.tokensIn, 15);
assert.strictEqual(a.tokensOut, 25);
assert.strictEqual(a.totalLatencyMs, 400);
assert.strictEqual(a.lastLatencyMs, 300);

const b = stats.find((s) => s.model === 'b')!;
assert.strictEqual(b.calls, 1);
assert.strictEqual(b.errors, 1);
assert.strictEqual(b.lastError, 'boom');

resetModelStats();
assert.strictEqual(getModelStats().length, 0, 'reset mengosongkan store');

console.log('telemetry.check: OK');
