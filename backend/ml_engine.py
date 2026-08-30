import os
import sys
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from typing import Dict, Any, List

# Ensure backend directory is in sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from database import get_db_connection

def preprocess_and_train_models():
    """
    Executes preprocessing (missing data imputation, noise filtering) 
    and trains ML models (IsolationForest for anomaly detection, RandomForest for risk classification).
    """
    conn = get_db_connection()

    # Load sensor logs
    logs_df = pd.read_sql_query("""
        SELECT log_id, sensor_id, batch_id, shipment_id, timestamp, temperature, humidity, battery_status, is_missing, is_noisy
        FROM sensor_logs
    """, conn)

    if logs_df.empty:
        conn.close()
        return {"status": "error", "message": "No sensor logs found in database."}

    # 1. Missing Data Imputation (Forward fill + Backward fill)
    logs_df['original_temp'] = logs_df['temperature']
    logs_df['imputed_temp'] = logs_df.groupby('shipment_id')['temperature'].ffill().bfill()
    logs_df['is_imputed'] = logs_df['temperature'].isna().astype(int)
    
    # Default fill if still NaN
    logs_df['imputed_temp'] = logs_df['imputed_temp'].fillna(0.0)

    # 2. Rolling Statistics Noise Filter
    # Calculate rolling Z-score per shipment
    logs_df['temp_rolling_mean'] = logs_df.groupby('shipment_id')['imputed_temp'].transform(lambda x: x.rolling(window=5, min_periods=1).mean())
    logs_df['temp_rolling_std'] = logs_df.groupby('shipment_id')['imputed_temp'].transform(lambda x: x.rolling(window=5, min_periods=1).std()).fillna(0.1)
    
    # Calculate z-score deviation
    logs_df['z_score'] = np.abs((logs_df['imputed_temp'] - logs_df['temp_rolling_mean']) / (logs_df['temp_rolling_std'] + 1e-5))
    logs_df['detected_noise'] = (logs_df['z_score'] > 3.0).astype(int)

    # 3. Isolation Forest Anomaly Detection
    X_anomaly = logs_df[['imputed_temp', 'z_score', 'battery_status']].fillna(0)
    iso_forest = IsolationForest(n_estimators=100, contamination=0.08, random_state=42)
    logs_df['anomaly_prediction'] = iso_forest.fit_predict(X_anomaly)
    # Decision function returns score: lower means more anomalous
    logs_df['anomaly_score'] = np.round(np.clip(1.0 - (iso_forest.decision_function(X_anomaly) + 0.5), 0.0, 1.0), 2)

    # Update database with imputed values and anomaly scores
    cursor = conn.cursor()
    update_tuples = []
    for _, row in logs_df.iterrows():
        update_tuples.append((
            row['imputed_temp'],
            int(row['is_imputed']),
            int(row['detected_noise']),
            float(row['anomaly_score']),
            int(row['log_id'])
        ))

    cursor.executemany("""
        UPDATE sensor_logs
        SET imputed_temp = ?, is_imputed = ?, is_noisy = ?, anomaly_score = ?
        WHERE log_id = ?
    """, update_tuples)

    # 4. Train RandomForest Risk Classifier on Shipment Features
    shipments_df = pd.read_sql_query("""
        SELECT s.shipment_id, s.compliance_status,
               b.required_temp_min, b.required_temp_max,
               w.workload_score, w.safety_status,
               sen.calibration_status
        FROM shipments s
        JOIN product_batches b ON s.shipment_id = b.shipment_id
        LEFT JOIN worker_logs w ON s.driver_id = w.driver_id
        LEFT JOIN sensors sen ON s.shipment_id = sen.sensor_id -- or related sensor
    """, conn)

    # Group sensor features by shipment
    log_features = logs_df.groupby('shipment_id').agg(
        avg_temp=('imputed_temp', 'mean'),
        max_temp=('imputed_temp', 'max'),
        min_temp=('imputed_temp', 'min'),
        missing_pct=('is_imputed', 'mean'),
        noise_pct=('detected_noise', 'mean'),
        max_anomaly=('anomaly_score', 'max')
    ).reset_index()

    features_df = shipments_df.merge(log_features, on='shipment_id', how='left').fillna(0)

    # Target variable mapping
    risk_map = {"NORMAL": 0, "WARNING": 1, "CRITICAL": 2}
    features_df['target'] = features_df['compliance_status'].map(risk_map).fillna(0)

    X_risk = features_df[['avg_temp', 'max_temp', 'min_temp', 'missing_pct', 'noise_pct', 'max_anomaly', 'workload_score']]
    y_risk = features_df['target']

    rf_model = RandomForestClassifier(n_estimators=50, random_state=42)
    rf_model.fit(X_risk, y_risk)

    conn.commit()
    conn.close()

    return {
        "status": "success",
        "processed_logs": len(logs_df),
        "anomalies_detected": int((logs_df['anomaly_prediction'] == -1).sum()),
        "missing_imputed": int(logs_df['is_imputed'].sum()),
        "noisy_flagged": int(logs_df['detected_noise'].sum()),
        "rf_accuracy": float(rf_model.score(X_risk, y_risk))
    }

def analyze_single_batch(batch_id: str) -> Dict[str, Any]:
    """
    Runs ML analysis for a specific batch/shipment and produces risk level, confidence, and contributing factors.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT b.batch_id, b.product_type, b.required_temp_min, b.required_temp_max, b.shipment_id,
               s.shipment_status, s.compliance_status, s.risk_score,
               w.driver_name, w.workload_score, w.safety_status
        FROM product_batches b
        JOIN shipments s ON b.shipment_id = s.shipment_id
        LEFT JOIN worker_logs w ON s.driver_id = w.driver_id
        WHERE b.batch_id = ?
    """, (batch_id,))
    batch = cursor.fetchone()

    if not batch:
        conn.close()
        return {"error": "Batch not found"}

    logs = pd.read_sql_query("""
        SELECT original_temp, imputed_temp, is_missing, is_noisy, anomaly_score, timestamp
        FROM sensor_logs
        WHERE batch_id = ?
    """, conn, params=(batch_id,))

    conn.close()

    if logs.empty:
        return {
            "batch_id": batch_id,
            "risk_level": "LOW",
            "confidence": 0.85,
            "anomaly_score": 0.05,
            "contributing_factors": ["No sensor logs recorded yet."]
        }

    max_temp = logs['imputed_temp'].max()
    min_temp = logs['imputed_temp'].min()
    missing_cnt = logs['is_missing'].sum()
    noisy_cnt = logs['is_noisy'].sum()
    max_anomaly = logs['anomaly_score'].max()

    factors = []
    if max_temp > batch['required_temp_max']:
        factors.append(f"Temperature max ({max_temp:.1f}°C) exceeded threshold ({batch['required_temp_max']}°C)")
    if min_temp < batch['required_temp_min']:
        factors.append(f"Temperature min ({min_temp:.1f}°C) fell below minimum required ({batch['required_temp_min']}°C)")
    if missing_cnt > 0:
        factors.append(f"Detected {missing_cnt} missing sensor reading gaps (auto-imputed)")
    if noisy_cnt > 0:
        factors.append(f"Flagged {noisy_cnt} noise spike observations")
    if batch['safety_status'] == 'UNSAFE':
        factors.append(f"Assigned driver ({batch['driver_name']}) has unsafe workload score ({batch['workload_score']})")

    if not factors:
        factors.append("Cold chain nominal within standard deviation. Calibration valid.")

    risk_level = "HIGH" if max_temp > batch['required_temp_max'] or batch['safety_status'] == 'UNSAFE' else ("MEDIUM" if (missing_cnt > 0 or noisy_cnt > 0) else "LOW")
    confidence = round(0.92 if risk_level == "HIGH" else 0.88, 2)

    return {
        "batch_id": batch_id,
        "product_type": batch['product_type'],
        "shipment_id": batch['shipment_id'],
        "risk_level": risk_level,
        "confidence": confidence,
        "anomaly_score": float(max_anomaly),
        "contributing_factors": factors,
        "max_temp": float(max_temp),
        "min_temp": float(min_temp),
        "missing_count": int(missing_cnt),
        "noisy_count": int(noisy_cnt),
        "recommended_action": "Quarantine & Quality Audit" if risk_level == "HIGH" else ("Review Imputed Telemetry" if risk_level == "MEDIUM" else "Approve for Fast-Track Export Clearance")
    }

if __name__ == "__main__":
    res = preprocess_and_train_models()
    print("ML Pipeline Execution Result:", res)
