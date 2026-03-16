'use client';

import Link from 'next/link';
import { LogoMark } from '@/components/logo-mark';
import { ThemeToggle } from '@/components/theme-toggle';
import { useTheme } from '@/lib/theme-context';

const sections = [
  {
    title: 'Information We Collect',
    body: 'We collect account information such as your email address, display name, plan details, and authentication identifiers. When you use PrepVista AI, we also process resume uploads, interview responses, reports, billing status, and limited product analytics required to keep the service secure and improve reliability.',
  },
  {
    title: 'How We Use Your Data',
    body: 'Your data is used to authenticate you, generate resume-grounded interview sessions, score answers, manage subscriptions, enforce quotas, and provide support. We do not sell your personal information. We use trusted service providers such as Supabase for authentication and storage, Stripe for billing, and model providers for interview generation and evaluation.',
  },
  {
    title: 'Camera, Microphone, and Proctoring',
    body: 'Practice and focus modes may access your camera or microphone only after you grant permission in your browser. Media processing for live session feedback is intended to stay local to your device except where a feature explicitly needs backend evaluation. We do not intentionally retain raw webcam recordings unless a future feature clearly tells you otherwise.',
  },
  {
    title: 'Sharing and Subprocessors',
    body: 'We share data only with vendors that help operate the service, including cloud infrastructure, authentication, payments, email, and AI inference providers. Each provider is expected to process data only for the purpose of delivering PrepVista AI services to you.',
  },
  {
    title: 'Retention and Deletion',
    body: 'We retain account data for as long as your account remains active or as required for security, fraud prevention, legal compliance, and dispute resolution. You can request account deletion from settings or by contacting support. Deleted data may persist in backups for a limited period before final removal.',
  },
  {
    title: 'Your Rights',
    body: 'Depending on your location, you may have rights to access, correct, export, or delete your personal information, and to object to certain processing. To exercise these rights, contact us using the information in the Contact section below.',
  },
  {
    title: 'Contact',
    body: 'For privacy questions or data requests, contact PrepVista AI support at privacy@prepvista.ai. If your deployment uses a different support address, update this policy before going live.',
  },
];

export default function PrivacyPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      className={`public-theme min-h-screen overflow-hidden ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
      data-theme={theme}
    >
      <div className="public-aurora" />
      <div className="public-grid" />

      <div className="relative mx-auto max-w-5xl px-6 py-6">
        <nav className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-3">
            <LogoMark size="md" />
            <div>
              <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>PrepVista AI</p>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Privacy-first interview coaching</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className={isDark ? 'btn-secondary text-sm !py-2 !px-4 !bg-slate-900/80 !text-slate-100 !border-slate-700' : 'btn-secondary text-sm !py-2 !px-4'}>
              Log in
            </Link>
          </div>
        </nav>
      </div>

      <main className="relative mx-auto max-w-4xl px-6 pb-20 pt-10">
        <div className={`page-enter rounded-[2rem] border p-8 shadow-[0_25px_100px_rgba(15,23,42,0.12)] ${
          isDark ? 'border-white/10 bg-slate-900/70 backdrop-blur' : 'border-white/80 bg-white/90 backdrop-blur'
        }`}>
          <div className="mb-10 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className={`text-sm font-semibold uppercase tracking-[0.24em] ${isDark ? 'text-sky-300' : 'text-blue-600'}`}>
                Privacy Policy
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight">How PrepVista AI handles your data</h1>
              <p className={`mt-4 max-w-2xl text-sm leading-7 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Effective date: March 16, 2026. This policy explains what we collect, why we collect it,
                how we protect it, and the choices you have when using PrepVista AI.
              </p>
            </div>
            <Link href="/" className={isDark ? 'btn-secondary text-sm !py-2 !px-4 !bg-slate-950/70 !text-slate-100 !border-slate-700' : 'btn-secondary text-sm !py-2 !px-4'}>
              Back to home
            </Link>
          </div>

          <div className="space-y-8">
            {sections.map((section, index) => (
              <section key={section.title} className={`page-enter-delay-${Math.min(index + 1, 4)}`}>
                <h2 className="text-xl font-semibold tracking-tight">{section.title}</h2>
                <p className={`mt-3 text-sm leading-7 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{section.body}</p>
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
