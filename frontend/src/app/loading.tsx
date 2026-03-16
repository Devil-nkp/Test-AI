import { LogoMark } from '@/components/logo-mark';

export default function GlobalLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="flex flex-col items-center gap-5 text-center">
        <LogoMark size="lg" />
        <div className="orb" />
        <div>
          <p className="text-lg font-medium">Loading PrepVista AI</p>
          <p className="mt-2 text-sm text-slate-400">Preparing your interview workspace...</p>
        </div>
      </div>
    </div>
  );
}
