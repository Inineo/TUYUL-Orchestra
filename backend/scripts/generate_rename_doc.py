import sys
from pathlib import Path

backend_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_root))

from services.obsidian import ObsidianService

service = ObsidianService(project_name="Kibi-Orchestra")
doc_path = service.save_feature_doc(
    title="Project Renaming and Obsidian Vault Aliasing",
    summary="Panduan dan arsitektur mekanisme saat nama project diganti namun tetap mempertahankan seluruh riwayat dokumentasi dan memory AI di Obsidian Vault tanpa harus me-rename folder fisik.",
    functions_and_architecture=(
        "1. Konfigurasi di file .env:\n"
        "   - CURRENT_PROJECT_NAME: Nama project baru/aktif (contoh: Toko-Online-Baru)\n"
        "   - OBSIDIAN_PROJECT_PATH: Path eksplisit ke folder vault Obsidian lama (contoh: D:/Obsidian/antigravity/Toko-Online-Lama)\n\n"
        "2. Resolusi Path di backend/config.py:\n"
        "   custom_proj_path = os.getenv('OBSIDIAN_PROJECT_PATH')\n"
        "   PROJECT_VAULT_PATH = Path(custom_proj_path) if custom_proj_path else (OBSIDIAN_VAULT_PATH / CURRENT_PROJECT_NAME)\n\n"
        "3. Routing di backend/services/obsidian.py:\n"
        "   ObsidianService secara otomatis mengarahkan seluruh operasi read_note(), save_feature_doc(), dan save_postmortem() "
        "ke lokasi PROJECT_VAULT_PATH tersebut."
    ),
    best_practices=(
        "- Gunakan opsi OBSIDIAN_PROJECT_PATH di .env ketika merefaktor nama repo agar riwayat pembelajaran AI tidak terputus.\n"
        "- AI Researcher (Dr. Aris Thorne) akan langsung mengenali dan membaca catatan dari path tersebut tanpa ada file yang hilang.\n"
        "- Hindari rename folder manual jika vault memiliki banyak wikilinks [[...]] yang rumit."
    )
)
print("Dokumentasi berhasil disimpan ke Obsidian:", doc_path)
