"""
test_missing_data_experiment.py — Hardened test suite for missing data recovery experiment.
Tests:
- Mathematically valid recovery rate percentage: 0% <= recovery_rate_pct <= 100%.
- Correct separation of total records, affected records, recovered records, and unrecovered records.
- Multiple missing rates: 0%, 1%, 5%, 10%, 20%, 30%.
- Division by zero safety.
- Determinism and reproducibility.
"""
import pytest
from experiments_engine import run_missing_data_experiment


class TestMissingDataExperiment:
    def test_missing_data_experiment_structure(self):
        result = run_missing_data_experiment(0.05)
        assert "simulated_missing_rate_pct" in result
        assert "total_sensor_records" in result
        assert "records_affected" in result
        assert "records_recovered" in result
        assert "records_unrecovered" in result
        assert "recovery_rate_pct" in result
        assert "coverage_pct" in result
        assert "handling_algorithm" in result
        assert "raw_incomplete_data" in result
        assert "imputed_recovered_data" in result

    def test_recovery_rate_pct_bounded_between_0_and_100(self):
        """CRITICAL QBEE FIX: recovery_rate_pct must NEVER exceed 100%."""
        for rate in [0.01, 0.05, 0.10, 0.20, 0.30]:
            result = run_missing_data_experiment(rate)
            rate_pct = result["recovery_rate_pct"]
            assert 0.0 <= rate_pct <= 100.0, f"Rate {rate*100}% produced invalid recovery_rate_pct: {rate_pct}"

    def test_records_accounting_consistency(self):
        """Verify: records_affected == records_recovered + records_unrecovered."""
        result = run_missing_data_experiment(0.05)
        affected = result["records_affected"]
        recovered = result["records_recovered"]
        unrecovered = result["records_unrecovered"]
        assert affected == recovered + unrecovered, f"{affected} != {recovered} + {unrecovered}"
        assert recovered <= affected, f"Recovered {recovered} cannot exceed affected {affected}"

    def test_zero_missing_rate_edge_case(self):
        """Zero missing rate must not divide by zero and should return 100% recovery/coverage."""
        result = run_missing_data_experiment(0.0)
        assert result["records_affected"] == 0
        assert result["records_recovered"] == 0
        assert result["recovery_rate_pct"] == 100.0
        assert result["coverage_pct"] == 100.0

    def test_evidence_completeness_gain(self):
        """Imputation must restore evidence completeness higher than raw incomplete data."""
        result = run_missing_data_experiment(0.10)
        raw_comp = result["raw_incomplete_data"]["evidence_completeness_pct"]
        rec_comp = result["imputed_recovered_data"]["evidence_completeness_pct"]
        assert rec_comp > raw_comp, f"Imputed completeness {rec_comp}% must exceed raw {raw_comp}%"
        assert rec_comp >= 98.0, f"Imputed completeness should achieve >= 98% target, got {rec_comp}%"

    def test_missing_data_determinism(self):
        """Deterministic seed must reproduce exact results."""
        r1 = run_missing_data_experiment(0.05)
        r2 = run_missing_data_experiment(0.05)
        assert r1["records_affected"] == r2["records_affected"]
        assert r1["records_recovered"] == r2["records_recovered"]
        assert r1["recovery_rate_pct"] == r2["recovery_rate_pct"]
        assert r1["raw_incomplete_data"] == r2["raw_incomplete_data"]
