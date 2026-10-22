/**
 * Self-check end-to-end untuk telemetri persisten.
 * Butuh backend hidup di :8000. Jalankan: npx tsx src/lib/telemetry.check.ts
 */
import assert from 'node:assert';

const BASE = 'http://127.0.0.1:8000';

const post = async (body: Record<string, unknown>) => {
  const res = await fetch(`${BASE}/api/telemetry/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  assert.strictEqual(res.ok, true, `POST /api/telemetry/events gagal: ${res.status}`);
};

const summary = async (hours = 24) => {
  const res = await fetch(`${BASE}/api/telemetry/summary?hours=${hours}`);
  assert.strictEqual(res.ok, true, `GET summary gagal: ${res.status}`);
  return res.json();
};

const main = async () => {
  // Jangan hapus riwayat pengguna; bandingkan kenaikan counter dari event pemeriksaan ini.
  const before = await summary(24);
  const previousA = before.models.find((m: any) => m.model === 'check/model-a');
  const previousB = before.models.find((m: any) => m.model === 'check/model-b');

  await post({ model: 'check/model-a', latency_ms: 100, prompt_tokens: 10, completion_tokens: 20 });
  await post({ model: 'check/model-a', latency_ms: 300, prompt_tokens: 5, completion_tokens: 5 });
  await post({ model: 'check/model-b', latency_ms: 50, error: 'boom' });

  const data = await summary(24);
  const a = data.models.find((m: any) => m.model === 'check/model-a');
  const b = data.models.find((m: any) => m.model === 'check/model-b');

  assert.ok(a, 'model-a harus tercatat');
  assert.ok(b, 'model-b harus tercatat');
  assert.strictEqual(a.calls, (previousA?.calls ?? 0) + 2);
  assert.strictEqual(a.tokens_in, (previousA?.tokens_in ?? 0) + 15);
  assert.strictEqual(a.tokens_out, (previousA?.tokens_out ?? 0) + 25);
  assert.strictEqual(b.calls, (previousB?.calls ?? 0) + 1);
  assert.strictEqual(b.errors, (previousB?.errors ?? 0) + 1);
  assert.strictEqual(b.last_error, 'boom');
  assert.ok(data.overall.total_events >= before.overall.total_events + 3, 'overall harus menghitung event baru');

  console.log('telemetry.check: OK (persistent)');
};

main().catch((err) => {
  console.error('telemetry.check: FAILED —', err.message);
  console.error('Pastikan backend hidup: cd backend && python main.py');
  process.exit(1);
});
