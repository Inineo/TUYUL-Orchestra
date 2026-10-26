import os
import json
import asyncio
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Set, Annotated
from pathlib import Path

from config import OBSIDIAN_VAULT_PATH, NINEROUTER_URL
from services.obsidian import ObsidianService
from services.caveman import CavemanCompressor
from services.orchestrator import WorkflowOrchestrator
from services.intern_safety import InternGitSafetyService

class EventBroadcaster:
    """Pub/Sub SSE Broadcaster untuk streaming update agen & task ke UI secara real-time."""
    def __init__(self):
        self._subscribers: Set[asyncio.Queue] = set()

    def subscribe(self) -> asyncio.Queue:
        q = asyncio.Queue()
        self._subscribers.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        self._subscribers.discard(q)

    async def broadcast(self, event_type: str, data: Dict[str, Any]):
        payload = {
            "type": event_type,
            "data": data,
            "timestamp": datetime.now().strftime("%H:%M:%S")
        }
        for q in list(self._subscribers):
            try:
                await q.put(payload)
            except Exception:
                self._subscribers.discard(q)

    def broadcast_sync(self, event_type: str, data: Dict[str, Any]):
        """Versi synchronous untuk dipanggil dari route synchronous FastAPI."""
        payload = {
            "type": event_type,
            "data": data,
            "timestamp": datetime.now().strftime("%H:%M:%S")
        }
        for q in list(self._subscribers):
            try:
                q.put_nowait(payload)
            except Exception:
                pass

broadcaster = EventBroadcaster()

import time as _time
PROCESS_START_TS = _time.time()

app = FastAPI(
    title="TUYUL Orchestra — Task Unified Yield & Utility Layer",
    version="1.0.0",
    description="Autonomous Multi-Agent Orchestrator with SQLite, Obsidian Vault & Strix Security"
)

# Allow CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

obsidian_service = ObsidianService()
orchestrator = WorkflowOrchestrator()

@app.get("/api/events/stream")
async def event_stream_api(request: Request):
    """Server-Sent Events (SSE) live bridge endpoint untuk streaming event ke UI."""
    q = broadcaster.subscribe()

    async def event_generator():
        try:
            # Kirim welcome/handshake event
            yield f"event: connected\ndata: {json.dumps({'message': 'TUYUL Orchestra SSE Live Connected'})}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    payload = await asyncio.wait_for(q.get(), timeout=15.0)
                    yield f"event: {payload['type']}\ndata: {json.dumps(payload)}\n\n"
                except asyncio.TimeoutError:
                    # Keep-alive heartbeat comment
                    yield ": ping\n\n"
        finally:
            broadcaster.unsubscribe(q)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@app.on_event("startup")
def startup_db():
    """Pastikan tabel DB terbuat saat server start."""
    from services.database import Database
    Database.init_db()

# --- Request / Response Models ---
class DecomposeRequest(BaseModel):
    goal: str
    model: Optional[str] = None
    save_to_obsidian: bool = True

class SaveNoteRequest(BaseModel):
    filename: str
    content: str

class CreateProjectRequest(BaseModel):
    project_name: str
    description: Optional[str] = ""

class TelemetryEventRequest(BaseModel):
    model: Annotated[str, Field(min_length=1, max_length=200)]
    latency_ms: Annotated[float, Field(ge=0, le=300_000)] = 0
    prompt_tokens: Annotated[int, Field(ge=0, le=10_000_000)] = 0
    completion_tokens: Annotated[int, Field(ge=0, le=10_000_000)] = 0
    error: Optional[Annotated[str, Field(max_length=500)]] = None

class FeatureDocRequest(BaseModel):
    title: Annotated[str, Field(min_length=2, max_length=150)]
    summary: str
    functions_and_architecture: str
    best_practices: Optional[str] = ""
    project_name: Optional[str] = None
    author_role: Optional[str] = "Backend & Frontend"

class PostmortemRequest(BaseModel):
    title: Annotated[str, Field(min_length=2, max_length=150)]
    issue_or_error: str
    root_cause: str
    solution: str
    ai_learnings: str
    project_name: Optional[str] = None
    issue_ref: Optional[str] = None

# --- Endpoints ---
@app.get("/api/health")
def health_check():
    import time
    import requests as _requests

    gateway_ok = False
    gateway_latency_ms = None
    start = time.perf_counter()
    try:
        res = _requests.get(f"{NINEROUTER_URL}/v1/models", timeout=2)
        gateway_ok = res.ok
    except Exception:
        gateway_ok = False
    gateway_latency_ms = round((time.perf_counter() - start) * 1000, 1)

    return {
        "status": "healthy",
        "service": "kibi-orchestra-python-backend",
        "obsidian_vault": str(OBSIDIAN_VAULT_PATH),
        "obsidian_exists": OBSIDIAN_VAULT_PATH.exists(),
        "ninerouter_url": NINEROUTER_URL,
        "gateway_ok": gateway_ok,
        "gateway_latency_ms": gateway_latency_ms,
        "uptime_seconds": round(time.time() - PROCESS_START_TS, 1),
    }

@app.post("/api/telemetry/events")
def record_telemetry_api(req: TelemetryEventRequest):
    """Catat satu panggilan model ke SQLite agar riwayat bertahan lintas sesi."""
    from services.database import Database
    Database.record_telemetry(
        model=req.model,
        latency_ms=req.latency_ms,
        prompt_tokens=req.prompt_tokens,
        completion_tokens=req.completion_tokens,
        error=req.error,
    )
    return {"success": True}

@app.get("/api/telemetry/summary")
def telemetry_summary_api(hours: int = 24):
    """Agregat per model dalam N jam terakhir."""
    from services.database import Database
    return Database.get_telemetry_summary(hours=hours)

@app.delete("/api/telemetry")
def purge_telemetry_api(older_than_days: Optional[int] = None):
    """Hapus seluruh riwayat telemetri, atau hanya yang lebih lama dari N hari."""
    from services.database import Database
    deleted = Database.purge_telemetry(older_than_days=older_than_days)
    return {"success": True, "deleted": deleted}

@app.post("/api/projects/init")
def init_project_api(req: CreateProjectRequest):
    r"""
    Tugas Otomatis AI Intern:
    Membuat folder project baru di <OBSIDIAN_VAULT_PATH>/<project_name>
    lengkap dengan subfolder plan, conversation, docs, dan file Index Hub.
    """
    if not req.project_name.strip():
        raise HTTPException(status_code=400, detail="Project name cannot be empty")
    
    res = obsidian_service.initialize_project(
        project_name=req.project_name.strip(),
        description=req.description or ""
    )
    return {
        "success": True,
        "data": res
    }

@app.post("/api/missions/decompose")
def decompose_mission_api(req: DecomposeRequest):
    """
    Decompose mission with PM, compress token context with Caveman,
    dan otomatis membuat file catatan Markdown di Obsidian Vault (antigravity).
    """
    if not req.goal.strip():
        raise HTTPException(status_code=400, detail="Goal cannot be empty")

    result = orchestrator.decompose_mission(req.goal, model=req.model)

    import uuid
    mission_id = str(uuid.uuid4())[:8]

    # 1. Intern mengisolasi seluruh pekerjaan mission dari main sebelum agent mulai bekerja.
    intern_service = InternGitSafetyService(Path(__file__).resolve().parent.parent)
    branch_result = intern_service.start_mission_branch(mission_id)
    if not branch_result["success"]:
        raise HTTPException(status_code=409, detail=branch_result["message"])

    # 2. Simpan ke SQLite Database
    from services.database import Database
    Database.create_mission(
        mission_id=mission_id,
        title=f"Mission: {req.goal[:40]}...",
        goal=req.goal,
        requirements=[]
    )
    for idx, t in enumerate(result.get("tasks", [])):
        task_id = f"t-{mission_id}-{idx+1}"
        Database.create_task(
            task_id=task_id,
            mission_id=mission_id,
            title=t.get("title", ""),
            description=f"Estimated: {t.get('estimatedMinutes', 20)}m",
            assigned_to=f"agent-{t.get('assignedRole', 'backend')}",
            criteria=t.get("acceptanceCriteria", "")
        )

    # 2. Simpan ke Obsidian Vault
    saved_file = None
    if req.save_to_obsidian:
        saved_path = obsidian_service.save_mission_plan(
            mission_id=mission_id,
            goal=req.goal,
            pm_plan=result.get("plan", ""),
            tasks=result.get("tasks", [])
        )
        saved_file = str(saved_path)

    return {
        "success": True,
        "mission_id": mission_id,
        "branch": branch_result["branch"],
        "plan": result.get("plan", ""),
        "tasks": result.get("tasks", []),
        "obsidian_file": saved_file
    }

class MissionCommitRequest(BaseModel):
    summary: str

class MissionMergeRequest(BaseModel):
    confirmation: str

class MissionPRRequest(BaseModel):
    title: str
    summary: str
    issue_number: Optional[str] = None

@app.post("/api/intern/missions/{mission_id}/create-pr")
def create_mission_pr_api(mission_id: str, req: MissionPRRequest):
    """Intern otomatis membuat Pull Request untuk mission branch ke main."""
    intern_service = InternGitSafetyService(Path(__file__).resolve().parent.parent)
    result = intern_service.create_pull_request(
        mission_id=mission_id,
        title=req.title,
        summary=req.summary,
        issue_number=req.issue_number
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message", "Gagal membuat PR"))

    # Broadcast event ke SSE
    broadcaster.broadcast_sync("pr_created", {
        "mission_id": mission_id,
        "pr_url": result.get("pr_url"),
        "pr_number": result.get("pr_number"),
        "title": req.title
    })

    return result

@app.post("/api/intern/missions/{mission_id}/commit-and-push")
def commit_and_push_mission_api(mission_id: str, req: MissionCommitRequest):
    """Intern otomatis commit dan push hanya ke branch mission, bukan main."""
    intern_service = InternGitSafetyService(Path(__file__).resolve().parent.parent)
    result = intern_service.commit_and_push_mission(mission_id, req.summary)
    if not result["success"]:
        raise HTTPException(status_code=409, detail=result["message"])
    return result

@app.post("/api/intern/missions/{mission_id}/merge-to-main")
def merge_mission_to_main_api(mission_id: str, req: MissionMergeRequest):
    """Aksi eksplisit dari Antigravity untuk mempromosikan branch mission ke main."""
    if req.confirmation.strip().lower() != "merge to main":
        raise HTTPException(status_code=400, detail="Confirmation must be exactly: merge to main")
    intern_service = InternGitSafetyService(Path(__file__).resolve().parent.parent)
    result = intern_service.merge_mission_to_main(mission_id)
    if not result["success"]:
        raise HTTPException(status_code=409, detail=result["message"])
    return result

class PMReviewRequest(BaseModel):
    goal: str
    plan_summary: str
    completed_tasks: List[Dict[str, Any]]
    mission_id: Optional[str] = None
    model: Optional[str] = None

@app.post("/api/missions/review")
def review_mission_api(req: PMReviewRequest):
    """
    PM Quality Audit Gate: Menilai hasil kerja tim (Backend, Frontend, QA, Intern).
    """
    review_result = orchestrator.review_mission_by_pm(
        mission_goal=req.goal,
        plan_summary=req.plan_summary,
        completed_tasks=req.completed_tasks,
        model=req.model
    )
    
    git_result = None
    # Simpan review ke SQLite
    if req.mission_id:
        import uuid
        from services.database import Database
        Database.save_review(
            review_id=str(uuid.uuid4())[:8],
            mission_id=req.mission_id,
            reviewer_id="agent-pm",
            verdict=review_result.get("verdict", "APPROVED"),
            feedback=review_result.get("feedback", "")
        )
        # Update status mission jika lolos audit
        new_status = "completed" if review_result.get("verdict") == "APPROVED" else "needs_revision"
        Database.update_mission_status(req.mission_id, new_status)

        # 🧹 Hapus file plan markdown jika misi SUDAH APPROVED agar file tidak menumpuk di Obsidian
        if review_result.get("verdict") == "APPROVED":
            obsidian_service.delete_mission_plan(req.mission_id)
            intern_service = InternGitSafetyService(Path(__file__).resolve().parent.parent)
            git_result = intern_service.commit_and_push_mission(req.mission_id, req.goal)
            
            # Otomatis buat Pull Request setelah commit & push berhasil
            pr_result = None
            if git_result.get("success"):
                pr_result = intern_service.create_pull_request(
                    mission_id=req.mission_id,
                    title=req.goal,
                    summary=f"Automated PR for mission {req.mission_id}.\nFeedback PM: {review_result.get('feedback', 'Approved')}"
                )
            if pr_result:
                git_result["pr"] = pr_result

    return {
        "success": True,
        "review": review_result,
        "git": git_result
    }

class CreateIssueRequest(BaseModel):
    title: str
    body: str
    role: Optional[str] = "task"
    task_id: Optional[str] = None
    assignees: Optional[List[str]] = None
    milestone: Optional[str] = None
    project: Optional[str] = None

@app.post("/api/intern/github-issue")
def create_github_issue_api(req: CreateIssueRequest):
    """
    Tugas AI Intern: Membuat issue di GitHub dengan Security Gate dan Rich Metadata.
    """
    from services.intern_safety import InternGitSafetyService
    from pathlib import Path
    
    repo_root = Path(__file__).resolve().parent.parent
    intern_service = InternGitSafetyService(repo_root)
    
    res = intern_service.create_github_issue(
        title=req.title,
        body=req.body,
        labels=[req.role or "enhancement"],
        assignees=req.assignees,
        milestone=req.milestone,
        project=req.project
    )
    return res

@app.get("/api/intern/prs/{pr_number}/checks")
def get_pr_checks_api(pr_number: str):
    """
    Mengambil status pengujian CI/CD (GitHub Actions) untuk PR tertentu.
    Digunakan oleh dashboard Kibi Orchestra untuk menampilkan indikator hijau/merah.
    """
    from services.intern_safety import InternGitSafetyService
    from pathlib import Path
    
    repo_root = Path(__file__).resolve().parent.parent
    intern_service = InternGitSafetyService(repo_root)
    return intern_service.get_pr_checks(pr_number)

class MergePRRequest(BaseModel):
    merge_method: Optional[str] = "squash"

@app.post("/api/intern/prs/{pr_number}/merge")
def merge_pr_api(pr_number: str, req: Optional[MergePRRequest] = None):
    """
    Eksekusi merge PR ke main setelah disetujui (Approved) oleh User / Antigravity Interactive Gate.
    """
    from services.intern_safety import InternGitSafetyService
    from pathlib import Path
    
    repo_root = Path(__file__).resolve().parent.parent
    intern_service = InternGitSafetyService(repo_root)
    method = req.merge_method if req else "squash"
    res = intern_service.merge_pull_request(pr_number, merge_method=method)

    if res.get("success"):
        broadcaster.broadcast_sync("pr_merged", {
            "pr_number": pr_number,
            "message": f"PR #{pr_number} berhasil di-merge ke main."
        })

    return res

@app.post("/api/intern/generate-ci-workflow")
def generate_ci_workflow_api(overwrite: bool = False):
    """
    Tugas AI Intern: Membuat file .github/workflows/ci-cd.yml otomatis.
    """
    from services.intern_safety import InternGitSafetyService
    from pathlib import Path
    
    repo_root = Path(__file__).resolve().parent.parent
    intern_service = InternGitSafetyService(repo_root)
    res = intern_service.generate_ci_workflow(overwrite=overwrite)
    return res

class QAScanRequest(BaseModel):
    model: Optional[str] = None
    target_path: Optional[str] = None
    task_id: Optional[str] = None

@app.post("/api/qa/strix-scan")
def trigger_qa_strix_scan(req: QAScanRequest):
    """
    Tugas Agen QA (Maya Thorne): Menjalankan audit keamanan dan bug hunting
    menggunakan Strix Autonomous Security Agent dengan model yang aktif di 9Router.
    """
    from services.qa_strix import StrixQAService
    strix_service = StrixQAService()
    res = strix_service.run_security_scan(
        target_path=req.target_path,
        model=req.model
    )
    return res

@app.get("/api/obsidian/notes")
def list_obsidian_notes():
    """Melihat semua file markdown di folder project saat ini (plan, conversation, docs)."""
    notes = obsidian_service.list_notes()
    return {
        "project_path": str(obsidian_service.project_path),
        "total": len(notes),
        "notes": notes
    }

@app.get("/api/obsidian/notes/{filename:path}")
def get_obsidian_note(filename: str):
    """Membaca isi file markdown catatan tertentu."""
    content = obsidian_service.read_note(filename)
    if content is None:
        raise HTTPException(status_code=404, detail="File not found")
    return {"filename": filename, "content": content}

@app.post("/api/obsidian/notes")
def create_or_update_note(req: SaveNoteRequest):
    """Simpan catatan Markdown kustom ke folder docs."""
    file_path = obsidian_service.docs_path / req.filename
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(req.content)
    return {"success": True, "saved_path": str(file_path)}

@app.post("/api/docs/features")
def create_feature_doc_api(req: FeatureDocRequest):
    """
    Dokumentasi fitur baru (arsitektur function, metode, cara pakai)
    disimpan otomatis ke folder docs/features/ pada project target secara terisolasi.
    """
    saved_path = obsidian_service.save_feature_doc(
        title=req.title,
        summary=req.summary,
        functions_and_architecture=req.functions_and_architecture,
        best_practices=req.best_practices or "",
        project_name=req.project_name,
        author_role=req.author_role or "Backend & Frontend"
    )
    return {
        "success": True,
        "saved_path": str(saved_path),
        "filename": saved_path.name
    }

@app.post("/api/docs/postmortems")
def create_postmortem_api(req: PostmortemRequest):
    """
    Dokumentasi pengalaman AI saat memecahkan bug:
    Dual-sync otomatis ke:
    1. Folder lokal project: docs/postmortems/
    2. Folder global bersama: Knowledge Bug/
    """
    res = obsidian_service.save_postmortem(
        title=req.title,
        issue_or_error=req.issue_or_error,
        root_cause=req.root_cause,
        solution=req.solution,
        ai_learnings=req.ai_learnings,
        project_name=req.project_name,
        issue_ref=req.issue_ref,
        sync_global=True
    )
    return {
        "success": True,
        "local_path": res["local_path"],
        "global_path": res.get("global_path"),
        "filename": res["filename"]
    }

class AutoBugExperienceRequest(BaseModel):
    task_id: str
    task_key: Optional[str] = None
    title: str
    description: Optional[str] = ""
    result_or_thought: Optional[str] = ""
    issue_ref: Optional[str] = None
    project_name: Optional[str] = None

@app.post("/api/tasks/auto-bug-experience")
def auto_capture_bug_experience_api(req: AutoBugExperienceRequest):
    """
    Auto-hook yang dipanggil otomatis saat agen QA/Reviewer menyelesaikan task bug:
    Mengekstrak gejala, root cause, dan solusi, lalu menyimpannya ke project postmortems & global Knowledge Bug.
    """
    issue_ref = req.issue_ref or req.task_key or req.task_id
    if obsidian_service.has_postmortem_for_issue(issue_ref, project_name=req.project_name):
        return {
            "success": True,
            "skipped": True,
            "message": f"Bug untuk issue {issue_ref} sudah pernah didokumentasikan sebelumnya."
        }

    title = req.title.replace("[BUG]", "").replace("[FIX]", "").strip()
    issue_desc = req.description or req.title
    solution_desc = req.result_or_thought or "Telah diperiksa dan diverifikasi oleh QA/Reviewer."

    res = obsidian_service.save_postmortem(
        title=f"Fix {title}",
        issue_or_error=f"Task: {req.task_key or req.task_id}\nDeskripsi: {issue_desc}",
        root_cause=f"Ketidaksesuaian implementasi atau edge-case boundary pada {title}.",
        solution=solution_desc,
        ai_learnings=f"Saat memodifikasi fitur terkait {title}, pastikan menjalankan pengujian regresi dan verifikasi tipe ketat sebelum rilis.",
        project_name=req.project_name,
        issue_ref=issue_ref,
        sync_global=True
    )

    broadcaster.broadcast_sync("postmortem_created", {
        "title": title,
        "issue_ref": issue_ref,
        "filename": res["filename"]
    })

    return {
        "success": True,
        "skipped": False,
        "data": res
    }

# ========== Phase 3: Memory & Context Persistence ==========

# --- Missions & Tasks Listing ---

@app.get("/api/missions")
def list_missions_api(status: Optional[str] = None, limit: int = 50):
    """Daftar semua misi, opsional filter by status."""
    from services.database import Database
    missions = Database.list_missions(status=status, limit=limit)
    return {"success": True, "total": len(missions), "missions": missions}

@app.get("/api/missions/{mission_id}")
def get_mission_api(mission_id: str):
    """Detail satu misi beserta subtasks-nya."""
    from services.database import Database
    mission = Database.get_mission(mission_id)
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    return {"success": True, "mission": mission}

@app.get("/api/tasks")
def list_tasks_api(mission_id: Optional[str] = None, status: Optional[str] = None, limit: int = 100):
    """Daftar tasks, opsional filter by mission_id dan/atau status."""
    from services.database import Database
    tasks = Database.list_tasks(mission_id=mission_id, status=status, limit=limit)
    return {"success": True, "total": len(tasks), "tasks": tasks}

class CreateSingleTaskRequest(BaseModel):
    title: str
    description: Optional[str] = ""
    role: Optional[str] = None
    priority: Optional[str] = "medium"
    mission_id: Optional[str] = None
    criteria: Optional[str] = ""

@app.post("/api/tasks")
def create_single_task_api(req: CreateSingleTaskRequest):
    """
    Hybrid Direct Task Injection:
    Membuat single ticket langsung tanpa melalui PM Decompose.
    Mendukung auto-inferensi role atau explicit override via @role tag.
    """
    import uuid
    import re
    from services.database import Database

    raw_title = req.title.strip()
    target_role = (req.role or "").strip().lower()

    # 1. Cek explicit override tag: misal @frontend: ..., @backend: ..., [QA] ...
    tag_match = re.search(r"[@\[](frontend|backend|qa|intern|researcher|reviewer)[\]:]?", raw_title, re.IGNORECASE)
    if tag_match:
        target_role = tag_match.group(1).lower()
        # Bersihkan tag dari title
        clean_title = re.sub(r"[@\[](frontend|backend|qa|intern|researcher|reviewer)[\]:]?\s*", "", raw_title, flags=re.IGNORECASE).strip()
    else:
        clean_title = raw_title

    # 2. Auto-inferensi jika role belum ditentukan
    if not target_role:
        lower_txt = f"{clean_title} {req.description}".lower()
        if any(k in lower_txt for k in ["html", "css", "ui", "tampilan", "komponen", "button", "layout", "halaman", "modal", "react"]):
            target_role = "frontend"
        elif any(k in lower_txt for k in ["api", "database", "sqlite", "query", "endpoint", "route", "server", "fastapi"]):
            target_role = "backend"
        elif any(k in lower_txt for k in ["test", "testing", "audit", "cwe", "security", "scan", "qa", "bug"]):
            target_role = "qa"
        elif any(k in lower_txt for k in ["git", "branch", "pr", "push", "commit", "obsidian", "doc", "link"]):
            target_role = "intern"
        elif any(k in lower_txt for k in ["riset", "paper", "referensi", "cari", "docs"]):
            target_role = "researcher"
        else:
            target_role = "frontend"

    task_id = str(uuid.uuid4())[:8]
    mission_id = req.mission_id or f"direct-{task_id[:4]}"

    # Pastikan mission parent ada jika dibuat ad-hoc
    existing_mission = Database.get_mission(mission_id)
    if not existing_mission:
        Database.create_mission(
            mission_id=mission_id,
            title=clean_title,
            goal=clean_title,
            requirements=[]
        )

    task = Database.create_task(
        task_id=task_id,
        mission_id=mission_id,
        title=clean_title,
        description=req.description or clean_title,
        assigned_to=f"agent-{target_role}",
        criteria=req.criteria or ""
    )

    # Broadcast task created via SSE
    broadcaster.broadcast_sync("task_created", {
        "task_id": task_id,
        "mission_id": mission_id,
        "title": clean_title,
        "description": req.description or clean_title,
        "role": target_role,
        "priority": req.priority or "medium",
        "assigned_to": f"agent-{target_role}"
    })

    return {
        "success": True,
        "task_id": task_id,
        "mission_id": mission_id,
        "role": target_role,
        "title": clean_title,
        "assigned_to": f"agent-{target_role}",
        "message": f"Single ticket berhasil dibuat langsung untuk {target_role} (bypassed PM)."
    }

# --- Agents Registry ---

class UpsertAgentRequest(BaseModel):
    id: str
    name: str
    role: str
    title: Optional[str] = ""
    department: Optional[str] = "orchestra"

@app.post("/api/agents")
def upsert_agent_api(req: UpsertAgentRequest):
    """Register atau update agent ke database."""
    from services.database import Database
    agent = Database.upsert_agent(req.id, req.name, req.role, req.title or "", req.department or "orchestra")
    return {"success": True, "agent": agent}

@app.get("/api/agents")
def list_agents_api():
    """Daftar semua agent yang terdaftar."""
    from services.database import Database
    agents = Database.list_agents()
    return {"success": True, "total": len(agents), "agents": agents}

# --- Task Artifacts & Agent Memory Retrieval ---

class SaveArtifactRequest(BaseModel):
    task_id: str
    type: Optional[str] = "markdown"
    url: Optional[str] = ""
    summary: str
    description: Optional[str] = ""

@app.post("/api/artifacts")
def save_artifact_api(req: SaveArtifactRequest):
    """Simpan ringkasan artefak task ke database untuk memory retrieval."""
    import uuid
    from services.database import Database
    artifact_id = str(uuid.uuid4())[:8]
    artifact = Database.save_artifact(
        artifact_id=artifact_id,
        task_id=req.task_id,
        artifact_type=req.type or "markdown",
        url=req.url or "",
        summary=req.summary,
        description=req.description or ""
    )
    return {"success": True, "artifact": artifact}

@app.get("/api/artifacts/task/{task_id}")
def get_task_artifacts_api(task_id: str):
    """Artefak dari satu task."""
    from services.database import Database
    artifacts = Database.get_artifacts_by_task(task_id)
    return {"success": True, "total": len(artifacts), "artifacts": artifacts}

@app.get("/api/artifacts/mission/{mission_id}")
def get_mission_artifacts_api(mission_id: str):
    """Semua artefak dari semua task dalam satu misi."""
    from services.database import Database
    artifacts = Database.get_artifacts_by_mission(mission_id)
    return {"success": True, "total": len(artifacts), "artifacts": artifacts}

@app.get("/api/agents/{agent_id}/memory")
def get_agent_memory_api(agent_id: str, limit: int = 20):
    """
    Agent Memory Retrieval: Riwayat task + artefak yang pernah dikerjakan agent.
    Digunakan agar agent mengingat pengerjaan sebelumnya tanpa re-indexing penuh.
    """
    from services.database import Database
    history = Database.get_agent_history(agent_id, limit=limit)
    return {"success": True, "agent_id": agent_id, "total": len(history), "history": history}

class CompleteTaskRequest(BaseModel):
    task_id: str
    result_summary: str
    artifact_type: Optional[str] = "markdown"
    artifact_url: Optional[str] = ""

@app.post("/api/tasks/{task_id}/complete")
def complete_task_api(task_id: str, req: CompleteTaskRequest):
    """
    Tandai task selesai dan otomatis simpan artefak ringkasan ke DB.
    Agent tidak perlu call 2 endpoint terpisah.
    """
    import uuid
    from services.database import Database
    Database.update_task_status(task_id, "completed")
    artifact = Database.save_artifact(
        artifact_id=str(uuid.uuid4())[:8],
        task_id=task_id,
        artifact_type=req.artifact_type or "markdown",
        url=req.artifact_url or "",
        summary=req.result_summary,
        description=""
    )
    broadcaster.broadcast_sync("task_completed", {
        "task_id": task_id,
        "status": "completed",
        "summary": req.result_summary,
        "artifact": artifact
    })
    return {"success": True, "task_id": task_id, "status": "completed", "artifact": artifact}

@app.patch("/api/tasks/{task_id}/status")
def update_task_status_api(task_id: str, status: str = "in_progress"):
    """Update status task (pending, assigned, in_progress, completed, blocked)."""
    from services.database import Database
    Database.update_task_status(task_id, status)
    broadcaster.broadcast_sync("task_status_updated", {
        "task_id": task_id,
        "status": status
    })
    return {"success": True, "task_id": task_id, "status": status}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
