"""
Self-check script for Obsidian AI Experience Documentation & Dynamic Project-Scoped Isolation.
Run with: python backend/scripts/check_obsidian_experience.py
"""
import sys
from pathlib import Path

# Ensure backend root is on sys.path
backend_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_root))

from services.obsidian import ObsidianService
from config import OBSIDIAN_VAULT_PATH

def run_checks():
    print("=== Running Obsidian Experience Docs Self-Check ===")
    service = ObsidianService(project_name="Kibi-Orchestra")
    
    # 1. Check feature doc creation with sensitive keyword redaction
    feature_title = "SSE Real-Time Bridge"
    feature_path = service.save_feature_doc(
        title=feature_title,
        summary="Live event stream for UI updates using SSE.",
        functions_and_architecture="EventBroadcaster with asyncio.Queue. token: secret_api_key_12345678",
        best_practices="Always clean up subscriber queue on disconnect."
    )
    assert feature_path.exists(), f"Feature doc not created: {feature_path}"
    content = feature_path.read_text(encoding="utf-8")
    assert "[REDACTED]" in content, "Sensitive data was not redacted in feature doc"
    assert "secret_api_key_12345678" not in content, "Raw secret leaked into feature doc"
    print("[OK] Feature doc created and sensitive data successfully redacted.")

    # 2. Check postmortem doc creation
    pm_title = "Fix Legacy Role Comparison"
    pm_path = service.save_postmortem(
        title=pm_title,
        issue_or_error="TS2367 comparison error on developer role",
        root_cause="Role developer was removed from AgentRole union",
        solution="Mapped to frontend/backend and removed obsolete references",
        ai_learnings="Always grep role names after updating union types",
        issue_ref="#28"
    )
    assert pm_path.exists(), f"Postmortem doc not created: {pm_path}"
    pm_content = pm_path.read_text(encoding="utf-8")
    assert "TS2367" in pm_content
    assert "#28" in pm_content
    print("[OK] Bug postmortem doc created with issue reference.")

    # 3. Check dynamic project-scoped isolation (separate project folder)
    custom_project = "E-Commerce-Store-Demo"
    custom_feature_path = service.save_feature_doc(
        title="Cart Checkout Flow",
        summary="Payment gateway integration and cart state management.",
        functions_and_architecture="process_payment() method with webhook handler",
        best_practices="Idempotency key must be checked before charging.",
        project_name=custom_project
    )
    expected_dir = OBSIDIAN_VAULT_PATH / custom_project / "docs" / "features"
    assert custom_feature_path.parent == expected_dir, f"Wrong path for isolated project: {custom_feature_path}"
    assert custom_feature_path.exists()
    print(f"[OK] Dynamic project-scoped isolation verified for '{custom_project}'.")

    # Clean up test files created for demo project
    demo_dir = OBSIDIAN_VAULT_PATH / custom_project
    import shutil
    if demo_dir.exists():
        shutil.rmtree(demo_dir)
        print(f"[OK] Cleaned up temporary test project folder: {custom_project}")

    print("\nAll Obsidian AI Experience self-checks PASSED!")

if __name__ == "__main__":
    run_checks()
