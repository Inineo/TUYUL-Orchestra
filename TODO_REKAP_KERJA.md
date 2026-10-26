# 📋 Kibi Orchestra AI Office - Status & Rencana Kerja

**Tanggal Terakhir Update:** 22 Oktober 2026  
**Status Build:** ✅ Sukses (`npm run build` 0 error)  
**Status Repo:** Clean (GitHub Issues #1–#25 CLOSED, 0 open)

---

## ✅ 1. Rekap Fitur Selesai (Phase 1 & Phase 2)

### A. Arsitektur Role & Agent Baru
1. **AI Research Specialist (Dr. Aris Thorne)**:
   - Agent riset mandiri (Authority 5) terintegrasi ke Orchestra Pod.
   - Bertugas mencari konteks dan SOP di Obsidian Vault untuk memangkas konsumsi token PM.
2. **Spesialisasi QA & Integrasi Strix Scanner**:
   - Integrasi autonomous security & bug scanner via [backend/services/qa_strix.py](file:///e:/Web/Kibi-Orchestra-V3/backend/services/qa_strix.py) & endpoint `/api/qa/strix-scan`.
   - Sinkronisasi dinamis model AI QA ke gateway 9Router.
3. **Pemisahan Role QA & Intern**:
   - Role mandiri di TypeScript, UI settings, dan initial data.
   - Dispatcher ketat di [src/stores/useOfficeStore.ts](file:///e:/Web/Kibi-Orchestra-V3/src/stores/useOfficeStore.ts) sesuai deskripsi role.

### B. Keamanan & Issue-Driven Development (IDD)
1. **Smart Sensitivity Gate ([backend/services/intern_safety.py](file:///e:/Web/Kibi-Orchestra-V3/backend/services/intern_safety.py))**:
   - Filter otomatis kata kunci sensitif (`.env`, `api_key`, `secret`, `token`, `password`, `credential`, `private_key`).
   - Mencegah kebocoran rahasia ke publik GitHub; task sensitif dialihkan ke Obsidian Vault.
2. **Integrasi GitHub CLI (`gh`)**:
   - Pembuatan issue otomatis dengan metadata lengkap (`assignees`, `labels`, `milestones`) tanpa signature/attribution noise.

### C. Orchestrator Backend & Obsidian Isolation
1. **Dekomposisi & Review Gate oleh PM**:
   - Endpoint `POST /api/missions/decompose` dan `POST /api/missions/review`.
   - Alur verifikasi kualitas terstruktur (Plan → Execute → Test → Review).
2. **Isolasi Folder Obsidian per Project**:
   - Folder terpisah (`plan/`, `conversation/`, `docs/`) dengan tag diskop per proyek guna menghindari kontaminasi Graph View.
3. **Token Optimization**:
   - Integrasi utilitas token compression di [backend/services/caveman.py](file:///e:/Web/Kibi-Orchestra-V3/backend/services/caveman.py).

---

## 🚧 2. Status Task Aktif (Phase 3: Scale)

### 🗓️ Selesai pada 15 - 16 Oktober 2026:
1. **Sinkronisasi Prisma Client & Database SQLite** (Issue #8):
   - Schema di [backend/prisma/schema.prisma](file:///e:/Web/Kibi-Orchestra-V3/backend/prisma/schema.prisma) (`Mission`, `Task`, `Agent`, `MissionReview`, `TaskArtifact`) telah digenerate dan tersinkronisasi.
2. **Agent Memory Retrieval & Persistence** (Issue #8):
   - Mekanisme penyimpanan riwayat pengerjaan dan ringkasan artefak ke database aktif.
3. **Parallel Subtask Execution (Concurrent Multi-Agent Engine)** (Issue #9):
   - Diimplementasikan di [src/stores/useOfficeStore.ts](file:///e:/Web/Kibi-Orchestra-V3/src/stores/useOfficeStore.ts).
   - Seluruh agent aktif maju serentak per tick (paralel), dispatcher membagikan semua task pending ke seluruh agent idle yang cocok peranannya.
4. **9Router Cost Prediction & Token Estimator** (Issue #9):
   - Diimplementasikan di [src/lib/aiClient.ts](file:///e:/Web/Kibi-Orchestra-V3/src/lib/aiClient.ts) dan [src/components/modals/CreateTaskModal.tsx](file:///e:/Web/Kibi-Orchestra-V3/src/components/modals/CreateTaskModal.tsx).
5. **Proxy Configuration & 9Router Streaming Resilience** (Issue #17 & Commit `cf95551`):
   - Proxy Vite di [vite.config.ts](file:///e:/Web/Kibi-Orchestra-V3/vite.config.ts) (`/api/backend`, `/api/missions`, `/api/qa`, `/api/intern`, `/api/obsidian`, `/api/9router`).
   - Handler chunk SSE / raw text fallback pada [backend/services/orchestrator.py](file:///e:/Web/Kibi-Orchestra-V3/backend/services/orchestrator.py).
6. **Automated Mission Branch & Promotion Gate** (Issue #19 & Commit `752841c`):
   - Isolasi branch kerja `intern/mission-<id>` via [backend/services/intern_safety.py](file:///e:/Web/Kibi-Orchestra-V3/backend/services/intern_safety.py).
   - Validasi clean tree sebelum merge dan proteksi push tanpa force ke `main`.
7. **Database Auto-Initialization on Startup** (Commit `4807512`):
   - Auto init SQLite tabel pada startup FastAPI event hook (`startup_db`) untuk mempermudah fork user.
8. **Geist Mono & Minimalist Design Unification** (Commit `80a3629`, `21870c1`, `ebcf396`):
   - Penyelarasan tipografi Geist Mono di seluruh modal, tab, dan kanban.
   - Perbaikan tabrakan sidebar dan penyempurnaan segmented control layout modal pembuatan task.
9. **Custom Workflow Templates Modal** (Issue #21):
   - Preset template 1-klik di [src/data/workflowTemplates.ts](file:///e:/Web/Kibi-Orchestra-V3/src/data/workflowTemplates.ts) dengan dukungan simpan template custom ke `localStorage`.

---

### 🌟 Selesai Dikerjakan Hari Ini (18 Oktober 2026):
10. **Git Branch & PR Lifecycle Automation** (Issue #22):
    - Menambahkan metode `create_pull_request` dengan Security Gate di [backend/services/intern_safety.py](file:///e:/Web/Kibi-Orchestra-V3/backend/services/intern_safety.py).
    - Endpoint FastAPI `POST /api/intern/missions/{mission_id}/create-pr` di [backend/main.py](file:///e:/Web/Kibi-Orchestra-V3/backend/main.py) serta auto-trigger saat PM review APPROVED.
    - Auto-dispatch PR via AI Intern saat Reviewer/QA menyelesaikan audit tiket di [src/stores/useOfficeStore.ts](file:///e:/Web/Kibi-Orchestra-V3/src/stores/useOfficeStore.ts).
    - Widget Git Branch & Link PR / tombol trigger manual di [src/components/modals/TaskDetailModal.tsx](file:///e:/Web/Kibi-Orchestra-V3/src/components/modals/TaskDetailModal.tsx).
11. **Hybrid Single-Ticket Dispatch & Direct Injection** (Issue #23):
    - Endpoint FastAPI `POST /api/tasks` di [backend/main.py](file:///e:/Web/Kibi-Orchestra-V3/backend/main.py) untuk pembuatan tugas instan membypass PM dekomposer (0 extra token PM).
    - Mendukung auto-inferensi role (misal: "html hello world" -> Frontend) dan explicit override tag (misal: `@backend: ...`).
    - Menyimpan dokumentasi arsitektur di Obsidian Vault: `antigravity/Kibi-Orchestra/docs/Hybrid-Single-Ticket-Dispatch-Architecture.md`.

12. **Real-Time Event Stream Bridge (SSE)** (Issue #24):
    - Implementasi `EventBroadcaster` Pub/Sub dan streaming endpoint `GET /api/events/stream` via FastAPI `StreamingResponse` di [backend/main.py](file:///e:/Web/Kibi-Orchestra-V3/backend/main.py).
    - Auto-broadcast event real-time saat task dibuat (`task_created`), status diperbarui (`task_status_updated`), task diselesaikan (`task_completed`), dan PR dibuat (`pr_created`).
    - Listener `EventSource` dengan auto-reconnect di [src/stores/useOfficeStore.ts](file:///e:/Web/Kibi-Orchestra-V3/src/stores/useOfficeStore.ts) dan di-mount di [src/App.tsx](file:///e:/Web/Kibi-Orchestra-V3/src/App.tsx).
    - Status badge live indicator (`SSE LIVE` / `OFFLINE`) di header [src/components/layout/ShadcnLayout.tsx](file:///e:/Web/Kibi-Orchestra-V3/src/components/layout/ShadcnLayout.tsx).
    - Konfigurasi proxy `/api/events` di [vite.config.ts](file:///e:/Web/Kibi-Orchestra-V3/vite.config.ts).
13. **Pembersihan Role Non-Fungsional (Streamlining Workforce)** (Commit `8d2808f`):
    - Audit fungsi peran agen di [src/types/office.ts](file:///e:/Web/Kibi-Orchestra-V3/src/types/office.ts) dan [src/data/initialData.ts](file:///e:/Web/Kibi-Orchestra-V3/src/data/initialData.ts).
    - Menghapus 6 role non-fungsional/placeholder (`architect`, `strategist`, `developer`, `devops`, `planner`, `security`).
    - Menyisakan 7 role fungsional murni terintegrasi: `product_manager`, `researcher`, `frontend`, `backend`, `qa`, `intern`, `reviewer`.
14. **Searchable Model Picker Palette Modal** (Issue #25 / Commit `78f3f0c`):
    - Mengganti dropdown `<select>` statis dengan Spotlight Command Palette modal interaktif di [src/components/simple/AgentSettingsTab.tsx](file:///e:/Web/Kibi-Orchestra-V3/src/components/simple/AgentSettingsTab.tsx).
    - Pencarian real-time (instant keyword filtering) mencakup ID model, provider badge, dan deskripsi alias rekomendasi.
    - Menggabungkan preset alias cerdas (`Daily`, `Architect`, `Coding_Specialist`, dll.) dengan 118+ model dinamis live dari 9Router Gateway.
    - Fallback custom model selector untuk mengetik string custom apa pun dengan 1 klik.
15. **Audit Konektivitas & Investigasi Token Failover 9Router**:
    - Verifikasi proses daemon 9Router aktif (`PID 10768`, Port `20128`, 118 model online).
    - Identifikasi perilaku rotasi akun per-provider di SQLite 9Router: verifikasi bahwa mode default 9Router menggunakan prioritas berurutan (habiskan 1 akun dulu baru failover ke akun berikutnya jika kuota akun cadangan masih tersedia).

---

### 🌟 Selesai Dikerjakan Hari Ini (22 Oktober 2026):
16. **Observability & Health Monitoring Telemetry**:
    - Endpoint `/api/health` kini benar-benar mem-ping `9Router /v1/models` (bukan asumsi statis) dan mengembalikan `gateway_ok`, `gateway_latency_ms`, serta `uptime_seconds` di [backend/main.py](file:///e:/Web/Kibi-Orchestra-V3/backend/main.py#L138-L162).
    - Event telemetri tersimpan lintas sesi pada SQLite `telemetry_events` melalui `POST /api/telemetry/events`; endpoint `GET /api/telemetry/summary` menyajikan agregasi per model untuk rentang waktu yang dipilih.
    - Instrumentasi [src/lib/aiClient.ts](file:///e:/Web/Kibi-Orchestra-V3/src/lib/aiClient.ts#L147-L168) memakai `usage` asli dari respons 9Router, bukan estimasi panjang karakter.
    - Tab sidebar **Telemetri** dengan layout dashboard penuh: kartu gateway, metrik workforce, strip token/biaya, tabel per-model, pilihan tren 1j/24j/7h/30h, serta purge dengan konfirmasi di [src/components/panels/StatsPanel.tsx](file:///e:/Web/Kibi-Orchestra-V3/src/components/panels/StatsPanel.tsx).
    - `StatsPanel` yang sebelumnya dead code (tidak pernah di-import) kini dipakai sebagai halaman tab telemetri.
    - Status SSE dan status gateway dipisah, sehingga gateway mati tidak lagi tersembunyi di balik badge `SSE LIVE` hijau.
    - Self-check [src/lib/telemetry.check.ts](file:///e:/Web/Kibi-Orchestra-V3/src/lib/telemetry.check.ts) menguji event persisten tanpa menghapus riwayat pengguna; jalankan `npx tsx src/lib/telemetry.check.ts` saat backend aktif.
    - README diperbarui: role list diselaraskan dengan 7 role aktual (bukan role lama yang sudah dihapus di commit `8d2808f`), daftar endpoint API diganti dengan route nyata, port dev dikoreksi ke `3000`, roadmap Phase 3 ditandai selesai.

---

## 🎯 3. Backlog Task Berikutnya yang Siap Dikerjakan

- [ ] **Interactive Onboarding / Installation Setup Wizard**:
  - Skrip instalasi interaktif awal (`python scripts/setup.py` / CLI wizard) untuk mendeteksi atau mengonfigurasi direktori Obsidian Vault user, setup API key gateway, dan otomatis membuat `.env`.
- [x] **Persistent Telemetry History**:
  - Event panggilan model disimpan di SQLite `telemetry_events` melalui `POST /api/telemetry/events`; index waktu dan model mendukung agregasi lintas sesi.
  - Dashboard [StatsPanel.tsx](file:///e:/Web/Kibi-Orchestra-V3/src/components/panels/StatsPanel.tsx) memuat tren 1j/24j/7h/30h dari `GET /api/telemetry/summary`, serta menyediakan purge dengan konfirmasi.
  - Validasi request membatasi ukuran field; self-check [telemetry.check.ts](file:///e:/Web/Kibi-Orchestra-V3/src/lib/telemetry.check.ts) menguji kenaikan event tanpa menghapus riwayat pengguna.
- [x] **Bersihkan Error TypeScript Lama** (Issue #28):
  - `npx tsc --noEmit` lolos 0 error. Menghapus sisa perbandingan terhadap role legacy (`developer`, `tester`, `devops`) di [src/components/simple/AgentSettingsTab.tsx](file:///e:/Web/Kibi-Orchestra-V3/src/components/simple/AgentSettingsTab.tsx) dan [src/stores/useOfficeStore.ts](file:///e:/Web/Kibi-Orchestra-V3/src/stores/useOfficeStore.ts).

---

*Catatan: Dokumen ini diperbarui per 22 Oktober 2026. Hardcoded Obsidian path telah dipindahkan ke `.env` dan fallback cross-platform aman (`~/Documents/Obsidian`).*
