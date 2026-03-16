'use client';
/**
 * PrepVista AI — Landing Page
 * Public marketing page with hero, features, how-it-works, pricing preview.
 */

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      {/* ── Nav ── */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600" />
          <span className="text-xl font-bold text-slate-900">PrepVista AI</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/pricing" className="text-sm text-slate-600 hover:text-blue-600 transition-colors">Pricing</Link>
          {user ? (
            <Link href="/dashboard" className="btn-primary text-sm !py-2 !px-5">Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="text-sm text-slate-600 hover:text-blue-600 transition-colors">Log in</Link>
              <Link href="/login?mode=signup" className="btn-primary text-sm !py-2 !px-5">Start Free →</Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="text-center px-6 pt-16 pb-20 max-w-4xl mx-auto">
        <div className="inline-block mb-6 px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
          AI Interview Coaching Platform
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
          Practice interviews that are<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">actually about you.</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Upload your resume. Answer real voice questions grounded in your experience.
          Get a scored report showing exactly how you should have answered.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href={user ? "/dashboard" : "/login?mode=signup"} className="btn-primary text-lg !py-3.5 !px-8">
            Start Free Interview →
          </Link>
          <Link href="/pricing" className="btn-secondary text-lg !py-3.5 !px-8">
            View Plans
          </Link>
        </div>
        <p className="mt-4 text-sm text-slate-400">No credit card required. 2 free interviews/month.</p>

        {/* Orb preview */}
        <div className="mt-16 flex justify-center">
          <div className="orb" />
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="bg-slate-50 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-4">How It Works</h2>
          <p className="text-center text-slate-500 mb-12">Three steps to better interview performance.</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Upload Your Resume", desc: "We generate questions based on your actual projects, skills, and experience — not a generic question bank." },
              { step: "2", title: "Voice Interview", desc: "Speak your answers naturally. Our AI interviewer adapts follow-up questions based on what you say." },
              { step: "3", title: "Get Coached", desc: "See your score, per-question breakdown, and exactly how you should have answered each question." },
            ].map((item) => (
              <div key={item.step} className="card text-center">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 font-bold text-xl flex items-center justify-center mx-auto mb-5">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">Why PrepVista AI?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: "Resume-Grounded Questions", desc: "Every question comes from YOUR experience. No generic prompts." },
              { title: "Per-Question Scoring", desc: "Rubric-based evaluation with specific feedback on what's missing." },
              { title: "Ideal Answer Coaching", desc: "See exactly what a strong answer looks like — for every question." },
              { title: "Skill Tracking", desc: "Monitor your improvement across sessions and focus on weak areas." },
              { title: "Focus Mode", desc: "Camera and fullscreen monitoring to simulate real interview pressure." },
              { title: "Privacy First", desc: "Camera and mic streams are processed locally. Never sent to our servers." },
            ].map((f) => (
              <div key={f.title} className="card flex gap-4">
                <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">{f.title}</h3>
                  <p className="text-slate-500 text-sm">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust ── */}
      <section className="bg-slate-900 text-white py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-6">Built for Trust</h2>
          <div className="grid sm:grid-cols-3 gap-6 text-sm">
            <div className="bg-slate-800 rounded-lg p-5">
              <p className="font-semibold mb-1">🎥 Local Processing</p>
              <p className="text-slate-400">Camera and microphone streams are processed in your browser and never sent to our servers.</p>
            </div>
            <div className="bg-slate-800 rounded-lg p-5">
              <p className="font-semibold mb-1">🔒 Encrypted Storage</p>
              <p className="text-slate-400">Your resume text is encrypted at rest and used only to generate interview questions.</p>
            </div>
            <div className="bg-slate-800 rounded-lg p-5">
              <p className="font-semibold mb-1">🗑️ Delete Anytime</p>
              <p className="text-slate-400">Delete all your data anytime from account settings. No questions asked.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-6 text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-4">Ready to practice?</h2>
        <p className="text-slate-500 mb-8">Start your first interview free. No credit card, no commitment.</p>
        <Link href={user ? "/dashboard" : "/login?mode=signup"} className="btn-primary text-lg !py-3.5 !px-8">
          Start Free Interview →
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600" />
            <span className="font-semibold text-slate-700">PrepVista AI</span>
          </div>
          <div className="flex gap-6 text-sm text-slate-400">
            <Link href="/pricing" className="hover:text-slate-600">Pricing</Link>
            <a href="#" className="hover:text-slate-600">Privacy Policy</a>
            <a href="#" className="hover:text-slate-600">Terms</a>
          </div>
          <p className="text-sm text-slate-400">© 2026 PrepVista AI</p>
        </div>
      </footer>
    </div>
  );
}
