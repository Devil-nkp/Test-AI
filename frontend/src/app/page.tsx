'use client';
/**
 * PrepVista AI - Landing Page
 * Public marketing page with polished motion, pricing preview, and trust messaging.
 */

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { ThemeToggle } from '@/components/theme-toggle';
import { LogoMark } from '@/components/logo-mark';

const featureCards = [
  {
    title: 'Resume-grounded questions',
    desc: 'Every interview is tailored to your projects, tools, wins, and tradeoffs so the practice feels real.',
  },
  {
    title: 'Actionable scoring',
    desc: 'See which answers lacked ownership, technical depth, structure, or confidence so improvement is obvious.',
  },
  {
    title: 'Voice-first practice',
    desc: 'Answer out loud, keep your flow, and build the delivery rhythm that text-based prep usually misses.',
  },
  {
    title: 'Focus mode simulation',
    desc: 'Practice under light pressure with fullscreen and camera checks so interviews feel calmer later.',
  },
];

const planPreview = [
  { name: 'Free', price: '$0', detail: 'You have 2 free interviews/month.', accent: false },
  { name: 'Pro', price: '$19', detail: 'Rubrics, ideal answers, PDF exports, and more depth.', accent: true },
  { name: 'Career', price: '$39', detail: 'Built for daily practice loops during active job search.', accent: false },
];

export default function HomePage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      className={`public-theme min-h-screen overflow-hidden ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900'
      }`}
      data-theme={theme}
    >
      <div className="public-aurora" />
      <div className="public-grid" />

      <div className="relative mx-auto max-w-6xl px-6 py-5">
        <nav className="page-enter flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-3">
            <LogoMark size="md" />
            <div>
              <span className={`block text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                PrepVista AI
              </span>
              <span className={`block text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Interview practice that sounds like you
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/pricing" className={`hidden text-sm sm:inline ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-blue-600'}`}>
              Pricing
            </Link>
            {user ? (
              <Link href="/dashboard" className="btn-primary text-sm !px-5 !py-2.5">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className={`hidden text-sm sm:inline ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-blue-600'}`}>
                  Log in
                </Link>
                <Link href="/login?mode=signup" className="btn-primary text-sm !px-5 !py-2.5">
                  Start free
                </Link>
              </>
            )}
          </div>
        </nav>

        <section className="relative pt-14 pb-18">
          <div className="grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="page-enter-delay-1">
              <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${
                isDark
                  ? 'border-sky-400/20 bg-sky-400/10 text-sky-200'
                  : 'border-blue-100 bg-blue-50 text-blue-700'
              }`}>
                <span className={`h-2.5 w-2.5 rounded-full ${isDark ? 'bg-sky-300' : 'bg-blue-500'}`} />
                AI interview coaching platform
              </span>

              <h1 className="mt-7 max-w-3xl text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
                Practice interviews that feel
                <span className={`block ${isDark ? 'text-sky-300' : 'text-blue-600'}`}>specific, sharp, and believable.</span>
              </h1>

              <p className={`mt-6 max-w-2xl text-lg leading-8 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Upload your resume, answer voice-first questions, and get coaching that surfaces missing detail,
                vague ownership, weak structure, and stronger ideal answers.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link href={user ? '/dashboard' : '/login?mode=signup'} className="btn-primary text-base !px-7 !py-3.5">
                  {user ? 'Go to dashboard' : 'Start free interview'}
                </Link>
                <Link href="/pricing" className={isDark ? 'btn-secondary text-base !px-7 !py-3.5 !bg-slate-900/70 !text-slate-100 !border-slate-700' : 'btn-secondary text-base !px-7 !py-3.5'}>
                  Explore plans
                </Link>
              </div>

              <p className={`mt-5 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                You have 2 free interviews/month.
              </p>

              <div className="mt-9 flex flex-wrap gap-6 text-sm">
                {['Resume-based questions', 'Voice practice', 'Scored report', 'Calm, professional UI'].map((item) => (
                  <div key={item} className={`inline-flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    <span className={`h-2 w-2 rounded-full ${isDark ? 'bg-sky-300' : 'bg-blue-500'}`} />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="page-enter-delay-2">
              <div className={`theme-rings relative overflow-hidden rounded-[2rem] border p-7 shadow-[0_30px_100px_rgba(15,23,42,0.18)] ${
                isDark ? 'border-white/10 bg-slate-900/70 backdrop-blur' : 'border-white/80 bg-white/90 backdrop-blur'
              }`}>
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/70 to-transparent" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${isDark ? 'text-sky-200' : 'text-blue-600'}`}>
                      Live interview preview
                    </p>
                    <p className={`mt-2 text-sm ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                      Your interviewer adapts in real time.
                    </p>
                  </div>
                  <div className="relative">
                    <div className="orb" />
                  </div>
                </div>

                <div className="mt-8 space-y-4">
                  {[
                    'Tell me about the hardest production bug you owned end-to-end.',
                    'Why did you choose that architecture and what would you change now?',
                    'If this same incident happened tomorrow, how would you shorten recovery time?',
                  ].map((question, index) => (
                    <div
                      key={question}
                      className={`rounded-2xl border px-4 py-4 page-enter-delay-${Math.min(index + 1, 4)} ${
                        index === 0
                          ? isDark
                            ? 'border-sky-400/20 bg-sky-400/10'
                            : 'border-blue-100 bg-blue-50'
                          : isDark
                            ? 'border-white/8 bg-white/5'
                            : 'border-slate-100 bg-slate-50'
                      }`}
                    >
                      <p className={`text-sm leading-7 ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>{question}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {[
                    ['Ownership', '9.1/10'],
                    ['Structure', '8.4/10'],
                    ['Specificity', '7.8/10'],
                  ].map(([label, value]) => (
                    <div key={label} className={`rounded-2xl border px-4 py-4 ${isDark ? 'border-white/10 bg-slate-950/60' : 'border-slate-100 bg-white'}`}>
                      <p className={`text-xs uppercase tracking-[0.2em] ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>{label}</p>
                      <p className="mt-2 text-2xl font-semibold">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 py-10 md:grid-cols-2 xl:grid-cols-4">
          {featureCards.map((card, index) => (
            <div
              key={card.title}
              className={`page-enter-delay-${Math.min(index + 1, 4)} rounded-[1.5rem] border p-6 ${
                isDark ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.06)]'
              }`}
            >
              <div className={`mb-4 h-11 w-11 rounded-2xl ${isDark ? 'bg-sky-400/12 text-sky-200' : 'bg-blue-50 text-blue-700'} flex items-center justify-center text-lg`}>
                {index + 1}
              </div>
              <h2 className="text-lg font-semibold">{card.title}</h2>
              <p className={`mt-3 text-sm leading-7 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{card.desc}</p>
            </div>
          ))}
        </section>

        <section className="py-12">
          <div className={`page-enter rounded-[2rem] border p-8 ${
            isDark ? 'border-white/10 bg-slate-900/70' : 'border-slate-100 bg-slate-50'
          }`}>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className={`text-sm font-semibold uppercase tracking-[0.24em] ${isDark ? 'text-sky-300' : 'text-blue-600'}`}>
                  Pricing
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight">Clear plans that scale with your prep</h2>
                <p className={`mt-3 max-w-2xl text-sm leading-7 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Start free, then unlock deeper reports, longer interviews, and richer coaching when you need it.
                </p>
              </div>
              <Link href="/pricing" className={isDark ? 'btn-secondary !px-5 !py-2.5 !bg-slate-950/70 !text-slate-100 !border-slate-700' : 'btn-secondary !px-5 !py-2.5'}>
                Open pricing
              </Link>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {planPreview.map((plan, index) => (
                <div
                  key={plan.name}
                  className={`page-enter-delay-${Math.min(index + 1, 4)} rounded-[1.6rem] border p-6 ${
                    plan.accent
                      ? isDark
                        ? 'border-sky-400/30 bg-[linear-gradient(180deg,rgba(14,165,233,0.16),rgba(15,23,42,0.86))] shadow-[0_24px_80px_rgba(56,189,248,0.16)]'
                        : 'border-blue-200 bg-[linear-gradient(180deg,#eff6ff,#ffffff)] shadow-[0_24px_70px_rgba(37,99,235,0.12)]'
                      : isDark
                        ? 'border-white/10 bg-white/5'
                        : 'border-slate-100 bg-white'
                  }`}
                >
                  {plan.accent && (
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                      isDark ? 'bg-sky-400/15 text-sky-200' : 'bg-blue-100 text-blue-700'
                    }`}>
                      Most popular
                    </span>
                  )}
                  <h3 className="mt-4 text-2xl font-semibold">{plan.name}</h3>
                  <p className="mt-3 text-4xl font-semibold tracking-tight">{plan.price}</p>
                  <p className={`mt-4 text-sm leading-7 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{plan.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14">
          <div className={`page-enter rounded-[2rem] border px-8 py-10 text-center ${
            isDark ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-white shadow-[0_16px_70px_rgba(15,23,42,0.06)]'
          }`}>
            <h2 className="text-3xl font-semibold tracking-tight">Ready to hear your answers get sharper?</h2>
            <p className={`mx-auto mt-4 max-w-2xl text-sm leading-7 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Start with a free session, see where your delivery breaks down, and build momentum with clear coaching.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link href={user ? '/dashboard' : '/login?mode=signup'} className="btn-primary text-base !px-7 !py-3.5">
                {user ? 'Open dashboard' : 'Create free account'}
              </Link>
              <Link href="/pricing" className={isDark ? 'btn-secondary text-base !px-7 !py-3.5 !bg-slate-950/70 !text-slate-100 !border-slate-700' : 'btn-secondary text-base !px-7 !py-3.5'}>
                Compare plans
              </Link>
            </div>
          </div>
        </section>

        <footer className={`flex flex-col items-center justify-between gap-5 border-t py-8 text-sm sm:flex-row ${
          isDark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'
        }`}>
          <div className="inline-flex items-center gap-3">
            <LogoMark size="sm" />
            <span className="font-medium">PrepVista AI</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <Link href="/pricing" className="hover:text-inherit">Pricing</Link>
            <Link href="/privacy" className="hover:text-inherit">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-inherit">Terms</Link>
          </div>
          <p>(c) 2026 PrepVista AI</p>
        </footer>
      </div>
    </div>
  );
}
