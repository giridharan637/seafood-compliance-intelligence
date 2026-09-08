import os
import sys
from typing import Dict, Any

# Ensure backend directory is in sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from database import get_db_connection

MAX_DRIVING_HOURS = 8.0
MIN_REST_HOURS = 10.0
MAX_ACTIVE_ASSIGNMENTS = 2

def check_worker_workload_safety(driver_id: str, new_additional_hours: float = 0.0, **kwargs) -> Dict[str, Any]:
    """
    Evaluates driver workload safety against strict regulatory limits.
    Blocks assignment if limits are exceeded.
    Supports either new_additional_hours or additional_hours.
    """
    additional_hours = kwargs.get("additional_hours", new_additional_hours)

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT worker_id, driver_id, driver_name, working_hours, rest_hours, active_assignments, workload_score, safety_status
        FROM worker_logs
        WHERE driver_id = ?
    """, (driver_id,))
    worker = cursor.fetchone()

    conn.close()

    if not worker:
        return {
            "driver_id": driver_id,
            "is_safe": True,
            "safety_status": "SAFE",
            "message": "New driver profile - within safety limits.",
            "violations": [],
            "safety_violations": [],
            "workload_score": 0.2
        }

    curr_hours = worker['working_hours'] + additional_hours
    curr_rest = worker['rest_hours']
    curr_assignments = worker['active_assignments'] + (1 if additional_hours > 0 else 0)

    violations = []
    if curr_hours > MAX_DRIVING_HOURS:
        violations.append(f"Working hours ({curr_hours:.1f} hrs) exceed maximum allowed ({MAX_DRIVING_HOURS} hrs)")
    if curr_rest < MIN_REST_HOURS:
        violations.append(f"Rest period ({curr_rest:.1f} hrs) is less than required minimum ({MIN_REST_HOURS} hrs)")
    if curr_assignments > MAX_ACTIVE_ASSIGNMENTS:
        violations.append(f"Active assignments ({curr_assignments}) exceed safety limit ({MAX_ACTIVE_ASSIGNMENTS})")

    is_safe = len(violations) == 0
    workload_score = round(min(1.0, (curr_hours / MAX_DRIVING_HOURS) * 0.5 + (curr_assignments / MAX_ACTIVE_ASSIGNMENTS) * 0.5), 2)

    if not is_safe:
        return {
            "driver_id": driver_id,
            "driver_name": worker['driver_name'],
            "is_safe": False,
            "safety_status": "UNSAFE",
            "alert_banner": "UNSAFE ASSIGNMENT – REASSIGN REQUIRED",
            "message": "Assignment blocked! The selected driver violates mandated workload safety constraints.",
            "violations": violations,
            "safety_violations": violations,
            "working_hours": curr_hours,
            "rest_hours": curr_rest,
            "active_assignments": curr_assignments,
            "workload_score": workload_score
        }

    return {
        "driver_id": driver_id,
        "driver_name": worker['driver_name'],
        "is_safe": True,
        "safety_status": "SAFE",
        "message": "Driver workload is within safe regulatory parameters.",
        "violations": [],
        "safety_violations": [],
        "working_hours": curr_hours,
        "rest_hours": curr_rest,
        "active_assignments": curr_assignments,
        "workload_score": workload_score
    }
