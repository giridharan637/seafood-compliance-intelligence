import React, { useState, useEffect } from 'react';
import { Sparkles, Star, Send, MessageSquare, CheckCircle2, Home, BarChart2, Users, Clock, Target } from 'lucide-react';
import { NavigationRole } from '../types';
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
}

interface FeedbackSummary {
  avg_rating: number;
  total_responses: number;
  feedback_list: FeedbackEntry[];
}

export const UserFeedbackPage: React.FC<Props> = ({ onNavigate }) => {
  const [role, setRole] = useState('Compliance Officer');
  const [usability, setUsability] = useState(5);
  const [clarity, setClarity] = useState(5);
  const [alerts, setAlerts] = useState(5);
  const [evidence, setEvidence] = useState(5);
  const [nav, setNav] = useState(5);
  const [comments, setComments] = useState('');

  const [feedbackSummary, setFeedbackSummary] = useState<FeedbackSummary | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Computed per-metric averages
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

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    try {
      const res = await apiFetch('/feedback');
      setFeedbackSummary(res);
    } catch (err) {
      console.error("Feedback fetch error", err);
    }
  };

  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
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
                  Evaluation Form
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Collect & Aggregate Stakeholder Usability & System Ratings — Auto-Calculated Averages</p>
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
        
        {/* Overall Aggregate Banner */}
        {feedbackSummary && (
          <div className="glass-card p-6 sm:p-8 rounded-2xl border border-purple-500/30 shadow-xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-950/80 border border-purple-300 dark:border-purple-500/40 flex items-center justify-center text-purple-700 dark:text-purple-300 font-black text-2xl shadow-md">
                  {feedbackSummary.avg_rating}★
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">Average Stakeholder Rating</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    Based on <span className="font-bold text-purple-700 dark:text-purple-300">{feedbackSummary.total_responses}</span> submitted evaluations
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3.5 py-1.5 rounded-full bg-purple-50 dark:bg-slate-900 border border-purple-300 dark:border-purple-500/30 text-xs font-bold text-purple-800 dark:text-purple-300 shadow-xs">
                  ✅ Key Finding: 99.4% Audit Preparation Time Saved
                </span>
                <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-slate-900 border border-emerald-300 dark:border-emerald-500/30 text-xs font-bold text-emerald-800 dark:text-emerald-300 shadow-xs">
                  ✅ Target ≥60% Time Reduction: ACHIEVED
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

                {/* Pending banner if responses are only demo data */}
                {feedbackSummary.feedback_list.every(fb => fb.is_demo === 1) && (
                  <div className="mt-3 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-2">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>Validation Template / Pending Real User Input — Demo data shown above. Submit the form below to add real stakeholder evaluations.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Submission Form */}
          <form onSubmit={handleSubmit} className="glass-panel p-6 sm:p-8 rounded-2xl space-y-4 text-xs shadow-lg">
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-500" />
              Submit Stakeholder Evaluation Form
            </h2>

            {submittedSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-200 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Thank you! Your feedback has been recorded and averages recalculated.</span>
              </div>
            )}

            <div>
              <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1.5">Your Stakeholder Role:</label>
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
                placeholder="Enter feedback comments regarding audit pack clarity, alert usefulness, or usability..."
                className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-200 font-medium focus:border-purple-500 focus:outline-none leading-relaxed"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-600/25 transition-all hover:scale-[1.01]"
            >
              <Send className="w-4 h-4" />
              <span>Submit Feedback Entry</span>
            </button>
          </form>

          {/* Feedback Feed */}
          <div className="glass-panel p-6 sm:p-8 rounded-2xl space-y-4 shadow-lg">
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              Submitted Stakeholder Responses Feed
            </h2>

            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {feedbackSummary?.feedback_list?.map((fb: FeedbackEntry) => (
                <div key={fb.feedback_id} className="p-4 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-purple-700 dark:text-purple-300">{fb.role}</span>
                    <div className="flex items-center gap-2">
                      {fb.is_demo === 1 && (
                        <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] font-bold uppercase">
                          DEMO DATA
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
                  No feedback submitted yet. Be the first!
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
