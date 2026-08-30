export type NavigationRole = 
  | 'LANDING'
  | 'ADMIN'
  | 'COMPLIANCE'
  | 'TRANSPORT'
  | 'FAILURE_MODES'
  | 'WORKFLOW_MAP'
  | 'EXPERIMENTS'
  | 'THRESHOLD_TUNING'
  | 'ERROR_ANALYSIS'
  | 'USER_FEEDBACK'
  | 'TECH_DOCS'
  | 'DATASET_EXPLORER'
  | 'MANUAL_ENTRY';

export interface Shipment {
  shipment_id: string;
  vehicle_id: string;
  driver_id: string;
  origin: string;
  destination: string;
  port_airport: string;
  current_location: string;
  current_temp: number;
  shipment_status: string;
  eta: string;
  compliance_status: 'NORMAL' | 'WARNING' | 'CRITICAL';
  risk_score: number;
  product_type?: string;
  batch_id?: string;
  driver_name?: string;
  safety_status?: string;
}

export interface Batch {
  batch_id: string;
  product_type: string;
  quantity_kg: number;
  processing_date: string;
  origin: string;
  destination: string;
  required_temp_min: number;
  required_temp_max: number;
  export_date: string;
  shipment_id: string;
  compliance_status: 'NORMAL' | 'WARNING' | 'CRITICAL';
  current_temp?: number;
  risk_score?: number;
}

export interface Sensor {
  sensor_id: string;
  sensor_type: string;
  status: string;
  battery_status: number;
  signal_status: string;
  last_calibration_date: string;
  calibration_due_date: string;
  calibration_status: 'VALID' | 'EXPIRED';
  accuracy_rating: number;
  technician: string;
}

export interface SensorLog {
  log_id: number;
  sensor_id: string;
  batch_id: string;
  shipment_id: string;
  timestamp: string;
  temperature: number | null;
  humidity: number | null;
  location: string;
  battery_status: number;
  signal_status: string;
  sensor_status: string;
  is_missing: number;
  is_noisy: number;
  is_imputed: number;
  original_temp: number | null;
  imputed_temp: number | null;
  anomaly_score: number;
}

export interface Handover {
  handover_id: string;
  batch_id: string;
  shipment_id: string;
  from_person: string;
  to_person: string;
  timestamp: string;
  location: string;
  condition: string;
  handover_status: string;
  notes: string;
}

export interface RouteEvent {
  route_id: string;
  shipment_id: string;
  event_type: string;
  timestamp: string;
  location: string;
  delay_minutes: number;
  route_status: string;
  notes: string;
}

export interface Worker {
  worker_id: string;
  driver_id: string;
  driver_name: string;
  working_hours: number;
  rest_hours: number;
  active_assignments: number;
  workload_score: number;
  safety_status: 'SAFE' | 'UNSAFE';
}

export interface ComplianceAlert {
  event_id: string;
  shipment_id: string;
  batch_id: string;
  event_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  timestamp: string;
  recommended_action: string;
  status: string;
  product_type?: string;
}

export interface MLPrediction {
  prediction_id: string;
  batch_id: string;
  anomaly_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  timestamp: string;
  sensor_id: string;
  recommended_action: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  contributing_factors: string;
  product_type?: string;
}

export interface EvidencePack {
  report_id: string;
  generated_at: string;
  batch_id: string;
  shipment_id: string;
  overall_status: 'PASSED' | 'ACTION_REQUIRED';
  completeness_score: number;
  completeness_breakdown: Record<string, number>;
  executive_summary: string;
  batch_details: Batch;
  shipment_details: Shipment;
  sensor_details: Sensor;
  calibration_evidence: any[];
  custody_handovers: Handover[];
  route_events: RouteEvent[];
  worker_safety_check: {
    is_safe: boolean;
    safety_status: string;
    message: string;
    violations: string[];
    working_hours: number;
    rest_hours: number;
    active_assignments: number;
    workload_score: number;
  };
  ml_anomaly_findings: {
    risk_level: string;
    confidence: number;
    anomaly_score: number;
    contributing_factors: string[];
    max_temp: number;
    min_temp: number;
    missing_count: number;
    noisy_count: number;
    recommended_action: string;
  };
  data_quality_analysis: {
    total_observations: number;
    missing_observations: number;
    imputed_observations: number;
    noisy_observations: number;
    max_recorded_temp: number;
    min_recorded_temp: number;
    temp_threshold_min: number;
    temp_threshold_max: number;
  };
  recent_sensor_log_sample: SensorLog[];
}

export interface NetworkStatus {
  status: 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'SYNC COMPLETE';
  last_sync_timestamp: string;
  buffered_records_count: number;
}

export type AdminTab = 
  | 'Dashboard'
  | 'Shipments'
  | 'Batches'
  | 'Sensors'
  | 'Users'
  | 'Routes'
  | 'Health'
  | 'Reports'
  | 'Experiments'
  | 'Settings'
  | 'DatasetExplorer';

export interface SystemHealthData {
  status: string;
  api: {
    status: string;
    port: number;
    version: string;
    framework: string;
    uptime: string;
  };
  database: {
    status: string;
    type: string;
    shipments_count: number;
    batches_count: number;
    sensors_count: number;
    sensor_logs_count: number;
    query_latency_ms: number;
  };
  ml_engine: {
    status: string;
    models: string[];
    accuracy: string;
    f1_score: number;
  };
  sensor_stream: {
    status: string;
    frequency: string;
    quality_checks: string[];
  };
  evidence_pack: {
    status: string;
    completeness_score: number;
    digital_signature: string;
  };
  store_forward: {
    network_status: string;
    buffered_records: number;
    last_sync: string;
  };
}

export interface SystemSettings {
  temp_warning_threshold: number;
  temp_critical_threshold: number;
  max_allowed_delay_mins: number;
  alert_sensitivity: string;
  store_forward_sync_interval: number;
  auto_impute_missing: boolean;
}

export interface ManualEntryFormState {
  shipment_id: string;
  batch_id: string;
  product_type: string;
  origin: string;
  destination: string;
  port_airport: string;
  transport_mode: string;
  quantity_kg: number;
  required_temp_min: number;
  required_temp_max: number;
  current_temp: number;
  sensor_id: string;
  sensor_type: string;
  calibration_date: string;
  calibration_due_date: string;
  calibration_status: 'VALID' | 'EXPIRED';
  route_status: string;
  last_custody_handover: string;
  driver_id: string;
  driver_name: string;
  notes: string;
}

export interface ManualEntryFinding {
  category: string;
  severity: 'NORMAL' | 'WARNING' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  action: string;
}

export interface ManualEntryValidationResult {
  is_valid: boolean;
  validation_errors: string[];
  compliance_status: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'INVALID';
  risk_score: number;
  findings: ManualEntryFinding[];
  warnings: string[];
  ready_for_evidence_pack: boolean;
  summary: string;
}


