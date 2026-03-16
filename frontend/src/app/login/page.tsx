'use client';
/**
 * PrepVista AI - Login / Signup Page
 */

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ThemeToggle } from '@/components/theme-toggle';
import { useTheme } from '@/lib/theme-context';
import { LogoMark } from '@/components/logo-mark';

function LoginContent() {
  const searchParams = useSearchParams();
  const isSignup = searchParams.get('mode') === 'signup';
  const [mode, setMode] = useState<'login' | 'signup'>(isSignup ? 'signup' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, signup, loginWithGoogle, googleEnabled } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        await signup(email, password, fullName);
      } else {
        await login(email, password);
      }
    } catch (err: unknown) {
      const nextError = err as Error;
      setError(nextError.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      const nextError = err as Error;
      setError(nextError.message || 'Google sign-in could not be started.');
      setGoogleLoading(false);
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

      <div className="relative mx-auto min-h-screen max-w-6xl px-6 py-6">
        <nav className="page-enter flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-3">
            <LogoMark size="md" />
            <div>
              <span className={`block text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>PrepVista AI</span>
              <span className={`block text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Interview coaching that feels specific</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/" className={isDark ? 'btn-secondary text-sm !py-2 !px-4 !bg-slate-900/80 !text-slate-100 !border-slate-700' : 'btn-secondary text-sm !py-2 !px-4'}>
              Back home
            </Link>
          </div>
        </nav>

        <div className="grid min-h-[calc(100vh-110px)] items-center gap-12 py-8 lg:grid-cols-[1fr_0.92fr]">
          <section className="page-enter-delay-1 max-w-xl">
            <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${
              isDark ? 'border-sky-400/20 bg-sky-400/10 text-sky-200' : 'border-blue-100 bg-blue-50 text-blue-700'
            }`}>
              <span className={`h-2.5 w-2.5 rounded-full ${isDark ? 'bg-sky-300' : 'bg-blue-500'}`} />
              Secure sign in
            </span>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.02] tracking-tight">
              {mode === 'signup' ? 'Start practicing with a calmer setup.' : 'Welcome back to sharper prep.'}
            </h1>
            <p className={`mt-5 text-lg leading-8 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {mode === 'signup'
                ? 'Create an account, upload your resume, and get interview practice that sounds like your real background.'
                : 'Pick up where you left off, review reports, and launch another interview in seconds.'}
            </p>

            <div className="mt-8 space-y-4">
              {[
                'Google sign-in for a faster start',
                'Resume-based interview generation',
                '2 free interviews every month on the free plan',
              ].map((item, index) => (
                <div key={item} className={`page-enter-delay-${Math.min(index + 1, 4)} inline-flex items-center gap-3`}>
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full ${isDark ? 'bg-sky-400/15 text-sky-200' : 'bg-blue-50 text-blue-700'}`}>
                    +
                  </span>
                  <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>{item}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="page-enter-delay-2">
            <div className={`rounded-[2rem] border p-7 shadow-[0_25px_90px_rgba(15,23,42,0.16)] ${
              isDark ? 'border-white/10 bg-slate-900/75 backdrop-blur' : 'border-white/80 bg-white/90 backdrop-blur'
            }`}>
              <div className="mb-7 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {mode === 'signup' ? 'Create your account' : 'Sign in'}
                  </h2>
                  <p className={`mt-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {mode === 'signup'
                      ? 'Start with email or continue with Google.'
                      : 'Log in with your email or continue with Google.'}
                  </p>
                </div>
                <div className="hidden sm:block">
                  <LogoMark />
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={!googleEnabled || googleLoading || loading}
                className={`mb-5 flex w-full items-center justify-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${
                  isDark
                    ? 'border-white/10 bg-white/5 text-white hover:border-sky-400/30 hover:bg-sky-400/10'
                    : 'border-slate-200 bg-white text-slate-800 hover:border-blue-200 hover:bg-blue-50'
                } ${!googleEnabled ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <span className="text-base">G</span>
                {googleLoading ? 'Redirecting to Google...' : 'Continue with Google'}
              </button>

              {!googleEnabled && (
                <p className={`mb-5 text-xs leading-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to enable Google auth.
                </p>
              )}

              <div className="mb-5 flex items-center gap-4">
                <div className={`h-px flex-1 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                <span className={`text-xs uppercase tracking-[0.22em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  or use email
                </span>
                <div className={`h-px flex-1 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Full name</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Your name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                )}
                <div>
                  <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Email</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Password</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                {error && (
                  <div className={`rounded-2xl border px-4 py-3 text-sm ${
                    isDark
                      ? 'border-red-500/20 bg-red-500/10 text-red-100'
                      : 'border-red-100 bg-red-50 text-red-700'
                  }`}>
                    {error}
                  </div>
                )}

                <button type="submit" className="btn-primary w-full !py-3.5" disabled={loading || googleLoading}>
                  {loading ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Log in'}
                </button>
              </form>

              <div className={`mt-6 text-center text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {mode === 'signup' ? (
                  <>
                    Already have an account?{' '}
                    <button type="button" onClick={() => setMode('login')} className={isDark ? 'font-medium text-sky-300 hover:text-sky-200' : 'font-medium text-blue-600 hover:underline'}>
                      Log in
                    </button>
                  </>
                ) : (
                  <>
                    Don&apos;t have an account?{' '}
                    <button type="button" onClick={() => setMode('signup')} className={isDark ? 'font-medium text-sky-300 hover:text-sky-200' : 'font-medium text-blue-600 hover:underline'}>
                      Sign up free
                    </button>
                  </>
                )}
              </div>
            </div>

            <p className={`mt-5 text-center text-xs leading-6 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Your data is encrypted and never sold. By continuing, you agree to our{' '}
              <Link href="/privacy" className="underline underline-offset-4">Privacy Policy</Link>{' '}
              and{' '}
              <Link href="/terms" className="underline underline-offset-4">Terms</Link>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950">
          <div className="orb" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
