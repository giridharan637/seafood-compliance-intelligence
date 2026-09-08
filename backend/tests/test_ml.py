"""
test_ml.py — ML pipeline tests: IsolationForest, RandomForestClassifier, edge cases.
"""
import pytest
import numpy as np


class TestMLEngine:
    """Tests for ml_engine.py functions."""

    def test_preprocess_and_train_returns_dict(self):
        from ml_engine import preprocess_and_train_models
        result = preprocess_and_train_models()
        assert isinstance(result, dict)

    def test_ml_result_has_no_error(self):
        from ml_engine import preprocess_and_train_models
        result = preprocess_and_train_models()
        assert "error" not in result, f"ML training returned error: {result.get('error')}"

    def test_ml_result_has_status(self):
        from ml_engine import preprocess_and_train_models
        result = preprocess_and_train_models()
        assert "status" in result

    def test_ml_result_has_model_metrics(self):
        from ml_engine import preprocess_and_train_models
        result = preprocess_and_train_models()
        # Should include some form of metrics
        assert any(k in result for k in ["anomaly_count", "training_records", "rf_accuracy", "records_analyzed"])

    def test_analyze_single_batch_valid(self, sample_batch_id):
        from ml_engine import analyze_single_batch
        result = analyze_single_batch(sample_batch_id)
        assert isinstance(result, dict)

    def test_analyze_single_batch_has_risk_level(self, sample_batch_id):
        from ml_engine import analyze_single_batch
        result = analyze_single_batch(sample_batch_id)
        assert "risk_level" in result
        assert result["risk_level"] in {"LOW", "MEDIUM", "HIGH", "UNKNOWN"}, \
            f"Unexpected risk_level: {result['risk_level']}"

    def test_analyze_single_batch_invalid(self):
        from ml_engine import analyze_single_batch
        result = analyze_single_batch("NONEXISTENT-BATCH-999")
        # Should return a structured result, not raise
        assert isinstance(result, dict)

    def test_generate_dataset_creates_records(self):
        from data_generator import generate_dataset
        from database import get_db_connection
        generate_dataset(100)
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT (SELECT COUNT(*) FROM product_batches) + (SELECT COUNT(*) FROM sensor_logs)")
        total_created = cursor.fetchone()[0]
        conn.close()
        assert total_created >= 100


class TestMLExperiments:
    def test_baseline_no_error(self):
        from experiments_engine import run_baseline_experiment
        result = run_baseline_experiment()
        assert "error" not in result

    def test_missing_data_experiment_5pct(self):
        from experiments_engine import run_missing_data_experiment
        result = run_missing_data_experiment(0.05)
        assert "error" not in result

    def test_noise_experiment_8pct(self):
        from experiments_engine import run_noise_experiment
        result = run_noise_experiment(0.08)
        assert "error" not in result

    def test_threshold_tuning(self):
        from experiments_engine import run_threshold_tuning_experiment
        result = run_threshold_tuning_experiment(2.0, 5.0, 60)
        assert "error" not in result

    def test_error_analysis_dynamic_confusion_matrix(self):
        from experiments_engine import get_error_analysis_data
        result = get_error_analysis_data()
        cm = result.get("ml_confusion_matrix", {})
        if "total_evaluated" in cm:
            assert cm["total_evaluated"] > 0, "Confusion matrix must evaluate real records"
            # Metrics must be 0-1 if present
            for metric in ["precision", "recall", "f1_score"]:
                if metric in cm:
                    assert 0.0 <= cm[metric] <= 1.0, f"{metric}={cm[metric]} out of range"


class TestMLInputEdgeCases:
    def test_missing_data_at_boundary_low(self):
        from experiments_engine import run_missing_data_experiment
        result = run_missing_data_experiment(0.01)  # minimum clipped value
        assert "error" not in result

    def test_missing_data_at_boundary_high(self):
        from experiments_engine import run_missing_data_experiment
        result = run_missing_data_experiment(0.50)  # maximum clipped value
        assert "error" not in result

    def test_noise_at_boundary_low(self):
        from experiments_engine import run_noise_experiment
        result = run_noise_experiment(0.01)
        assert "error" not in result

    def test_noise_at_boundary_high(self):
        from experiments_engine import run_noise_experiment
        result = run_noise_experiment(0.40)
        assert "error" not in result
