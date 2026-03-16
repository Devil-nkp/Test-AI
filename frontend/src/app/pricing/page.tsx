'use client';
/**
 * PrepVista AI - Pricing Page
 */

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogoMark } from '@/components/logo-mark';
import { ThemeToggle } from '@/components/theme-toggle';
import { useTheme } from '@/lib/theme-context';

interface CheckoutResult {
  checkout_url: string;
}

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    desc: 'Start with guided practice and test the full flow before upgrading.',
    features: [
      '2 interviews every month',
      '6 questions per session',
      'Basic scoring and classification',
      'Practice mode only',
    ],
    locked: [
      'Per-question rubric breakdown',
      'Ideal answer coaching',
      'PDF report download',
      'Session history',
    ],
    cta: 'Start free',
    plan: 'free',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/mo',
    desc: 'The best fit for focused interview prep and sharper answer reviews.',
    features: [
      '15 interviews per month',
      '16 questions per session',
      'Per-question rubric breakdown',
      'Ideal answer coaching',
      'PDF report download',
      'Session history and tracking',
      'Focus mode (camera + fullscreen)',
    ],
    locked: [],
    cta: 'Upgrade to Pro',
    plan: 'pro',
    highlight: true,
  },
  {
    name: 'Career',
    price: '$39',
    period: '/mo',
    desc: 'For active job seekers who want longer, deeper, more realistic sessions.',
    features: [
      'Unlimited interviews',
      '20 questions per session',
      'All Pro features',
      'Advanced difficulty',
      'Priority support',
      'Richer coaching depth',
    ],
    locked: [],
    cta: 'Upgrade to Career',
    plan: 'career',
    highlight: false,
  },
];

export default function PricingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState('');
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handleUpgrade = async (plan: string) => {
    if (!user) {
      router.push('/login?mode=signup');
      return;
    }
    if (plan === 'free') return;

    setLoading(plan);
    try {
      const { checkout_url } = await api.createCheckout<CheckoutResult>(plan);
      window.location.assign(checkout_url);
    } catch (err: unknown) {
      const nextError = err as Error;
      alert(nextError.message);
    } finally {
      setLoading('');
    }
  };

  return (
    <div
      className={`public-theme min-h-screen overflow-hidden ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
      data-theme={theme}
    >
      <div className="public-aurora" />
      <div className="public-grid" />

      <div className="relative mx-auto max-w-6xl px-6 py-6">
        <nav className="page-enter flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-3">
            <LogoMark size="md" />
            <div>
              <span className={`block text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>PrepVista AI</span>
              <span className={`block text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Pricing built for steady prep</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => router.push(user ? '/dashboard' : '/')}
              className={isDark ? 'btn-secondary text-sm !py-2 !px-4 !bg-slate-900/80 !text-slate-100 !border-slate-700' : 'btn-secondary text-sm !py-2 !px-4'}
            >
              Back
            </button>
          </div>
        </nav>

        <section className="py-12 text-center">
          <p className={`page-enter text-sm font-semibold uppercase tracking-[0.24em] ${isDark ? 'text-sky-300' : 'text-blue-600'}`}>
            Pricing
          </p>
          <h1 className="page-enter-delay-1 mt-4 text-5xl font-semibold tracking-tight sm:text-6xl">
            Choose the coaching depth you need.
          </h1>
          <p className={`page-enter-delay-2 mx-auto mt-5 max-w-2xl text-lg leading-8 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            Start free, then upgrade when you want longer interviews, stronger reports, and richer answer coaching.
          </p>
          <div className={`page-enter-delay-3 mt-6 inline-flex rounded-full border px-4 py-2 text-sm ${
            isDark ? 'border-sky-400/20 bg-sky-400/10 text-sky-200' : 'border-blue-100 bg-blue-50 text-blue-700'
          }`}>
            You have 2 free interviews/month.
          </div>
        </section>

        <section className="grid gap-6 pb-12 md:grid-cols-3">
          {plans.map((plan, index) => {
            const isCurrentPlan = Boolean(user && user.plan === plan.plan);
            return (
              <div
                key={plan.plan}
                className={`page-enter-delay-${Math.min(index + 1, 4)} relative flex flex-col rounded-[2rem] border p-7 ${
                  plan.highlight
                    ? isDark
                      ? 'border-sky-400/30 bg-[linear-gradient(180deg,rgba(14,165,233,0.18),rgba(15,23,42,0.92))] shadow-[0_30px_100px_rgba(56,189,248,0.16)]'
                      : 'border-blue-200 bg-[linear-gradient(180deg,#eff6ff,#ffffff)] shadow-[0_30px_90px_rgba(37,99,235,0.14)]'
                    : isDark
                      ? 'border-white/10 bg-white/5'
                      : 'border-white/80 bg-white shadow-[0_16px_60px_rgba(15,23,42,0.07)]'
                }`}
              >
                {plan.highlight && (
                  <span className={`mb-5 inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${
                    isDark ? 'bg-sky-400/15 text-sky-200' : 'bg-blue-100 text-blue-700'
                  }`}>
                    Most popular
                  </span>
                )}

                <h2 className="text-2xl font-semibold tracking-tight">{plan.name}</h2>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-5xl font-semibold tracking-tight">{plan.price}</span>
                  <span className={isDark ? 'pb-1 text-slate-400' : 'pb-1 text-slate-400'}>{plan.period}</span>
                </div>
                <p className={`mt-4 text-sm leading-7 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{plan.desc}</p>

                <ul className="mt-7 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className={`flex gap-3 text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                      <span className={isDark ? 'text-sky-300' : 'text-emerald-500'}>+</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                  {plan.locked.map((feature) => (
                    <li key={feature} className={`flex gap-3 text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      <span>Lock</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(plan.plan)}
                  disabled={loading === plan.plan || isCurrentPlan}
                  className={plan.highlight ? 'btn-primary mt-8 w-full' : isDark ? 'btn-secondary mt-8 w-full !bg-slate-950/70 !text-slate-100 !border-slate-700' : 'btn-secondary mt-8 w-full'}
                >
                  {isCurrentPlan ? 'Current plan' : loading === plan.plan ? 'Redirecting...' : plan.cta}
                </button>
              </div>
            );
          })}
        </section>

        <section className={`page-enter rounded-[2rem] border px-8 py-8 text-center ${
          isDark ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-white'
        }`}>
          <h2 className="text-2xl font-semibold tracking-tight">Questions before you upgrade?</h2>
          <p className={`mx-auto mt-3 max-w-2xl text-sm leading-7 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            All plans include encrypted storage, browser-based device permissions, and clear cancellation controls from settings.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Link href="/privacy" className={isDark ? 'btn-secondary text-sm !py-2 !px-4 !bg-slate-950/70 !text-slate-100 !border-slate-700' : 'btn-secondary text-sm !py-2 !px-4'}>
              Privacy Policy
            </Link>
            <Link href="/terms" className={isDark ? 'btn-secondary text-sm !py-2 !px-4 !bg-slate-950/70 !text-slate-100 !border-slate-700' : 'btn-secondary text-sm !py-2 !px-4'}>
              Terms
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
