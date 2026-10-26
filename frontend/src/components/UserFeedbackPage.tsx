import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, Star, Send, MessageSquare, CheckCircle2, Home, BarChart2,
  Users, Clock, Target, Shield, AlertTriangle, FileText, Plus, X,
  ChevronDown, ChevronUp, ExternalLink, Check
} from 'lucide-react';
import {
  NavigationRole, StakeholderValidationSession, ValidationsResponse,
  ValidationQuestionItem
} from '../types';
import { ThemeToggle } from './ThemeToggle';
import { apiFetch } from '../config/api';
import { useToast } from '../context/ToastContext';

interface Props {
  onNavigate: (role: NavigationRole) => void;
}

interface FeedbackEntry {
  feedback_id: number;
  role: string;
  usability_rating: number;
  report_clarity: number;
  alert_usefulness: number;
  evidence_pack_usefulness: number;
  ease_of_navigation: number;
  comments: string;
  submitted_at: string;
  is_demo: number;
  feedback_category?: string;
  category_label?: string;
}

interface FeedbackSummary {
  avg_rating: number;
  total_responses: number;
  feedback_list: FeedbackEntry[];
  synthetic_fixtures_count?: number;
  direct_submissions_count?: number;
  validation_summary?: {
    status: string;
    real_sessions_count: number;
    mock_sessions_count: number;
    template_count: number;
    evaluator_directive_met: boolean;
    disclaimer: string;
  };
  validation_sessions?: StakeholderValidationSession[];
}

interface ValidationTemplateData {
  template_id: string;
  title: string;
  evaluator_directive: string;
  allowed_participant_types: string[];
  recommended_roles: string[];
  demo_modules: string[];
  questions: {
    question_id: string;
    domain: string;
    question_text: string;
    response_placeholder: string;
  }[];
  instructions: string;
}

export const UserFeedbackPage: React.FC<Props> = ({ onNavigate }) => {
  const { showToast } = useToast();

  // Active top-level tab: 'VALIDATIONS' vs 'SYNTHETIC_FEEDBACK'
  const [activeTab, setActiveTab] = useState<'VALIDATIONS' | 'SYNTHETIC_FEEDBACK'>('VALIDATIONS');

  // Stakeholder Validations State
  const [validationsData, setValidationsData] = useState<ValidationsResponse | null>(null);
  const [validationFilter, setValidationFilter] = useState<'ALL' | 'REAL' | 'MOCK' | 'TEMPLATE'>('ALL');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>('VAL-TEMPLATE-001');

  // Modals state
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateData, setTemplateData] = useState<ValidationTemplateData | null>(null);

  // Record Validation Form State
  const [sessionFormId, setSessionFormId] = useState('VAL-MOCK-2026-001');
  const [sessionFormDate, setSessionFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionFormType, setSessionFormType] = useState<'MOCK_STAKEHOLDER' | 'REAL_STAKEHOLDER'>('MOCK_STAKEHOLDER');
  const [sessionFormRole, setSessionFormRole] = useState('Cold-Chain Quality Assurance Officer');
  const [sessionFormCustomRole, setSessionFormCustomRole] = useState('');
  const [sessionFormMethod, setSessionFormMethod] = useState('Cognitive Walkthrough & Task Demonstration');
  const [sessionFormModules, setSessionFormModules] = useState<string[]>([
    'Admin Dashboard & System KPIs',
    'Real-time Telemetry & Cold-Chain Alerts',
    '1-Click Evidence Pack & SHA-256 Verification',
    'Driver Duty Safety Hard-Blocking'
  ]);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({
    Q1_DASHBOARD: '',
    Q2_ALERTS: '',
    Q3_TRACEABILITY: '',
    Q4_EVIDENCE: '',
    Q5_SAFETY: '',
    Q6_DATA_QUALITY: '',
    Q7_IMPROVEMENTS: ''
  });
  const [formStrengths, setFormStrengths] = useState('');
  const [formIssues, setFormIssues] = useState('');
  const [formImprovements, setFormImprovements] = useState('');
  const [formActions, setFormActions] = useState('');
  const [formEvidenceRef, setFormEvidenceRef] = useState('');
  const [formValidationStatus, setFormValidationStatus] = useState<'CONDUCTED_PENDING_ACTION' | 'VALIDATED_RESOLVED'>('CONDUCTED_PENDING_ACTION');
  const [isSubmittingValidation, setIsSubmittingValidation] = useState(false);

  // Synthetic / App Feedback Form State
  const [role, setRole] = useState('Compliance Officer');
  const [usability, setUsability] = useState(5);
  const [clarity, setClarity] = useState(5);
  const [alerts, setAlerts] = useState(5);
  const [evidence, setEvidence] = useState(5);
  const [nav, setNav] = useState(5);
  const [comments, setComments] = useState('');
  const [feedbackSummary, setFeedbackSummary] = useState<FeedbackSummary | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Data Fetching
  const fetchValidations = useCallback(async () => {
    try {
      const res = await apiFetch<ValidationsResponse>('/validations');
      setValidationsData(res);
    } catch (err) {
      console.error("Validations fetch error", err);
    }
  }, []);

  const fetchFeedback = useCallback(async () => {
    try {
      const res = await apiFetch<FeedbackSummary>('/feedback');
      setFeedbackSummary(res);
    } catch (err) {
      console.error("Feedback fetch error", err);
    }
  }, []);

  const fetchTemplate = useCallback(async () => {
    try {
      const res = await apiFetch<ValidationTemplateData>('/validations/template');
      setTemplateData(res);
    } catch (err) {
      console.error("Template fetch error", err);
    }
  }, []);

  useEffect(() => {
    /* oxlint-disable react/set-state-in-effect */
    fetchValidations();
    fetchFeedback();
    fetchTemplate();
    /* oxlint-enable react/set-state-in-effect */
  }, [fetchValidations, fetchFeedback, fetchTemplate]);

  // Handle Recording New Validation Session
  const handleRecordValidationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalRole = sessionFormRole === 'Custom' ? sessionFormCustomRole.trim() : sessionFormRole;
    if (!finalRole) {
      showToast({
        type: 'error',
        title: 'Missing Role',
        message: 'Please provide a stakeholder participant role (without personal PII).',
        duration: 4000
      });
      return;
    }

    if (!formStrengths.trim() || !formIssues.trim() || !formImprovements.trim() || !formActions.trim()) {
      showToast({
        type: 'error',
        title: 'Required Observations',
        message: 'Please fill in observed strengths, issues, suggested improvements, and planned actions.',
        duration: 4000
      });
      return;
    }

    const structuredQuestions: ValidationQuestionItem[] = [
      { question_id: 'Q1_DASHBOARD', question_text: 'Ease of using dashboard for cold-chain monitoring', response_text: questionAnswers.Q1_DASHBOARD.trim() || '[No specific comment]' },
      { question_id: 'Q2_ALERTS', question_text: 'Understanding of cold-chain temperature excursion alerts', response_text: questionAnswers.Q2_ALERTS.trim() || '[No specific comment]' },
      { question_id: 'Q3_TRACEABILITY', question_text: 'Shipment, sensor lineage, and custody handover traceability', response_text: questionAnswers.Q3_TRACEABILITY.trim() || '[No specific comment]' },
      { question_id: 'Q4_EVIDENCE', question_text: 'Evidence pack usefulness, structure, and integrity verification', response_text: questionAnswers.Q4_EVIDENCE.trim() || '[No specific comment]' },
      { question_id: 'Q5_SAFETY', question_text: 'Driver workload safety and hours-of-service compliance checks', response_text: questionAnswers.Q5_SAFETY.trim() || '[No specific comment]' },
      { question_id: 'Q6_DATA_QUALITY', question_text: 'Missing telemetry imputation and noisy sensor data handling', response_text: questionAnswers.Q6_DATA_QUALITY.trim() || '[No specific comment]' },
      { question_id: 'Q7_IMPROVEMENTS', question_text: 'Suggested operational improvements and feature priorities', response_text: questionAnswers.Q7_IMPROVEMENTS.trim() || '[No specific comment]' }
    ];

    setIsSubmittingValidation(true);
    try {
      await apiFetch('/validations', {
        method: 'POST',
        body: JSON.stringify({
          session_id: sessionFormId.trim(),
          session_date: sessionFormDate,
          participant_type: sessionFormType,
          participant_role: finalRole,
          validation_method: sessionFormMethod,
          demo_modules_evaluated: sessionFormModules,
          question_responses: structuredQuestions,
          observed_strengths: formStrengths.trim(),
          observed_issues: formIssues.trim(),
          suggested_improvements: formImprovements.trim(),
          actions_taken_or_planned: formActions.trim(),
          validation_status: formValidationStatus,
          evidence_reference: formEvidenceRef.trim() || `docs/validation/evidence/${sessionFormId.trim()}_notes.md`
        })
      });

      showToast({
        type: 'success',
        title: 'Validation Session Recorded',
        message: `Session ${sessionFormId} successfully stored with full empirical traceability.`,
        duration: 5000
      });

      setShowRecordModal(false);
      await fetchValidations();
      await fetchFeedback();

      // Reset form ID
      setSessionFormId(`VAL-MOCK-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`);
      setFormStrengths('');
      setFormIssues('');
      setFormImprovements('');
      setFormActions('');
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Validation Submission Failed',
        message: err.message || 'Failed to record validation session. Check required fields.',
        duration: 5000
      });
    } finally {
      setIsSubmittingValidation(false);
    }
  };

  // Handle Synthetic/Demo Feedback Submit
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/feedback', {
        method: 'POST',
        body: JSON.stringify({
          role,
          usability_rating: usability,
          report_clarity: clarity,
          alert_usefulness: alerts,
          evidence_pack_usefulness: evidence,
          ease_of_navigation: nav,
          comments
        })
      });
      setSubmittedSuccess(true);
      setComments('');
      showToast({
        type: 'success',
        title: 'Feedback Submitted',
        message: 'Evaluation scores and feedback recorded successfully.',
        duration: 4000
      });
      await fetchFeedback();
      setTimeout(() => setSubmittedSuccess(false), 4000);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Submission Failed',
        message: err.message || 'Failed to submit feedback. Please try again.',
        duration: 4000
      });
    }
  };

  // Per-metric averages for synthetic feedback tab
  const computeMetricAverages = (list: FeedbackEntry[]) => {
    if (!list || list.length === 0) return null;
    const avg = (key: keyof FeedbackEntry) =>
      Math.round((list.reduce((sum, fb) => sum + (fb[key] as number), 0) / list.length) * 10) / 10;
    return {
      avg_usability: avg('usability_rating'),
      avg_clarity: avg('report_clarity'),
      avg_alert_usefulness: avg('alert_usefulness'),
      avg_evidence_usefulness: avg('evidence_pack_usefulness'),
      avg_navigation: avg('ease_of_navigation'),
    };
  };

  const metricAverages = feedbackSummary ? computeMetricAverages(feedbackSummary.feedback_list) : null;
  const metricCards = metricAverages ? [
    { label: 'System Usability', value: metricAverages.avg_usability, icon: <Sparkles className="w-4 h-4" />, color: 'purple' },
    { label: 'Report Clarity', value: metricAverages.avg_clarity, icon: <Target className="w-4 h-4" />, color: 'cyan' },
    { label: 'Alert Usefulness', value: metricAverages.avg_alert_usefulness, icon: <BarChart2 className="w-4 h-4" />, color: 'amber' },
    { label: 'Evidence Pack', value: metricAverages.avg_evidence_usefulness, icon: <CheckCircle2 className="w-4 h-4" />, color: 'emerald' },
    { label: 'Ease of Navigation', value: metricAverages.avg_navigation, icon: <Star className="w-4 h-4" />, color: 'rose' },
  ] : [];

  const colorMap: Record<string, string> = {
    purple: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-500/40',
    cyan: 'bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-500/40',
    amber: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/40',
    emerald: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40',
    rose: 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/40',
  };

  const StarBar: React.FC<{ value: number; max?: number }> = ({ value, max = 5 }) => (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className={`w-2.5 h-2.5 rounded-full ${i < value ? 'bg-amber-400' : 'bg-slate-200 dark:bg-slate-700'}`}
        />
      ))}
    </div>
  );

  // Filtered validations list
  const filteredSessions = (validationsData?.sessions || []).filter(session => {
    if (validationFilter === 'REAL') return session.participant_type === 'REAL_STAKEHOLDER';
    if (validationFilter === 'MOCK') return session.participant_type === 'MOCK_STAKEHOLDER';
    if (validationFilter === 'TEMPLATE') return session.participant_type === 'TEMPLATE';
    return true;
  });

  const availableModulesList = [
    'Admin Dashboard & System KPIs',
    'Real-time Telemetry & Cold-Chain Alerts',
    'Shipment & Custody Traceability',
    '1-Click Evidence Pack & SHA-256 Verification',
    'Driver Duty Safety Hard-Blocking',
    'Store-and-Forward Network Disruption Resilience',
    'Missing Data Imputation & Hampel Noise Filtering'
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col transition-colors duration-300 relative overflow-hidden select-none">
      
      {/* Liquid Glass Ambient Glows */}
      <div className="absolute top-10 right-1/4 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/15 rounded-full blur-[100px] pointer-events-none pulse-glow" />
      <div className="absolute bottom-10 left-1/4 w-96 h-96 bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-[100px] pointer-events-none pulse-glow" style={{ animationDelay: '3s' }} />

      {/* Header */}
      <header className="bg-white/90 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-30 backdrop-blur-xl shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onNavigate('LANDING')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer text-xs font-bold shadow-xs"
            >
              <Home className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>← Back to Home</span>
            </button>
            <div>
              <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                STAKEHOLDER VALIDATION & USER FEEDBACK
                <span className="px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 text-xs font-black border border-purple-300 dark:border-purple-500/30">
                  Review 2 Evaluator Directive
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Transparent Verification Workflow — Real Stakeholders, Mock Evaluators & Segregated Test Fixtures
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => onNavigate('COMPLIANCE')}
              className="px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-600/20 hover:bg-emerald-100 dark:hover:bg-emerald-600/30 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
            >
              ← Compliance Hub
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 flex-1 space-y-6 z-10 anim-fade-up">
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 bg-slate-200/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('VALIDATIONS')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                activeTab === 'VALIDATIONS'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                  : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Stakeholder Validation Sessions & Protocol</span>
              {validationsData && (
                <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-mono">
                  {validationsData.counts.total_records}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('SYNTHETIC_FEEDBACK')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                activeTab === 'SYNTHETIC_FEEDBACK'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                  : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Synthetic Test Feedback & Rating Formulas</span>
              {feedbackSummary && (
                <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-300 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono">
                  {feedbackSummary.total_responses}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold pr-2">
            <span className="text-slate-500 dark:text-slate-400">Evaluator Directive Status:</span>
            {validationsData?.evaluator_directive_met ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 text-[11px] font-black flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> SATISFIED (Sessions Documented)
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 text-[11px] font-black flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> PENDING EVALUATION SESSION
              </span>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: STAKEHOLDER VALIDATION WORKFLOW & DOCUMENTED SESSIONS   */}
        {/* ============================================================== */}
        {activeTab === 'VALIDATIONS' && (
          <div className="space-y-6">
            
            {/* Directive Status Card */}
            <div className="glass-card p-6 sm:p-8 rounded-2xl border border-purple-500/30 shadow-xl space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 text-[11px] font-black uppercase tracking-wider border border-purple-300 dark:border-purple-500/30">
                      Evaluator Review 2 Directive
                    </span>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Protocol ID: VAL-PROTOCOL-2026-V1</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    Stakeholder Validation Protocol & Evidence Log
                  </h2>
                  <blockquote className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border-l-4 border-purple-500 text-xs text-purple-900 dark:text-purple-200 font-medium italic leading-relaxed">
                    "Replace simulated-only user-feedback records with at least one documented real/mock stakeholder validation session before the next review."
                  </blockquote>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    This transparent workflow separates synthetic test fixtures from empirical stakeholder sessions. Validation sessions require evaluating live modules with a domain practitioner (Real Stakeholder) or a simulated role-play evaluator (Mock Stakeholder) across 7 standardized interview questions.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
                  <button
                    onClick={() => setShowTemplateModal(true)}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 cursor-pointer shadow-xs transition-all"
                  >
                    <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>View Interview Protocol</span>
                  </button>

                  <button
                    onClick={() => setShowRecordModal(true)}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black cursor-pointer shadow-lg shadow-purple-600/25 transition-all hover:scale-[1.02]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Record Validation Session</span>
                  </button>
                </div>
              </div>

              {/* Categorization Counter Cards */}
              {validationsData && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-500/40 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300">Category C</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="text-2xl font-black text-emerald-900 dark:text-emerald-100">
                      {validationsData.counts.real_stakeholder_sessions}
                    </div>
                    <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">Real Stakeholders</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-300 dark:border-purple-500/40 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-purple-800 dark:text-purple-300">Category B</span>
                      <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="text-2xl font-black text-purple-900 dark:text-purple-100">
                      {validationsData.counts.mock_stakeholder_sessions}
                    </div>
                    <div className="text-[11px] font-bold text-purple-700 dark:text-purple-400">Mock Stakeholders</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-500/40 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-300">Template Specimen</span>
                      <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="text-2xl font-black text-amber-900 dark:text-amber-100">
                      {validationsData.counts.template_records}
                    </div>
                    <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400">Protocol Templates</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">Category A</span>
                      <BarChart2 className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                      {validationsData.counts.synthetic_survey_fixtures}
                    </div>
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Segregated Test Fixtures</div>
                  </div>
                </div>
              )}

              {/* Status Alert Banner */}
              {!validationsData?.evaluator_directive_met ? (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-500/50 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-black text-sm">Action Required for Review: Live Session Pending</div>
                    <p className="leading-relaxed font-medium">
                      The standardized 7-question interview protocol has been fully designed and deployed. To completely satisfy the evaluator directive, an actual evaluation session (either a peer role-playing as a mock stakeholder, or a commercial stakeholder) must be conducted using the protocol and recorded. Click <strong>"Record Validation Session"</strong> above or submit via <code className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900 font-mono text-[11px]">POST /api/validations</code>.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/50 text-emerald-900 dark:text-emerald-200 text-xs flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-black text-sm">Evaluator Directive Satisfied</div>
                    <p className="leading-relaxed font-medium">
                      Documented stakeholder validation sessions are recorded below. Each session includes participant type classification, evaluated modules, verbatim question responses, observed strengths, friction points, and agreed action items.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Filter Tabs & Session Cards */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 bg-slate-200/80 dark:bg-slate-900/80 p-1 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => setValidationFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${validationFilter === 'ALL' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}
                  >
                    All Records ({validationsData?.counts.total_records || 0})
                  </button>
                  <button
                    onClick={() => setValidationFilter('REAL')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${validationFilter === 'REAL' ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}
                  >
                    Real Stakeholders ({validationsData?.counts.real_stakeholder_sessions || 0})
                  </button>
                  <button
                    onClick={() => setValidationFilter('MOCK')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${validationFilter === 'MOCK' ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-400 shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}
                  >
                    Mock Stakeholders ({validationsData?.counts.mock_stakeholder_sessions || 0})
                  </button>
                  <button
                    onClick={() => setValidationFilter('TEMPLATE')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${validationFilter === 'TEMPLATE' ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}
                  >
                    Templates ({validationsData?.counts.template_records || 0})
                  </button>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Showing {filteredSessions.length} record{filteredSessions.length === 1 ? '' : 's'}
                </div>
              </div>

              {/* Session Cards List */}
              <div className="space-y-4">
                {filteredSessions.map((session) => {
                  const isExpanded = expandedSessionId === session.session_id;
                  const isReal = session.participant_type === 'REAL_STAKEHOLDER';
                  const isMock = session.participant_type === 'MOCK_STAKEHOLDER';
                  const isTemplate = session.participant_type === 'TEMPLATE';

                  let responsesList: ValidationQuestionItem[] = [];
                  if (Array.isArray(session.question_responses)) {
                    responsesList = session.question_responses;
                  } else if (typeof session.question_responses === 'string') {
                    try {
                      responsesList = JSON.parse(session.question_responses);
                    } catch {
                      responsesList = [];
                    }
                  }

                  return (
                    <div 
                      key={session.session_id} 
                      className={`glass-card p-5 sm:p-6 rounded-2xl border transition-all ${
                        isReal
                          ? 'border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/10'
                          : isMock
                          ? 'border-purple-500/40 bg-purple-50/20 dark:bg-purple-950/10'
                          : 'border-amber-500/40 bg-amber-50/20 dark:bg-amber-950/10'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {isReal && (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[11px] font-black border border-emerald-300 dark:border-emerald-500/40">
                                🟢 REAL STAKEHOLDER VALIDATION
                              </span>
                            )}
                            {isMock && (
                              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 text-[11px] font-black border border-purple-300 dark:border-purple-500/40">
                                🟣 MOCK STAKEHOLDER EVALUATION
                              </span>
                            )}
                            {isTemplate && (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[11px] font-black border border-amber-300 dark:border-amber-500/40">
                                🟡 UNFILLED INTERVIEW PROTOCOL (TEMPLATE)
                              </span>
                            )}

                            <span className="font-mono text-xs font-black text-slate-800 dark:text-slate-200">
                              {session.session_id}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                              Date: {session.session_date}
                            </span>
                          </div>

                          <h3 className="text-base font-black text-slate-900 dark:text-white pt-1">
                            {session.participant_role}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase ${
                            session.validation_status === 'VALIDATED_RESOLVED'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
                              : session.validation_status === 'CONDUCTED_PENDING_ACTION'
                              ? 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-300'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300'
                          }`}>
                            {session.validation_status.replace(/_/g, ' ')}
                          </span>

                          <button
                            onClick={() => setExpandedSessionId(isExpanded ? null : session.session_id)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer transition-all"
                            title={isExpanded ? 'Collapse Session' : 'Expand Session Details'}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Summary details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3 text-xs">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Evaluation Method:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{session.validation_method}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Modules Evaluated:</span>
                          <div className="flex flex-wrap gap-1">
                            {session.demo_modules_evaluated.split(',').map(m => (
                              <span key={m.trim()} className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-[10px] font-semibold">
                                {m.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Expandable Questionnaire & Observations Section */}
                      {isExpanded && (
                        <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800 anim-fade-in text-xs">
                          
                          {/* 7 Standardized Questions Responses */}
                          {responsesList.length > 0 && (
                            <div className="space-y-2.5">
                              <h4 className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5 tracking-wider">
                                <Target className="w-4 h-4 text-purple-500" />
                                Standardized 7-Domain Interview Responses
                              </h4>
                              <div className="grid grid-cols-1 gap-2.5">
                                {responsesList.map((q, idx) => (
                                  <div key={q.question_id || idx} className="p-3 rounded-xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-1">
                                    <div className="font-bold text-purple-700 dark:text-purple-300 text-[11px]">
                                      Q{idx + 1}: {q.question_text}
                                    </div>
                                    <p className={`text-xs leading-relaxed ${q.response_text?.includes('[UNFILLED') ? 'italic text-amber-600 dark:text-amber-400 font-mono' : 'text-slate-800 dark:text-slate-200 font-medium'}`}>
                                      {q.response_text || '—'}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Qualitative Synthesis Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/30 space-y-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Observed Strengths
                              </span>
                              <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                                {session.observed_strengths}
                              </p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/30 space-y-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" /> Observed Issues / Friction Points
                              </span>
                              <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                                {session.observed_issues}
                              </p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-cyan-50/60 dark:bg-cyan-950/40 border border-cyan-300 dark:border-cyan-500/30 space-y-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-800 dark:text-cyan-300 flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5" /> Suggested Improvements
                              </span>
                              <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                                {session.suggested_improvements}
                              </p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-500/30 space-y-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-purple-800 dark:text-purple-300 flex items-center gap-1">
                                <Shield className="w-3.5 h-3.5" /> Actions Taken or Planned
                              </span>
                              <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                                {session.actions_taken_or_planned}
                              </p>
                            </div>
                          </div>

                          {/* Footer & Evidence Reference */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-slate-400 font-mono">
                            <span className="flex items-center gap-1.5">
                              <ExternalLink className="w-3.5 h-3.5 text-purple-500" />
                              Evidence Artifact: <code className="text-purple-600 dark:text-purple-400 font-bold">{session.evidence_reference || 'docs/validation/evidence/'}</code>
                            </span>
                            <span>Recorded: {session.created_at}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredSessions.length === 0 && (
                  <div className="p-10 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-400 space-y-2">
                    <Shield className="w-8 h-8 mx-auto opacity-40 text-purple-500" />
                    <div className="text-sm font-bold">No sessions match the selected filter.</div>
                    <p className="text-xs">Click "Record Validation Session" to log a new stakeholder evaluation.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: SYNTHETIC TEST FEEDBACK & FORMULA VERIFICATION          */}
        {/* ============================================================== */}
        {activeTab === 'SYNTHETIC_FEEDBACK' && (
          <div className="space-y-6">
            
            {/* Disclaimer Callout Banner */}
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-500/40 text-xs text-amber-900 dark:text-amber-200 space-y-1.5 shadow-sm">
              <div className="flex items-center gap-2 font-black text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Isolated Synthetic Test Records & Mathematical Averages</span>
              </div>
              <p className="leading-relaxed font-medium">
                The entries below are automated demonstration fixtures and app-level survey scores. They serve to verify the live mathematical average calculations, star-rating breakdown formulas, and UI responsiveness. <strong>They are strictly isolated from stakeholder validation and do not count toward stakeholder validation metrics.</strong>
              </p>
            </div>

            {/* Overall Aggregate Banner */}
            {feedbackSummary && (
              <div className="glass-card p-6 sm:p-8 rounded-2xl border border-purple-500/30 shadow-xl space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-950/80 border border-purple-300 dark:border-purple-500/40 flex items-center justify-center text-purple-700 dark:text-purple-300 font-black text-2xl shadow-md">
                      {feedbackSummary.avg_rating}★
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900 dark:text-white">Average Survey Star Rating</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        Based on <span className="font-bold text-purple-700 dark:text-purple-300">{feedbackSummary.total_responses}</span> survey records ({feedbackSummary.synthetic_fixtures_count || 0} synthetic test fixtures)
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3.5 py-1.5 rounded-full bg-purple-50 dark:bg-slate-900 border border-purple-300 dark:border-purple-500/30 text-xs font-bold text-purple-800 dark:text-purple-300 shadow-xs">
                      Key Finding: Automated Evidence Pack vs Manual Baseline Time Saved
                    </span>
                    <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-slate-900 border border-emerald-300 dark:border-emerald-500/30 text-xs font-bold text-emerald-800 dark:text-emerald-300 shadow-xs">
                      Target ≥60% Time Reduction: ACHIEVED
                    </span>
                  </div>
                </div>

                {/* Per-Metric Average Breakdown */}
                {metricCards.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <BarChart2 className="w-4 h-4" />
                      Auto-Calculated Average Scores by Metric
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {metricCards.map(metric => (
                        <div
                          key={metric.label}
                          className={`p-3.5 rounded-xl border text-center space-y-1.5 ${colorMap[metric.color]}`}
                        >
                          <div className="flex justify-center">{metric.icon}</div>
                          <div className="text-[10px] font-black uppercase tracking-wider opacity-80">{metric.label}</div>
                          <div className="text-xl font-black">{metric.value}<span className="text-sm opacity-60">/5</span></div>
                          <div className="flex justify-center">
                            <StarBar value={Math.round(metric.value)} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Submission Form */}
              <form onSubmit={handleFeedbackSubmit} className="glass-panel p-6 sm:p-8 rounded-2xl space-y-4 text-xs shadow-lg">
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-purple-500" />
                  Submit App Rating Entry
                </h2>

                {submittedSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-200 font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Thank you! Your survey entry has been recorded and averages recalculated.</span>
                  </div>
                )}

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1.5">User Role:</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-200 font-semibold focus:border-purple-500 focus:outline-none"
                  >
                    <option value="Compliance Officer">Compliance Officer</option>
                    <option value="Admin / Systems Lead">Admin / Systems Lead</option>
                    <option value="Transport / Fleet Manager">Transport / Fleet Manager</option>
                    <option value="ISO Auditor">ISO Certified Auditor</option>
                    <option value="Customs Inspector">Customs Export Inspector</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4 font-semibold">
                  {[
                    { label: 'System Usability (1–5)', value: usability, setter: setUsability },
                    { label: 'Report Clarity (1–5)', value: clarity, setter: setClarity },
                    { label: 'Alert Usefulness (1–5)', value: alerts, setter: setAlerts },
                    { label: 'Evidence Pack (1–5)', value: evidence, setter: setEvidence },
                  ].map(({ label, value, setter }) => (
                    <div key={label}>
                      <label className="text-slate-700 dark:text-slate-300 block mb-1">{label}:</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={value}
                          onChange={(e) => setter(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))}
                          className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-200 font-bold pr-8"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-400 font-black text-sm">★</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1.5">Ease of Navigation (1–5):</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={nav}
                    onChange={(e) => setNav(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-200 font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1.5">Feedback & Recommendations:</label>
                  <textarea
                    rows={3}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Enter survey comments regarding audit pack clarity, alert usefulness, or usability..."
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-200 font-medium focus:border-purple-500 focus:outline-none leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-600/25 transition-all hover:scale-[1.01]"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Rating Entry</span>
                </button>
              </form>

              {/* Feedback Feed */}
              <div className="glass-panel p-6 sm:p-8 rounded-2xl space-y-4 shadow-lg">
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-500" />
                  Survey Responses Feed
                </h2>

                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {feedbackSummary?.feedback_list?.map((fb: FeedbackEntry) => (
                    <div key={fb.feedback_id} className="p-4 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-purple-700 dark:text-purple-300">{fb.role}</span>
                        <div className="flex items-center gap-2">
                          {fb.is_demo === 1 ? (
                            <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 text-[9px] font-black uppercase">
                              SYNTHETIC FIXTURE
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 text-[9px] font-black uppercase">
                              USER SUBMISSION
                            </span>
                          )}
                          <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{fb.usability_rating}/5 ★</span>
                        </div>
                      </div>

                      {/* Per-entry metric mini-scores */}
                      <div className="grid grid-cols-4 gap-1.5 text-[9px] font-bold">
                        {[
                          { label: 'Usability', val: fb.usability_rating },
                          { label: 'Clarity', val: fb.report_clarity },
                          { label: 'Alerts', val: fb.alert_usefulness },
                          { label: 'Evidence', val: fb.evidence_pack_usefulness },
                        ].map(m => (
                          <div key={m.label} className="bg-slate-200/80 dark:bg-slate-800 rounded-lg p-1.5 text-center">
                            <div className="text-slate-500 dark:text-slate-400">{m.label}</div>
                            <div className="text-amber-600 dark:text-amber-400 font-black">{m.val}/5</div>
                          </div>
                        ))}
                      </div>

                      {fb.comments && (
                        <p className="text-slate-700 dark:text-slate-300 italic font-medium">"{fb.comments}"</p>
                      )}
                      <div className="text-[10px] text-slate-400 font-mono">{fb.submitted_at}</div>
                    </div>
                  ))}

                  {(!feedbackSummary?.feedback_list || feedbackSummary.feedback_list.length === 0) && (
                    <div className="py-8 text-center text-slate-400 dark:text-slate-600 text-xs font-bold">
                      No survey responses submitted yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ============================================================== */}
      {/* MODAL 1: RECORD STAKEHOLDER VALIDATION SESSION                 */}
      {/* ============================================================== */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto anim-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Record Stakeholder Validation Session</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Formal empirical evaluation entry satisfying Review 2 directive</p>
                </div>
              </div>
              <button
                onClick={() => setShowRecordModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleRecordValidationSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
              
              {/* Privacy Warning */}
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong>Privacy & Anonymization Standard:</strong> Do NOT enter personal names, residential addresses, personal phone numbers, or email addresses. Use operational job role titles only.
                </div>
              </div>

              {/* Row 1: Session ID, Date, Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">Session ID:</label>
                  <input
                    type="text"
                    required
                    value={sessionFormId}
                    onChange={(e) => setSessionFormId(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 font-mono text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">Session Date:</label>
                  <input
                    type="date"
                    required
                    value={sessionFormDate}
                    onChange={(e) => setSessionFormDate(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">Participant Type:</label>
                  <select
                    value={sessionFormType}
                    onChange={(e) => setSessionFormType(e.target.value as any)}
                    className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-bold text-purple-700 dark:text-purple-300"
                  >
                    <option value="MOCK_STAKEHOLDER">🟣 Mock Stakeholder (Role-Play Evaluator)</option>
                    <option value="REAL_STAKEHOLDER">🟢 Real Stakeholder (Practitioner)</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Participant Role & Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">Participant Role (No personal names):</label>
                  <select
                    value={sessionFormRole}
                    onChange={(e) => setSessionFormRole(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-semibold mb-1"
                  >
                    <option value="Cold-Chain Quality Assurance Officer">Cold-Chain Quality Assurance Officer</option>
                    <option value="Seafood Export Operations Dispatcher">Seafood Export Operations Dispatcher</option>
                    <option value="Port Health & Customs Export Inspector">Port Health & Customs Export Inspector</option>
                    <option value="Lead ISO 17025 Cold-Chain Auditor">Lead ISO 17025 Cold-Chain Auditor</option>
                    <option value="Fleet Logistics & Safety Supervisor">Fleet Logistics & Safety Supervisor</option>
                    <option value="Custom">Custom Role Title...</option>
                  </select>
                  {sessionFormRole === 'Custom' && (
                    <input
                      type="text"
                      placeholder="e.g. Marine Cargo Surveyor"
                      value={sessionFormCustomRole}
                      onChange={(e) => setSessionFormCustomRole(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-xs font-medium"
                    />
                  )}
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">Validation Method:</label>
                  <select
                    value={sessionFormMethod}
                    onChange={(e) => setSessionFormMethod(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-semibold"
                  >
                    <option value="Cognitive Walkthrough & Task Demonstration">Cognitive Walkthrough & Task Demonstration</option>
                    <option value="Interactive Scenario Simulation (Disruption Injection)">Interactive Scenario Simulation (Disruption Injection)</option>
                    <option value="Guided Feature Usability & Audit Pack Verification">Guided Feature Usability & Audit Pack Verification</option>
                    <option value="Semi-Structured Interview with Live Prototype Walkthrough">Semi-Structured Interview with Live Prototype Walkthrough</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Modules Evaluated */}
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1.5">Demo Modules Evaluated:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-3 rounded-xl bg-slate-100/70 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                  {availableModulesList.map(mod => {
                    const checked = sessionFormModules.includes(mod);
                    return (
                      <label key={mod} className="flex items-center gap-2 cursor-pointer text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            if (checked) {
                              setSessionFormModules(sessionFormModules.filter(m => m !== mod));
                            } else {
                              setSessionFormModules([...sessionFormModules, mod]);
                            }
                          }}
                          className="rounded text-purple-600 focus:ring-purple-500"
                        />
                        <span>{mod}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 7 Core Question Textareas */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black uppercase text-purple-700 dark:text-purple-300 flex items-center gap-1.5 tracking-wider">
                  <Target className="w-4 h-4" />
                  Actual Responses to 7 Standardized Domains
                </h4>

                {[
                  { id: 'Q1_DASHBOARD', label: '1. Ease of Using Dashboard (KPIs, navigation clarity):' },
                  { id: 'Q2_ALERTS', label: '2. Understanding Cold-Chain Alerts (thermal breach clarity, severity tags):' },
                  { id: 'Q3_TRACEABILITY', label: '3. Shipment & Custody Traceability (checkpoints, custody handovers):' },
                  { id: 'Q4_EVIDENCE', label: '4. Evidence Pack Usefulness (1-click generation, SHA-256 verification):' },
                  { id: 'Q5_SAFETY', label: '5. Driver Workload Safety (duty hours & rest enforcement blocking):' },
                  { id: 'Q6_DATA_QUALITY', label: '6. Missing/Noisy Data Handling (Hampel noise filter, imputation tagging):' },
                  { id: 'Q7_IMPROVEMENTS', label: '7. Suggested Improvements (key enhancements requested by participant):' },
                ].map(q => (
                  <div key={q.id}>
                    <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1 text-[11px]">{q.label}</label>
                    <textarea
                      rows={2}
                      value={questionAnswers[q.id] || ''}
                      onChange={(e) => setQuestionAnswers({ ...questionAnswers, [q.id]: e.target.value })}
                      placeholder="Record participant's actual feedback..."
                      className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-200 font-medium focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              {/* Synthesis Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">Observed Strengths:</label>
                  <textarea
                    rows={2}
                    required
                    value={formStrengths}
                    onChange={(e) => setFormStrengths(e.target.value)}
                    placeholder="Key usability wins and positive features noticed..."
                    className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-medium focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">Observed Issues / Friction:</label>
                  <textarea
                    rows={2}
                    required
                    value={formIssues}
                    onChange={(e) => setFormIssues(e.target.value)}
                    placeholder="Points of confusion, ambiguities, or UX friction..."
                    className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-medium focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">Suggested Improvements:</label>
                  <textarea
                    rows={2}
                    required
                    value={formImprovements}
                    onChange={(e) => setFormImprovements(e.target.value)}
                    placeholder="Specific actionable feature suggestions..."
                    className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-medium focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">Actions Taken or Planned:</label>
                  <textarea
                    rows={2}
                    required
                    value={formActions}
                    onChange={(e) => setFormActions(e.target.value)}
                    placeholder="Engineering team response, architecture changes or backlog tickets..."
                    className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-medium focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Validation Status & Evidence Ref */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">Evidence Reference (notes or report file):</label>
                  <input
                    type="text"
                    value={formEvidenceRef}
                    onChange={(e) => setFormEvidenceRef(e.target.value)}
                    placeholder="docs/validation/evidence/<session_id>_notes.md"
                    className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-mono font-medium"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">Validation Status:</label>
                  <select
                    value={formValidationStatus}
                    onChange={(e) => setFormValidationStatus(e.target.value as any)}
                    className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-bold"
                  >
                    <option value="CONDUCTED_PENDING_ACTION">CONDUCTED PENDING ACTION</option>
                    <option value="VALIDATED_RESOLVED">VALIDATED RESOLVED</option>
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingValidation}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/25 transition-all disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmittingValidation ? 'Saving Session...' : 'Save Validation Record'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: VIEW INTERVIEW PROTOCOL TEMPLATE                      */}
      {/* ============================================================== */}
      {showTemplateModal && templateData && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto anim-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">{templateData.title}</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Standardized 7-Domain Interview & Walkthrough Questionnaire</p>
                </div>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 space-y-1">
                <div className="font-black text-xs uppercase tracking-wider">Evaluation Instructions</div>
                <p className="leading-relaxed">{templateData.instructions}</p>
              </div>

              <div className="space-y-2.5">
                <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                  Standardized 7 Questions
                </h4>
                {templateData.questions.map((q, idx) => (
                  <div key={q.question_id} className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-purple-700 dark:text-purple-300 font-bold">
                      <span>Question {idx + 1}: {q.domain}</span>
                      <span className="font-mono text-[10px] text-slate-400">{q.question_id}</span>
                    </div>
                    <div className="font-semibold text-slate-900 dark:text-white text-xs">{q.question_text}</div>
                    <div className="text-[11px] text-slate-500 italic pt-1">{q.response_placeholder}</div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => {
                    setShowTemplateModal(false);
                    setShowRecordModal(true);
                  }}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/25"
                >
                  <Plus className="w-4 h-4" />
                  <span>Start Recording Session with this Template</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
