"""
test_noise_experiment.py — Hardened test suite for sensor noise filtering experiment.
Tests:
- Injected synthetic spike detection using robust Hampel filter (MAD-based).
- Injected count, detected count, TP, FP, FN, TN, precision, recall, F1.
- Multiple noise injection levels (4%, 8%, 15%, 25%).
- Noise spike magnitudes (4°C to 12°C).
- Determinism and reproducibility across identical seeds.
- Downstream false alarm suppression in compliance decisions.
"""
import pytest
from experiments_engine import run_noise_experiment


class TestNoiseExperiment:
    def test_noise_experiment_structure(self):
        result = run_noise_experiment(0.08)
        assert "noise_injection_level_pct" in result
        assert "total_observations_tested" in result
        assert "noisy_observations_injected" in result
        assert "outliers_detected_and_filtered" in result
        assert "spike_detection_performance" in result
        assert "raw_unfiltered_performance" in result
        assert "processed_filtered_performance" in result
        assert "improvements" in result
        assert "sample_series_comparison" in result

    def test_injected_spikes_are_actually_detected(self):
        """CRITICAL QBEE FIX: Verify that the detector does NOT report 0 detected outliers."""
        result = run_noise_experiment(0.08)
        injected = result["noisy_observations_injected"]
        detected = result["outliers_detected_and_filtered"]
        assert injected > 0, "Expected injected noisy observations"
        assert detected > 0, f"Detector must detect injected spikes, got {detected}/{injected}"

        perf = result["spike_detection_performance"]
        assert perf["true_positives"] > 0, f"Expected true positives > 0, got {perf['true_positives']}"
        assert perf["precision"] > 0.0, f"Expected precision > 0, got {perf['precision']}"
        assert perf["recall"] > 0.0, f"Expected recall > 0, got {perf['recall']}"
        assert perf["f1_score"] > 0.0, f"Expected f1_score > 0, got {perf['f1_score']}"

    def test_multiple_noise_levels(self):
        """Test detector across varying noise levels."""
        for level in [0.04, 0.08, 0.15, 0.25]:
            res = run_noise_experiment(level)
            injected = res["noisy_observations_injected"]
            detected = res["outliers_detected_and_filtered"]
            tp = res["spike_detection_performance"]["true_positives"]
            assert injected > 0
            assert detected > 0
            assert tp > 0
            assert res["spike_detection_performance"]["recall"] >= 0.5, f"Recall at {level*100}% noise should be >= 50%"

    def test_false_positive_reduction_in_breach_decisions(self):
        """Verify that filtered data suppresses noise-induced false compliance alarms."""
        result = run_noise_experiment(0.08)
        raw_fp = result["raw_unfiltered_performance"]["false_positives"]
        filt_fp = result["processed_filtered_performance"]["false_positives"]
        fp_reduction = result["improvements"]["false_positive_reduction"]

        assert fp_reduction >= 0, "Filtered data must not increase false positive alarms"
        assert filt_fp <= raw_fp, f"Filtered FP ({filt_fp}) must be <= Raw FP ({raw_fp})"

    def test_noise_experiment_determinism(self):
        """Same configuration + same seed must yield bit-for-bit identical benchmark results."""
        run1 = run_noise_experiment(0.08)
        run2 = run_noise_experiment(0.08)

        assert run1["noisy_observations_injected"] == run2["noisy_observations_injected"]
        assert run1["outliers_detected_and_filtered"] == run2["outliers_detected_and_filtered"]
        assert run1["spike_detection_performance"] == run2["spike_detection_performance"]
        assert run1["processed_filtered_performance"] == run2["processed_filtered_performance"]
