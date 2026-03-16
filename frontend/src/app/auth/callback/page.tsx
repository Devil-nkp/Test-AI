'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { getSupabaseBrowserClient, hasSupabaseBrowserConfig } from '@/lib/supabase-browser';
import { LogoMark } from '@/components/logo-mark';

function extractTokensFromHash(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
  };
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const finishLogin = async () => {
      const returnedError =
        searchParams.get('error_description') ||
        searchParams.get('error') ||
        searchParams.get('message');

      if (returnedError) {
        if (mounted) {
          setError(returnedError);
        }
        return;
      }

      try {
        const hashSession = extractTokensFromHash(window.location.hash);
        if (hashSession) {
          api.setTokens(hashSession.accessToken, hashSession.refreshToken);
          await refreshUser();
          router.replace('/dashboard');
          return;
        }

        if (!hasSupabaseBrowserConfig()) {
          throw new Error('Google sign-in is not configured yet.');
        }

        const code = searchParams.get('code');
        const supabase = getSupabaseBrowserClient();

        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            throw exchangeError;
          }

          const session = data.session;
          if (session?.access_token && session.refresh_token) {
            api.setTokens(session.access_token, session.refresh_token);
          }
        } else {
          const { data, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) {
            throw sessionError;
          }

          const session = data.session;
          if (session?.access_token && session.refresh_token) {
            api.setTokens(session.access_token, session.refresh_token);
          }
        }

        await refreshUser();
        router.replace('/dashboard');
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unable to complete Google sign-in.');
        }
      }
    };

    void finishLogin();

    return () => {
      mounted = false;
    };
  }, [refreshUser, router, searchParams]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
        <LogoMark size="lg" className="mb-6" />
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Completing your sign-in</h1>
          <p className="mt-3 text-sm text-slate-300">
            We&apos;re securing your session and preparing your dashboard.
          </p>
        </div>

        {error ? (
          <div className="w-full rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-left">
            <p className="font-medium text-red-100">Google sign-in could not be completed.</p>
            <p className="mt-2 text-sm text-red-200/90">{error}</p>
            <div className="mt-4 flex gap-3">
              <Link href="/login" className="btn-primary text-sm !px-4 !py-2">
                Back to login
              </Link>
              <Link href="/" className="btn-secondary text-sm !px-4 !py-2">
                Go home
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="orb" />
            <p className="text-sm text-slate-400">Redirecting you now...</p>
          </div>
        )}
      </div>
    </div>
  );
}
