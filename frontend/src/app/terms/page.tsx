'use client';

import Link from 'next/link';
import { LogoMark } from '@/components/logo-mark';
import { ThemeToggle } from '@/components/theme-toggle';
import { useTheme } from '@/lib/theme-context';

const sections = [
  {
    title: 'Using the Service',
    body: 'PrepVista AI is designed to help you practice interviews and improve communication. You agree to use the service lawfully, protect your credentials, and avoid uploading content you do not have permission to use.',
  },
  {
    title: 'Accounts and Eligibility',
    body: 'You are responsible for all activity under your account. If you sign in with Google or another provider, you authorize PrepVista AI to rely on that provider for authentication. You must provide accurate registration information and keep it up to date.',
  },
  {
    title: 'Plans, Trials, and Billing',
    body: 'Free plans include limited interviews each month. Paid plans renew automatically until canceled and are billed through our payment processor. Fees, taxes, renewal dates, and plan features are displayed at checkout. You can manage or cancel subscriptions from your settings page or billing portal.',
  },
  {
    title: 'AI Output and Coaching Limits',
    body: 'Interview prompts, feedback, and ideal answers are generated automatically and may not always be complete, correct, or suitable for every role. You remain responsible for how you use the output. PrepVista AI is a preparation tool, not a hiring guarantee or legal advisor.',
  },
  {
    title: 'Acceptable Use',
    body: 'You may not use the service to violate laws, infringe intellectual property rights, attempt to access other users\' data, reverse engineer protected components, or overload the platform. We may suspend access to protect the service, other users, or our vendors.',
  },
  {
    title: 'Termination',
    body: 'You may stop using the service at any time. We may suspend or terminate access if you breach these terms, create risk for other users, or if we need to comply with legal obligations. Sections that should reasonably survive termination, including payment, ownership, and limitation clauses, continue to apply.',
  },
  {
    title: 'Contact',
    body: 'Questions about these terms can be sent to legal@prepvista.ai. Update this address before launch if you use a different support inbox in production.',
  },
];

export default function TermsPage() {
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
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Fair use, clear expectations</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/pricing" className={isDark ? 'btn-secondary text-sm !py-2 !px-4 !bg-slate-900/80 !text-slate-100 !border-slate-700' : 'btn-secondary text-sm !py-2 !px-4'}>
              Pricing
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
                Terms of Service
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight">The rules that keep PrepVista AI reliable</h1>
              <p className={`mt-4 max-w-2xl text-sm leading-7 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Effective date: March 16, 2026. These terms govern access to the PrepVista AI product,
                paid plans, and any related services or content we provide.
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
