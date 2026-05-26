import React from 'react';

type LogoTheme = 'dark' | 'light' | 'mono-white' | 'mono-dark';
type LogoVariant = 'horizontal' | 'stacked' | 'icon';

interface LogoProps {
  theme?: LogoTheme;
  variant?: LogoVariant;
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  tagline?: boolean;
  productName?: string;
}

export const Logo: React.FC<LogoProps> = ({
  theme = 'dark',
  variant = 'horizontal',
  className = '',
  iconClassName = '',
  textClassName = '',
  tagline = false,
  productName,
}) => {
  const isMonoWhite = theme === 'mono-white';
  const isMonoDark = theme === 'mono-dark';
  const isLight = theme === 'light';

  const markColor = isMonoWhite ? '#FFFFFF' : isMonoDark ? '#0A0F1E' : isLight ? '#0A0F1E' : '#F8F9FA';
  const textColor = isMonoWhite ? 'text-white' : isMonoDark ? 'text-[#0A0F1E]' : isLight ? 'text-[#0A0F1E]' : 'text-white';
  const taglineColor = isMonoWhite ? 'text-white/70' : isMonoDark ? 'text-[#0A0F1E]/70' : isLight ? 'text-[#0A0F1E]/70' : 'text-white/70';

  const Icon = (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${iconClassName}`}
    >
      <rect x="25" y="25" width="50" height="50" stroke={markColor} strokeWidth="2" />
      <rect x="43.75" y="25" width="12.5" height="12.5" fill={markColor} />
      <rect x="43.75" y="62.5" width="12.5" height="12.5" fill={markColor} />
      <rect x="25" y="43.75" width="12.5" height="12.5" fill={markColor} />
      <rect x="62.5" y="43.75" width="12.5" height="12.5" fill={markColor} />
      <rect x="43.75" y="43.75" width="12.5" height="12.5" fill={markColor} />
    </svg>
  );

  const Text = (
    <div className={`flex flex-col ${variant === 'stacked' ? 'items-center' : 'items-start'}`}>
      <div className={`font-sans font-bold tracking-[0.05em] leading-none ${textColor} ${textClassName} flex items-center gap-2`}>
        DIGIAI
        {productName && (
          <span className="font-normal opacity-80 tracking-normal">{productName}</span>
        )}
      </div>
      {tagline && (
        <div className={`mt-1.5 text-[0.65em] font-medium uppercase tracking-[0.1em] ${taglineColor}`}>
          Transformando Informação em Decisão
        </div>
      )}
    </div>
  );

  if (variant === 'icon') {
    return <div className={className}>{Icon}</div>;
  }

  if (variant === 'stacked') {
    return (
      <div className={`flex flex-col items-center gap-4 ${className}`}>
        {Icon}
        {Text}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {Icon}
      {Text}
    </div>
  );
};
