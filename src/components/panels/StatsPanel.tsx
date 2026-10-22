import React, { useEffect, useState, useCallback } from 'react';
import { useOfficeStore } from '../../stores/useOfficeStore';
import { fetchTelemetrySummary, purgeTelemetry, ModelSummary } from '../../lib/telemetry';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  Clock,
  Cpu,
  DollarSign,
  RefreshCw,
  TrendingUp,
  Trash2,
} from 'lucide-react';

interface GatewayHealth {
  ok: boolean;
  latencyMs: number | null;
  uptimeSeconds: number | null;
  error?: string;
}

const HEALTH_POLL_MS = 10_000;

const formatDuration = (secs: number) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}j ${m}m`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
};

export const StatsPanel: React.FC = () => {
  const { getStats, isLiveConnected } = useOfficeStore();
  const stats = getStats();

  const [modelStats, setModelStats] = useState<ModelSummary[]>([]);
  const [health, setHealth] = useState<GatewayHealth>({ ok: false, latencyMs: null, uptimeSeconds: null });
  const [checking, setChecking] = useState(false);
  const [windowHours, setWindowHours] = useState(24);

  const refresh = useCallback(async () => {
    setChecking(true);
    try {
      const [summary, res] = await Promise.all([
        fetchTelemetrySummary(windowHours),
        fetch('/api/backend/health'),
      ]);
      setModelStats(summary?.models ?? []);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setHealth({
        ok: Boolean(json.gateway_ok),
        latencyMs: json.gateway_latency_ms ?? null,
        uptimeSeconds: json.uptime_seconds ?? null,
      });
    } catch (err) {
      setHealth({
        ok: false,
        latencyMs: null,
        uptimeSeconds: null,
        error: err instanceof Error ? err.message : 'backend unreachable',
      });
    } finally {
      setChecking(false);
    }
  }, [windowHours]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, HEALTH_POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const totalCalls = modelStats.reduce((acc, m) => acc + m.calls, 0);
  const totalErrors = modelStats.reduce((acc, m) => acc + m.errors, 0);
  const totalTokens = modelStats.reduce((acc, m) => acc + m.tokens_in + m.tokens_out, 0);
  const avgLatency = totalCalls > 0
    ? Math.round(modelStats.reduce((acc, m) => acc + m.avg_latency_ms * m.calls, 0) / totalCalls)
    : 0;

  const summaryCards = [
    {
      label: '9Router Gateway',
      value: health.ok ? 'ONLINE' : 'DOWN',
      sub: health.latencyMs !== null ? `${health.latencyMs} ms` : 'tidak terjangkau',
      icon: Activity,
      accent: health.ok ? 'text-emerald-300' : 'text-rose-300',
    },
    {
      label: 'Uptime Backend',
      value: health.uptimeSeconds !== null ? formatDuration(Math.round(health.uptimeSeconds)) : '—',
      sub: isLiveConnected ? 'SSE streaming' : 'SSE offline',
      icon: Clock,
      accent: 'text-zinc-100',
    },
    {
      label: 'Model Calls',
      value: totalCalls.toLocaleString(),
      sub: totalErrors > 0 ? `${totalErrors} gagal` : '0 gagal',
      icon: BarChart3,
      accent: totalErrors > 0 ? 'text-amber-300' : 'text-zinc-100',
    },
    {
      label: 'Avg Latency',
      value: totalCalls > 0 ? `${avgLatency} ms` : '—',
      sub: `${(totalTokens / 1000).toFixed(1)}k token`,
      icon: TrendingUp,
      accent: avgLatency > 3000 ? 'text-amber-300' : 'text-zinc-100',
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4 font-mono text-xs">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200 shrink-0">
            <Activity className="w-4 h-4 text-zinc-300" />
          </div>
          <div>
            <h2 className="font-semibold text-xs tracking-wide text-zinc-100 uppercase">
              Telemetri Sistem • Gateway &amp; Model Health
            </h2>
            <p className="mt-0.5 font-mono text-[11px] text-zinc-400">
              Status konektivitas 9Router, latensi per model, dan konsumsi token aktual. Riwayat tersimpan di SQLite.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-zinc-700 bg-zinc-900 p-1">
            {[
              { hours: 1, label: '1j' },
              { hours: 24, label: '24j' },
              { hours: 168, label: '7h' },
              { hours: 720, label: '30h' },
            ].map((opt) => (
              <button
                key={opt.hours}
                onClick={() => setWindowHours(opt.hours)}
                className={`h-7 rounded-lg px-2.5 font-mono text-[11px] font-medium transition cursor-pointer ${
                  windowHours === opt.hours
                    ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                    : 'bg-zinc-950 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={refresh}
            disabled={checking}
            className="h-9 px-3 flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50 transition cursor-pointer"
            title="Muat ulang data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            <span className="text-[11px] font-medium">Periksa</span>
          </button>

          <button
            onClick={async () => {
              if (!window.confirm('Hapus seluruh riwayat telemetri? Tindakan ini tidak bisa dibatalkan.')) return;
              await purgeTelemetry();
              refresh();
            }}
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-rose-300 transition cursor-pointer"
            title="Hapus seluruh riwayat telemetri"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-400">
                <Icon className="w-3.5 h-3.5 text-zinc-500" />
                {card.label}
              </div>
              <div className={`mt-2 text-xl font-bold ${card.accent}`}>{card.value}</div>
              <div className="mt-1 text-[10px] text-zinc-500">{card.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Workforce Metrics (simulator) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Agen Aktif', value: `${stats.activeAgents} / ${stats.totalAgents}`, icon: Bot },
          { label: 'Tugas Selesai', value: `${stats.tasksDone} / ${stats.tasksTotal}`, icon: CheckCircle2 },
          { label: 'Success Rate', value: `${stats.successRate}%`, icon: TrendingUp },
          { label: 'Avg Task Time', value: formatDuration(stats.avgTimeSeconds), icon: Clock },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-400">
                <Icon className="w-3.5 h-3.5 text-zinc-500" />
                {item.label}
              </div>
              <div className="mt-2 text-xl font-bold text-zinc-100">{item.value}</div>
            </div>
          );
        })}
      </div>

      {/* Token & Cost strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
          <span className="flex items-center gap-2 text-[11px] text-zinc-400">
            <Cpu className="w-4 h-4 text-zinc-500" /> Token Diproses Agen
          </span>
          <span className="text-sm font-semibold text-zinc-100">
            {(stats.tokensProcessed / 1000).toFixed(1)}k
          </span>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
          <span className="flex items-center gap-2 text-[11px] text-zinc-400">
            <DollarSign className="w-4 h-4 text-zinc-500" /> Estimasi Biaya LLM
          </span>
          <span className="text-sm font-semibold text-zinc-100">
            ${stats.totalCostUsd.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Per-Model Table */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <span className="font-semibold text-[11px] uppercase tracking-wider text-zinc-100">
            Eksekusi Per Model
          </span>
          <span className="text-[10px] text-zinc-500">
            {modelStats.length} model tercatat
          </span>
        </div>

        {modelStats.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-xs italic">
            Belum ada data telemetri pada rentang {windowHours} jam terakhir.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-500">
                  <th className="px-4 py-2.5 font-medium">Model</th>
                  <th className="px-4 py-2.5 font-medium text-right">Calls</th>
                  <th className="px-4 py-2.5 font-medium text-right">Err</th>
                  <th className="px-4 py-2.5 font-medium text-right">Token In</th>
                  <th className="px-4 py-2.5 font-medium text-right">Token Out</th>
                  <th className="px-4 py-2.5 font-medium text-right">Avg Latency</th>
                  <th className="px-4 py-2.5 font-medium text-right">Terakhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {modelStats.map((m) => (
                  <tr key={m.model} className="hover:bg-zinc-900/40 transition">
                    <td className="px-4 py-3">
                      <div className="text-[11px] text-zinc-200 truncate max-w-[22rem]" title={m.model}>
                        {m.model}
                      </div>
                      {m.last_error && (
                        <div className="mt-1 flex items-start gap-1 text-[10px] text-rose-400/80">
                          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                          <span className="truncate max-w-[22rem]" title={m.last_error}>
                            {m.last_error}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-[11px] text-zinc-200">{m.calls}</td>
                    <td className={`px-4 py-3 text-right text-[11px] ${m.errors > 0 ? 'text-rose-300' : 'text-zinc-500'}`}>
                      {m.errors}
                    </td>
                    <td className="px-4 py-3 text-right text-[11px] text-zinc-400">
                      {m.tokens_in.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-[11px] text-zinc-400">
                      {m.tokens_out.toLocaleString()}
                    </td>
                    <td className={`px-4 py-3 text-right text-[11px] ${m.avg_latency_ms > 3000 ? 'text-amber-300' : 'text-zinc-200'}`}>
                      {m.avg_latency_ms} ms
                    </td>
                    <td className="px-4 py-3 text-right text-[10px] text-zinc-500">
                      {new Date(m.last_seen + 'Z').toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {health.error && (
          <div className="px-4 py-2.5 border-t border-zinc-800 text-[10px] text-rose-400/80">
            Health check gagal: {health.error}
          </div>
        )}
      </div>
    </div>
  );
};
