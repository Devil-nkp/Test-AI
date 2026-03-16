'use client';
/**
 * PrepVista AI — Interview Report Page
 * Detailed post-interview report with score, rubric, per-question breakdown.
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface QuestionEval {
  turn: number; category: string; question: string; answer: string;
  classification: string; score: number; scoring_rationale: string | null;
  missing_elements: string[] | null; ideal_answer: string | null;
  communication_score: number; communication_notes: string | null;
  locked?: boolean;
}

interface ReportData {
  session_id: string; plan: string; final_score: number; interpretation: string;
  rubric_scores: Record<string, number> | null; strengths: string[];
  weaknesses: string[]; questions: QuestionEval[];
  total_questions: number; duration_seconds: number;
  has_pdf: boolean; has_ideal_answers: boolean; has_rubric_breakdown: boolean;
  proctoring_mode: string; proctoring_violations_count: number;
  created_at: string;
}

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const sessionId = params.sessionId as string;
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    api.getReport<ReportData>(sessionId)
      .then((data) => setReport(data))
      .catch(() => router.push('/dashboard'))
      .finally(() => setLoading(false));
  }, [router, sessionId, user]);

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const blob = await api.downloadPDF(sessionId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `PrepVista_Report_${sessionId.slice(0, 8)}.pdf`;
      a.click(); URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const error = err as Error;
      alert(error.message);
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="orb" /></div>;
  if (!report) return null;

  const scoreColor = report.final_score >= 70 ? '#22c55e' : report.final_score >= 50 ? '#eab308' : '#ef4444';
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600" />
            <span className="text-lg font-bold text-slate-900">PrepVista AI</span>
          </Link>
          <div className="flex gap-3">
            {report.has_pdf && (
              <button onClick={handleDownloadPdf} disabled={downloadingPdf} className="btn-secondary text-sm !py-2">
                {downloadingPdf ? 'Downloading...' : '📄 Download PDF'}
              </button>
            )}
            <Link href="/interview/setup" className="btn-primary text-sm !py-2">Practice Again</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Score Card */}
        <div className="card text-center mb-8"
             style={{ background: report.final_score >= 70 ? '#f0fdf4' : report.final_score >= 50 ? '#fefce8' : '#fef2f2' }}>
          <p className="text-sm text-slate-500 mb-2">Interview Score</p>
          <p className="text-6xl font-bold mb-2" style={{ color: scoreColor }}>
            {Math.round(report.final_score)}
          </p>
          <p className="text-sm text-slate-600">{report.interpretation}</p>
          <p className="text-xs text-slate-400 mt-2">
            {new Date(report.created_at).toLocaleDateString()} · {report.plan.toUpperCase()} Plan · {report.total_questions} questions
          </p>
        </div>

        {/* Rubric Breakdown */}
        {report.has_rubric_breakdown && report.rubric_scores && (
          <div className="card mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Category Breakdown</h2>
            {Object.entries(report.rubric_scores).map(([cat, score]) => {
              const pct = Math.min(100, score * 10);
              const barColor = pct >= 70 ? '#22c55e' : pct >= 50 ? '#eab308' : '#ef4444';
              return (
                <div key={cat} className="rubric-bar-container">
                  <span className="text-sm text-slate-600 w-40 capitalize">{cat.replace('_', ' ')}</span>
                  <div className="rubric-bar-bg">
                    <div className="rubric-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 w-12 text-right">{score}/10</span>
                </div>
              );
            })}
          </div>
        )}

        {!report.has_rubric_breakdown && (
          <div className="card mb-6 relative">
            <div className="locked-content">
              <h2 className="text-lg font-semibold mb-4">Category Breakdown</h2>
              <div className="rubric-bar-container"><span className="w-40">Technical</span><div className="rubric-bar-bg"><div className="rubric-bar-fill" style={{width:'60%',background:'#eab308'}}/></div></div>
            </div>
            <div className="locked-overlay">
              <div className="text-center">
                <p className="font-medium text-slate-700 mb-2">🔒 Upgrade for rubric breakdown</p>
                <Link href="/pricing" className="btn-primary text-sm !py-2">View Plans →</Link>
              </div>
            </div>
          </div>
        )}

        {/* Strengths & Weaknesses */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="card">
            <h3 className="font-semibold text-slate-900 mb-3">✅ Strengths</h3>
            <ul className="space-y-1.5">
              {(report.strengths.length > 0 ? report.strengths : ['Practice more to identify strengths']).map((s, i) => (
                <li key={i} className="text-sm text-slate-600">{s}</li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h3 className="font-semibold text-slate-900 mb-3">⚠️ Focus Areas</h3>
            <ul className="space-y-1.5">
              {(report.weaknesses.length > 0 ? report.weaknesses : ['Great job! Keep practicing.']).map((w, i) => (
                <li key={i} className="text-sm text-slate-600">{w}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Per-Question Breakdown */}
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Per-Question Breakdown</h2>
        <div className="space-y-4 mb-12">
          {report.questions.map((q, i) => (
            <div key={i} className="card">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-blue-600 font-bold text-sm">Q{q.turn + 1}</span>
                <span className="text-xs text-slate-400 capitalize">{q.category?.replace('_', ' ')}</span>
                <span className={`cls-badge ${q.classification}`}>{q.classification}</span>
                <span className="ml-auto font-semibold text-sm">{q.score}/10</span>
              </div>

              <p className="text-sm text-slate-800 mb-2"><strong>Question:</strong> {q.question}</p>
              <p className="text-sm text-slate-600 mb-2"><strong>Your Answer:</strong> {q.answer || 'No answer provided'}</p>

              {q.scoring_rationale && (
                <p className="text-sm text-slate-500 mb-2"><strong>Assessment:</strong> {q.scoring_rationale}</p>
              )}

              {q.missing_elements && q.missing_elements.length > 0 && (
                <p className="text-sm text-orange-600 mb-2">
                  <strong>Missing:</strong> {q.missing_elements.join(', ')}
                </p>
              )}

              {q.ideal_answer && !q.locked && (
                <div className="bg-blue-50 border-l-3 border-blue-500 p-3 rounded-r-lg mt-3">
                  <p className="text-sm text-blue-800"><strong>💡 Ideal Answer:</strong> {q.ideal_answer}</p>
                </div>
              )}

              {q.locked && (
                <div className="bg-slate-100 p-3 rounded-lg mt-3 text-center">
                  <p className="text-sm text-slate-500">🔒 <Link href="/pricing" className="text-blue-600 hover:underline">Upgrade to Pro</Link> to see ideal answers and coaching</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center py-8">
          <Link href="/interview/setup" className="btn-primary text-lg !py-3 !px-8">
            Practice Again →
          </Link>
          <p className="text-sm text-slate-400 mt-3">
            <Link href="/dashboard" className="hover:underline">← Back to Dashboard</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
