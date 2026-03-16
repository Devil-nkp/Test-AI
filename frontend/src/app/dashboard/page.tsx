'use client';
/**
 * PrepVista AI — Dashboard
 * Authenticated home: stats, recent sessions, usage, quick-start.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface DashboardData {
  user: { name: string; plan: string; onboarding_completed: boolean; prep_goal: string };
  stats: { total_sessions: number; average_score: number | null };
  usage: { plan: string; used: number; limit: number; remaining: number };
  recent_sessions: Array<{
    id: string; plan: string; score: number | null; state: string;
    total_turns: number; duration: number; created_at: string;
  }>;
  skill_scores: Record<string, { score: number }>;
}

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      api.getDashboard()
        .then(setData)
        .catch(console.error)
        .finally(() => setLoadingData(false));
    }
  }, [user, loading, router]);

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="orb" />
      </div>
    );
  }

  if (!user || !data) return null;

  const planColors: Record<string, string> = {
    free: 'bg-slate-100 text-slate-600',
    pro: 'bg-blue-100 text-blue-700',
    career: 'bg-indigo-100 text-indigo-700',
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600" />
            <span className="text-lg font-bold text-slate-900">PrepVista AI</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-medium text-blue-600">Dashboard</Link>
            <Link href="/settings" className="text-sm text-slate-500 hover:text-slate-700">Settings</Link>
            <button onClick={logout} className="text-sm text-slate-400 hover:text-red-500">Log out</button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Welcome back{data.user.name ? `, ${data.user.name}` : ''}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${planColors[data.user.plan] || planColors.free}`}>
                {data.user.plan.toUpperCase()} PLAN
              </span>
              <span className="text-sm text-slate-500">
                {data.usage.used} of {data.usage.limit >= 9999 ? '∞' : data.usage.limit} interviews used this month
              </span>
            </div>
          </div>
          <Link href="/interview/setup" className="btn-primary">
            ▶ Start New Interview
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="card">
            <p className="text-sm text-slate-500 mb-1">Total Sessions</p>
            <p className="text-3xl font-bold text-slate-900">{data.stats.total_sessions}</p>
          </div>
          <div className="card">
            <p className="text-sm text-slate-500 mb-1">Average Score</p>
            <p className="text-3xl font-bold text-slate-900">
              {data.stats.average_score ? `${data.stats.average_score}` : '—'}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-slate-500 mb-1">Remaining Interviews</p>
            <p className="text-3xl font-bold text-slate-900">
              {data.usage.remaining >= 9999 ? '∞' : data.usage.remaining}
            </p>
            {data.usage.remaining === 0 && data.user.plan === 'free' && (
              <Link href="/pricing" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                Upgrade for more →
              </Link>
            )}
          </div>
        </div>

        {/* Skills */}
        {Object.keys(data.skill_scores).length > 0 && (
          <div className="card mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Skill Breakdown</h2>
            {Object.entries(data.skill_scores).map(([category, { score }]) => {
              const pct = Math.min(100, score * 10);
              const color = pct >= 70 ? '#22c55e' : pct >= 50 ? '#eab308' : '#ef4444';
              return (
                <div key={category} className="rubric-bar-container">
                  <span className="text-sm text-slate-600 w-40 capitalize">{category.replace('_', ' ')}</span>
                  <div className="rubric-bar-bg">
                    <div className="rubric-bar-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 w-12 text-right">{score}/10</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Recent Sessions */}
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Sessions</h2>
          {data.recent_sessions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 mb-4">No interviews yet. Start your first one!</p>
              <Link href="/interview/setup" className="btn-primary text-sm">Start Interview</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recent_sessions.map((s) => {
                const scoreClass = s.score && s.score >= 70 ? 'excellent' : s.score && s.score >= 50 ? 'good' : s.score && s.score >= 30 ? 'needs-work' : 'early';
                return (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-4">
                      {s.score !== null ? (
                        <div className={`score-badge ${scoreClass}`}>{Math.round(s.score)}</div>
                      ) : (
                        <div className="score-badge bg-slate-300">—</div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          {s.plan.charAt(0).toUpperCase() + s.plan.slice(1)} Interview
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(s.created_at).toLocaleDateString()} · {s.total_turns} questions
                          {s.state === 'TERMINATED' && ' · Terminated'}
                        </p>
                      </div>
                    </div>
                    {s.state === 'FINISHED' && (
                      <Link href={`/interview/${s.id}/report`} className="text-sm text-blue-600 hover:underline font-medium">
                        View Report →
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
