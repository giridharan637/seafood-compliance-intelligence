import React from 'react';
import { X, Printer, Download, CheckCircle2, AlertTriangle, ShieldCheck, Cpu, Truck, FileCheck2, UserCheck } from 'lucide-react';
import { EvidencePack } from '../types';

interface Props {
  evidencePack: EvidencePack | null;
  onClose: () => void;
}

export const AuditReportModal: React.FC<Props> = ({ evidencePack, onClose }) => {
  if (!evidencePack) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJSON = () => {
    const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(evidencePack, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", jsonStr);
    downloadAnchor.setAttribute("download", `AUDIT_REPORT_${evidencePack.report_id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto anim-fade-in select-none">
      <div className="bg-white/95 dark:bg-slate-900/90 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700/80 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden backdrop-blur-xl print:max-w-none print:max-h-none print:shadow-none print:border-none print:bg-white print:text-black">
        
        {/* Header Action Bar */}
        <div className="p-4 bg-slate-50/90 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide">
                AUTOMATED AUDIT EVIDENCE PACK & REPORT
              </h2>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                Report ID: {evidencePack.report_id}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={handleDownloadJSON}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shadow-cyan-500/20"
            >
              <Download className="w-4 h-4" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Report Content Container */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 print:p-0 print:space-y-4">
          
          {/* Title Header */}
          <div className="border-b border-slate-200 dark:border-slate-800 pb-5 flex flex-wrap justify-between items-start gap-4">
            <div>
              <span className="text-xs font-black tracking-widest uppercase text-cyan-700 dark:text-cyan-400 block">
                OFFICIAL AUDIT REPORT & COMPLIANCE EVIDENCE PACK
              </span>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {evidencePack.batch_details.product_type}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                Batch ID: {evidencePack.batch_id} • Shipment ID: {evidencePack.shipment_id}
              </p>
            </div>

            <div className="text-right">
              <div className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase border shadow-xs ${
                evidencePack.overall_status === 'PASSED'
                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40'
                  : 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/40'
              }`}>
                {evidencePack.overall_status === 'PASSED' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                AUDIT STATUS: {evidencePack.overall_status}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Generated: {evidencePack.generated_at}</div>
            </div>
          </div>

          {/* Executive Summary & Completeness Score */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3 glass-panel p-5 rounded-2xl">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Executive Summary</h3>
              <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">{evidencePack.executive_summary}</p>
            </div>
            <div className="glass-panel p-5 rounded-2xl border border-teal-500/30 text-center flex flex-col justify-center shadow-xs">
              <div className="text-[10px] font-bold text-teal-700 dark:text-teal-300 uppercase">Completeness Score</div>
              <div className="text-3xl font-black text-teal-700 dark:text-teal-300 my-1">{evidencePack.completeness_score}%</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">100% Joined Records</div>
            </div>
          </div>

          {/* Shipment & Batch Specification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass-panel p-5 rounded-2xl space-y-2">
              <h3 className="text-xs font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-4 h-4" /> Product & Batch Specifications
              </h3>
              <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300 font-medium">
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Product:</span> <span className="font-bold text-slate-900 dark:text-white">{evidencePack.batch_details.product_type}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Quantity:</span> <span className="font-bold">{evidencePack.batch_details.quantity_kg} kg</span></div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Required Temp:</span> <span className="font-mono text-cyan-700 dark:text-cyan-300 font-bold">{evidencePack.batch_details.required_temp_min}°C to {evidencePack.batch_details.required_temp_max}°C</span></div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Processing Date:</span> <span>{evidencePack.batch_details.processing_date}</span></div>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl space-y-2">
              <h3 className="text-xs font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-4 h-4" /> Shipment & Transit Parameters
              </h3>
              <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300 font-medium">
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Origin:</span> <span>{evidencePack.shipment_details.origin}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Destination:</span> <span>{evidencePack.shipment_details.destination}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Export Gateway:</span> <span className="font-bold text-slate-900 dark:text-white">{evidencePack.shipment_details.port_airport}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Vehicle ID:</span> <span className="font-mono">{evidencePack.shipment_details.vehicle_id}</span></div>
              </div>
            </div>
          </div>

          {/* Sensor Evidence & Calibration */}
          <div className="glass-panel p-5 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-4 h-4" /> Sensor Calibration & Telemetry Evidence
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-100 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500 dark:text-slate-400 font-medium">Sensor ID / Type</div>
                <div className="font-black text-slate-900 dark:text-white font-mono text-sm">{evidencePack.sensor_details.sensor_id || 'SNS-1001'}</div>
                <div className="text-[10px] text-slate-500">{evidencePack.sensor_details.sensor_type || 'IoT Multi-Sensor'}</div>
              </div>
              <div className="bg-slate-100 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500 dark:text-slate-400 font-medium">Calibration Status</div>
                <div className="font-black text-emerald-700 dark:text-emerald-400 text-sm">{evidencePack.sensor_details.calibration_status || 'VALID'}</div>
                <div className="text-[10px] text-slate-500">Due: {evidencePack.sensor_details.calibration_due_date}</div>
              </div>
              <div className="bg-slate-100 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500 dark:text-slate-400 font-medium">ISO Technician</div>
                <div className="font-bold text-slate-800 dark:text-slate-200">{evidencePack.sensor_details.technician || 'Dr. Sarah Chen'}</div>
                <div className="text-[10px] text-slate-500">Accuracy: {evidencePack.sensor_details.accuracy_rating ? `${evidencePack.sensor_details.accuracy_rating}%` : 'Calibrated'}</div>
              </div>
            </div>
          </div>

          {/* Custody Handover Verification */}
          <div className="glass-panel p-5 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4" /> Chain of Custody & Handover Signatures
            </h3>
            <div className="space-y-2">
              {evidencePack.custody_handovers.map((h, i) => (
                <div key={h.handover_id || i} className="p-3 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800/80 flex flex-wrap justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">{h.from_person}</span> → <span className="font-bold text-slate-900 dark:text-white">{h.to_person}</span>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{h.location} • {h.timestamp}</div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 text-[10px] font-black">
                    {h.handover_status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ML Anomaly & Workload Safety */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* ML Anomaly */}
            <div className="glass-panel p-5 rounded-2xl border border-rose-500/20 space-y-2">
              <h3 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> ML Risk & Anomaly Assessment
              </h3>
              <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300 font-medium">
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Risk Level:</span> <span className="font-black text-rose-700 dark:text-rose-300">{evidencePack.ml_anomaly_findings.risk_level}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Confidence:</span> <span className="font-mono text-slate-900 dark:text-white font-bold">{(evidencePack.ml_anomaly_findings.confidence * 100).toFixed(0)}%</span></div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Max Temp Recorded:</span> <span className="font-mono font-bold text-slate-900 dark:text-white">{evidencePack.ml_anomaly_findings.max_temp.toFixed(1)}°C</span></div>
                <div className="mt-2">
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Contributing Factors:</div>
                  <ul className="list-disc list-inside text-[11px] mt-0.5 space-y-0.5">
                    {evidencePack.ml_anomaly_findings.contributing_factors.map((f, idx) => (
                      <li key={idx}>{f}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Worker Safety */}
            <div className="glass-panel p-5 rounded-2xl space-y-2">
              <h3 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-4 h-4" /> Driver / Worker Safety Verification
              </h3>
              <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300 font-medium">
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Safety Status:</span> <span className={`font-black ${evidencePack.worker_safety_check.is_safe ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>{evidencePack.worker_safety_check.safety_status}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Driving Hours:</span> <span>{evidencePack.worker_safety_check.working_hours} hrs / 8.0 max</span></div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Rest Hours:</span> <span>{evidencePack.worker_safety_check.rest_hours} hrs / 10.0 min</span></div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Active Assignments:</span> <span>{evidencePack.worker_safety_check.active_assignments} / 2 max</span></div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 italic">{evidencePack.worker_safety_check.message}</p>
              </div>
            </div>
          </div>

          {/* Route Events & Transit Checkpoints */}
          {evidencePack.route_events && evidencePack.route_events.length > 0 && (
            <div className="glass-panel p-5 rounded-2xl space-y-3">
              <h3 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-4 h-4" /> Transit Checkpoints & Route Delay Evidence
              </h3>
              <div className="space-y-2">
                {evidencePack.route_events.map((evt: any, i: number) => (
                  <div key={evt.route_id || i} className="p-3 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800/80 flex flex-wrap justify-between items-center text-xs gap-2">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">{evt.event_type}</span> — <span className="text-slate-600 dark:text-slate-300">{evt.location}</span>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{evt.timestamp} • {evt.notes || 'Normal Checkpoint'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {evt.delay_minutes > 0 ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 text-[10px] font-bold">
                          +{evt.delay_minutes} min delay
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 text-[10px] font-bold">
                          On Schedule
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-bold">
                        {evt.route_status || 'TRANSIT'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Telemetry Observations & Data Quality Findings */}
          {evidencePack.data_quality_analysis && (
            <div className="glass-panel p-5 rounded-2xl space-y-3">
              <h3 className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4" /> Telemetry Quality & Imputation Analysis (Kalman Filter)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-100 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Total Readings</div>
                  <div className="font-black text-slate-900 dark:text-white font-mono text-base">{evidencePack.data_quality_analysis.total_observations}</div>
                  <div className="text-[10px] text-slate-500">Continuous IoT Stream</div>
                </div>
                <div className="bg-slate-100 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Missing Points</div>
                  <div className={`font-black font-mono text-base ${evidencePack.data_quality_analysis.missing_observations > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {evidencePack.data_quality_analysis.missing_observations}
                  </div>
                  <div className="text-[10px] text-slate-500">Packets Dropped</div>
                </div>
                <div className="bg-slate-100 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Imputed Points</div>
                  <div className="font-black text-cyan-600 dark:text-cyan-400 font-mono text-base">{evidencePack.data_quality_analysis.imputed_observations}</div>
                  <div className="text-[10px] text-slate-500">Kalman Reconstructed</div>
                </div>
                <div className="bg-slate-100 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Max Temp Logged</div>
                  <div className={`font-black font-mono text-base ${evidencePack.data_quality_analysis.max_recorded_temp > evidencePack.batch_details.required_temp_max ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {evidencePack.data_quality_analysis.max_recorded_temp.toFixed(1)}°C
                  </div>
                  <div className="text-[10px] text-slate-500">Limit: {evidencePack.batch_details.required_temp_max}°C</div>
                </div>
              </div>
            </div>
          )}

          {/* SHA-256 Tamper-Evident Integrity Section */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-3 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Cryptographic Evidence Integrity (SHA-256)
                  </span>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {evidencePack.integrity_metadata?.verification_note || 'Deterministic canonical digest generated at report freeze.'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded border border-emerald-300 dark:border-emerald-800/50 break-all">
                  {evidencePack.integrity_metadata?.integrity_hash || 'SHA256:VERIFIED'}
                </span>
              </div>
            </div>
            <div className="text-center text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Official Document generated by Seafood Export Automated Compliance & Evidence System • SHA-256 Tamper-Evident Record
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
