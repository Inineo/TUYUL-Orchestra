"""
Self-check script for Dual-Sync Bug Postmortem (Project Docs + Global Knowledge Bug).
Run with: python backend/scripts/check_dual_bug_sync.py
"""
import sys
from pathlib import Path

backend_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_root))

from services.obsidian import ObsidianService
from config import KNOWLEDGE_BUG_PATH, OBSIDIAN_VAULT_PATH

def run_checks():
    print("=== Running Dual-Sync Bug Postmortem Self-Check ===")
    service = ObsidianService(project_name="Kibi-Orchestra")
    
    # 1. Test save_postmortem with dual-sync
    test_title = "WebSocket Connection Drop On Reconnect"
    test_issue_ref = "#999-TEST"
    
    res = service.save_postmortem(
        title=test_title,
        issue_or_error="SSE bridge disconnected when network switches",
        root_cause="Missing exponential backoff retry mechanism in useOfficeStore",
        solution="Added reconnect loop with 2s, 4s, 8s backoff delay",
        ai_learnings="Always implement backoff on real-time event connections",
        issue_ref=test_issue_ref,
        sync_global=True
    )
    
    local_path = Path(res["local_path"])
    assert local_path.exists(), f"Local postmortem file was not created: {local_path}"
    print(f"[OK] Local project postmortem created: {local_path.name}")
    
    if res.get("global_path"):
        global_path = Path(res["global_path"])
        assert global_path.exists(), f"Global Knowledge Bug file was not created: {global_path}"
        assert global_path.parent == KNOWLEDGE_BUG_PATH
        global_content = global_path.read_text(encoding="utf-8")
        assert "universal_bug_solution" in global_content
        print(f"[OK] Global Knowledge Bug postmortem created: {global_path.name}")
        # Clean up test global file
        global_path.unlink()
        print("[OK] Cleaned up temporary test file in Knowledge Bug.")
    else:
        print("[SKIP] Global path skipped because KNOWLEDGE_BUG_PATH directory is not configured on this machine.")

    # 2. Test Deduplication
    has_dup = service.has_postmortem_for_issue(test_issue_ref)
    assert has_dup is True, "Deduplication check failed to detect existing postmortem"
    print("[OK] Deduplication check successfully detected existing postmortem.")

    # Clean up test local file
    if local_path.exists():
        local_path.unlink()
        print("[OK] Cleaned up temporary test local postmortem.")

    print("\nAll Dual-Sync Bug Postmortem checks PASSED!")

if __name__ == "__main__":
    run_checks()
