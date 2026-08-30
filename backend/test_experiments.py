"""
Standalone test for all experiments_engine functions.
Run with: ../venv/Scripts/python test_experiments.py
"""
import os
import sys
import traceback

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from experiments_engine import (
    get_dataset_sample_statistics,
    run_baseline_experiment,
    run_missing_data_experiment,
    run_noise_experiment,
    run_threshold_tuning_experiment,
    get_error_analysis_data,
)

PASS = "[PASS]"
FAIL = "[FAIL]"
WARN = "[WARN]"

tests = [
    ("get_dataset_sample_statistics", lambda: get_dataset_sample_statistics()),
    ("run_baseline_experiment", lambda: run_baseline_experiment()),
    ("run_missing_data_experiment(5%)", lambda: run_missing_data_experiment(0.05)),
    ("run_missing_data_experiment(10%)", lambda: run_missing_data_experiment(0.10)),
    ("run_missing_data_experiment(20%)", lambda: run_missing_data_experiment(0.20)),
    ("run_noise_experiment(8%)", lambda: run_noise_experiment(0.08)),
    ("run_noise_experiment(15%)", lambda: run_noise_experiment(0.15)),
    ("run_threshold_tuning_experiment(2.0, 5.0, 60)", lambda: run_threshold_tuning_experiment(2.0, 5.0, 60)),
    ("run_threshold_tuning_experiment(3.0, 6.0, 90)", lambda: run_threshold_tuning_experiment(3.0, 6.0, 90)),
    ("get_error_analysis_data", lambda: get_error_analysis_data()),
]

print("\n=== EXPERIMENTS ENGINE FULL EXECUTION TEST ===\n")
all_passed = True
for name, fn in tests:
    try:
        result = fn()
        if isinstance(result, dict) and "error" in result:
            print(f"{WARN} {name} -> returned error key: {result['error']}")
        else:
            top_keys = list(result.keys())[:5]
            print(f"{PASS} {name} -> OK | top keys: {top_keys}")
    except Exception as e:
        print(f"{FAIL} {name} -> EXCEPTION: {e}")
        traceback.print_exc()
        all_passed = False

print()
if all_passed:
    print("=== ALL EXPERIMENTS PASSED ===")
else:
    print("=== SOME EXPERIMENTS FAILED - SEE ABOVE ===")
    sys.exit(1)
