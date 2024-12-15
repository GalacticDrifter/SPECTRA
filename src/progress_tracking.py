import threading
from typing import Dict
from dataclasses import dataclass
from datetime import datetime, timezone

@dataclass
class ProgressStatus:
    project_id: str
    total_items: int
    completed_items: int
    current_section: str
    status: str  # 'in_progress', 'completed', 'error'
    start_time: datetime
    last_update: datetime
    error_message: str = None

class ProgressTracker:
    def __init__(self):
        self._progress = {}  # Dict[str, ProgressStatus]
        self._lock = threading.Lock()

    def initialize_progress(self, project_id: str, total_items: int) -> None:
        with self._lock:
            self._progress[project_id] = ProgressStatus(
                project_id=project_id,
                total_items=total_items,
                completed_items=0,
                current_section="Initializing",
                status="in_progress",
                start_time=datetime.now(timezone.utc),
                last_update=datetime.now(timezone.utc)
            )

    def update_progress(self, project_id: str, completed_items: int, current_section: str) -> None:
        with self._lock:
            if project_id in self._progress:
                progress = self._progress[project_id]
                progress.completed_items = completed_items
                progress.current_section = current_section
                progress.last_update = datetime.now(timezone.utc)

    def complete_progress(self, project_id: str) -> None:
        with self._lock:
            if project_id in self._progress:
                progress = self._progress[project_id]
                progress.completed_items = progress.total_items
                progress.current_section = "Completed"
                progress.status = "completed"
                progress.last_update = datetime.now()

    def set_error(self, project_id: str, error_message: str) -> None:
        with self._lock:
            if project_id in self._progress:
                progress = self._progress[project_id]
                progress.status = "error"
                progress.error_message = error_message
                progress.last_update = datetime.now()

    def get_progress(self, project_id: str) -> Dict:
        with self._lock:
            if project_id not in self._progress:
                return {
                    "status": "not_found",
                    "progress": 0,
                    "current_section": None,
                    "error": None
                }
            
            progress = self._progress[project_id]
            percentage = (progress.completed_items / progress.total_items * 100) if progress.total_items > 0 else 0
            
            return {
                "status": progress.status,
                "progress": round(percentage, 2),
                "current_section": progress.current_section,
                "start_time": progress.start_time.isoformat(),
                "last_update": progress.last_update.isoformat(),
                "error": progress.error_message
            }

    def cleanup_progress(self, project_id: str) -> None:
        with self._lock:
            if project_id in self._progress:
                del self._progress[project_id]

# Global progress tracker instance
progress_tracker = ProgressTracker()