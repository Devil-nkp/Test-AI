'use client';
/**
 * PrepVista AI — Settings Page
 * Account settings: profile, billing management, data deletion.
 */

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [loadingPortal, setLoadingPortal] = useState(false);

  if (!user) { router.push('/login'); return null; }

  const handleBillingPortal = async () => {
    setLoadingPortal(true);
    try {
      const { portal_url } = await api.getBillingPortal();
      window.location.href = portal_url;
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingPortal(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600" />
            <span className="text-lg font-bold text-slate-900">PrepVista AI</span>
          </Link>
          <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">← Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-6 py-10 space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

        {/* Profile */}
        <div className="card">
          <h2 className="font-semibold text-slate-900 mb-3">Account</h2>
          <div className="space-y-2 text-sm">
            <p><span className="text-slate-500">Email:</span> {user.email}</p>
            <p><span className="text-slate-500">Plan:</span> {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}</p>
            <p><span className="text-slate-500">Status:</span> {user.subscription_status || 'None'}</p>
          </div>
        </div>

        {/* Billing */}
        <div className="card">
          <h2 className="font-semibold text-slate-900 mb-3">Billing</h2>
          {user.plan !== 'free' ? (
            <button onClick={handleBillingPortal} disabled={loadingPortal} className="btn-secondary text-sm">
              {loadingPortal ? 'Opening portal...' : 'Manage Subscription'}
            </button>
          ) : (
            <div>
              <p className="text-sm text-slate-500 mb-3">You&#39;re on the Free plan.</p>
              <Link href="/pricing" className="btn-primary text-sm !py-2">Upgrade →</Link>
            </div>
          )}
        </div>

        {/* Data */}
        <div className="card">
          <h2 className="font-semibold text-slate-900 mb-3">Data & Privacy</h2>
          <p className="text-sm text-slate-500 mb-3">
            Your interview transcripts and resume data are stored encrypted.
            You may request deletion of all your data at any time.
          </p>
          <button className="text-sm text-red-500 hover:text-red-700 font-medium">
            Request Data Deletion
          </button>
        </div>

        {/* Logout */}
        <div className="card">
          <button onClick={logout} className="text-sm text-red-500 hover:text-red-700 font-medium">
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
