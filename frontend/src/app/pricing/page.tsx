'use client';
/**
 * PrepVista AI — Pricing Page
 */

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useState } from 'react';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    desc: 'Try it out. No credit card needed.',
    features: [
      '2 interviews per month',
      '6 questions per session',
      'Basic score + classification',
      'Practice mode only',
    ],
    locked: [
      'Per-question rubric breakdown',
      'Ideal answer coaching',
      'PDF report download',
      'Session history',
    ],
    cta: 'Start Free',
    plan: 'free',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/mo',
    desc: 'Everything you need for serious practice.',
    features: [
      '15 interviews per month',
      '16 questions per session',
      'Per-question rubric breakdown',
      'Ideal answer coaching',
      'PDF report download',
      'Session history & tracking',
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
    desc: 'For active job seekers preparing daily.',
    features: [
      'Unlimited interviews',
      '20 questions per session',
      'All Pro features',
      'Advanced difficulty level',
      'Priority support',
      'Personalized coaching depth',
    ],
    locked: [],
    cta: 'Upgrade to Career',
    plan: 'career',
    highlight: false,
  },
];

export default function PricingPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState('');

  const handleUpgrade = async (plan: string) => {
    if (!user) { window.location.href = '/login?mode=signup'; return; }
    if (plan === 'free') return;
    setLoading(plan);
    try {
      const { checkout_url } = await api.createCheckout(plan);
      window.location.href = checkout_url;
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600" />
          <span className="text-xl font-bold text-slate-900">PrepVista AI</span>
        </Link>
        {user ? (
          <Link href="/dashboard" className="text-sm text-slate-600 hover:text-blue-600">← Dashboard</Link>
        ) : (
          <Link href="/login" className="text-sm text-slate-600 hover:text-blue-600">Log in</Link>
        )}
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Simple, transparent pricing</h1>
          <p className="text-slate-500">Start free. Upgrade when you need deeper coaching.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.plan}
              className={`card flex flex-col ${plan.highlight ? 'border-blue-500 ring-2 ring-blue-100' : ''}`}>
              {plan.highlight && (
                <span className="text-xs font-semibold text-blue-600 mb-3">MOST POPULAR</span>
              )}
              <h2 className="text-xl font-bold text-slate-900">{plan.name}</h2>
              <div className="flex items-baseline gap-1 mt-2 mb-1">
                <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                <span className="text-slate-400">{plan.period}</span>
              </div>
              <p className="text-sm text-slate-500 mb-6">{plan.desc}</p>

              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="text-sm text-slate-700 flex gap-2">
                    <span className="text-green-500">✓</span> {f}
                  </li>
                ))}
                {plan.locked.map((f) => (
                  <li key={f} className="text-sm text-slate-400 flex gap-2">
                    <span>🔒</span> {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(plan.plan)}
                disabled={loading === plan.plan || (!!user && user.plan === plan.plan)}
                className={plan.highlight ? 'btn-primary w-full' : 'btn-secondary w-full'}>
                {user?.plan === plan.plan ? 'Current Plan' :
                 loading === plan.plan ? 'Redirecting...' : plan.cta}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-slate-400 mt-10">
          All plans include encrypted data storage and local camera processing.
          Cancel anytime from your account settings.
        </p>
      </div>
    </div>
  );
}
