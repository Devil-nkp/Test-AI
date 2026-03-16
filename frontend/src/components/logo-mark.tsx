interface LogoMarkProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

export function LogoMark({ size = 'md', className = '' }: LogoMarkProps) {
  return (
    <span
      className={`relative inline-flex ${sizeMap[size]} items-center justify-center overflow-hidden rounded-2xl shadow-[0_10px_30px_rgba(37,99,235,0.24)] ${className}`}
      aria-hidden="true"
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,#7dd3fc_0%,#3b82f6_45%,#4f46e5_100%)]" />
      <span className="absolute inset-0 bg-[linear-gradient(140deg,rgba(255,255,255,0.38),transparent_45%,rgba(15,23,42,0.18))]" />
      <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-white/90 shadow-[0_0_18px_rgba(255,255,255,0.75)]" />
      <span className="absolute inset-x-2 bottom-2 h-2 rounded-full bg-white/20 blur-md" />
      <span className="relative h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.9)]" />
    </span>
  );
}
