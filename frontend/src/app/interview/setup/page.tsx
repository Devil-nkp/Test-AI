'use client';
/**
 * PrepVista AI — Interview Setup Page
 * Resume upload, plan selection, duration, and proctoring mode.
 */

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SetupResult {
  session_id: string;
  access_token: string;
  duration_seconds: number;
  max_turns: number;
}

export default function InterviewSetupPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(600);
  const [proctoringMode, setProctoringMode] = useState<'practice' | 'focus'>('practice');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, router, user]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="orb" /></div>;
  if (!user) return null;

  const plan = user.plan;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError('Please upload your resume.'); return; }
    setError('');
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('plan', plan);
      formData.append('duration', String(duration));
      formData.append('proctoring_mode', proctoringMode);

      const result = await api.setupInterview<SetupResult>(formData);
      // Store session info and navigate
      sessionStorage.setItem('pv_session', JSON.stringify(result));
      router.push(`/interview/${result.session_id}`);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to set up interview.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type === 'application/pdf') setFile(dropped);
    else setError('Only PDF files are accepted.');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600" />
            <span className="text-lg font-bold text-slate-900">PrepVista AI</span>
          </Link>
          <span className="text-sm text-slate-400">Setting up your interview</span>
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Start New Interview</h1>
        <p className="text-slate-500 mb-8">Upload your resume and we&#39;ll generate questions based on your experience.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Resume Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Resume (PDF)</label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${file ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-blue-400'}`}
              onClick={() => fileRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              {file ? (
                <div>
                  <p className="text-blue-600 font-medium">📄 {file.name}</p>
                  <p className="text-xs text-slate-400 mt-1">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
              ) : (
                <div>
                  <p className="text-slate-500">Click or drag to upload PDF</p>
                  <p className="text-xs text-slate-400 mt-1">Max 5MB</p>
                </div>
              )}
              <input ref={fileRef} type="file" accept=".pdf" className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Interview Duration</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: 300, label: '5 min' },
                { value: 600, label: '10 min' },
                { value: 900, label: '15 min' },
                { value: 1200, label: '20 min' },
              ].map((opt) => (
                <button key={opt.value} type="button"
                  className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors
                    ${duration === opt.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-blue-300'}`}
                  onClick={() => setDuration(opt.value)}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Proctoring Mode */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Mode</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button"
                className={`p-4 rounded-lg border text-left transition-colors
                  ${proctoringMode === 'practice' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}
                onClick={() => setProctoringMode('practice')}>
                <p className="font-medium text-slate-800 text-sm">Practice Mode</p>
                <p className="text-xs text-slate-500 mt-0.5">No camera. Relaxed. For casual practice.</p>
              </button>
              <button type="button"
                className={`p-4 rounded-lg border text-left transition-colors
                  ${proctoringMode === 'focus' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}
                onClick={() => setProctoringMode('focus')}>
                <p className="font-medium text-slate-800 text-sm">Focus Mode</p>
                <p className="text-xs text-slate-500 mt-0.5">Camera + fullscreen. Simulate real pressure.</p>
              </button>
            </div>
          </div>

          {/* Plan info */}
          <div className="bg-slate-100 rounded-lg p-4 text-sm text-slate-600">
            <p><strong>Plan:</strong> {plan.charAt(0).toUpperCase() + plan.slice(1)}</p>
            <p><strong>Questions:</strong> Up to {plan === 'career' ? '20' : plan === 'pro' ? '16' : '6'}</p>
          </div>

          {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>}

          <button type="submit" className="btn-primary w-full" disabled={submitting || !file}>
            {submitting ? 'Setting up your interview...' : 'Start Interview →'}
          </button>
        </form>
      </div>
    </div>
  );
}
