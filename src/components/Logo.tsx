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

  const primaryColor = isMonoWhite ? '#FFFFFF' : isMonoDark ? '#0A0F1E' : '#2563EB';
  const accentColor = isMonoWhite ? '#FFFFFF' : isMonoDark ? '#0A0F1E' : '#06B6D4';
  const textColor = isMonoWhite ? 'text-white' : isMonoDark ? 'text-[#0A0F1E]' : isLight ? 'text-[#0A0F1E]' : 'text-white';
  const taglineColor = isMonoWhite ? 'text-white/70' : isMonoDark ? 'text-[#0A0F1E]/70' : isLight ? 'text-[#0A0F1E]/70' : 'text-white/70';

  const Icon = (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${iconClassName}`}
    >
      <defs>
        <mask id={`d-mask-${theme}`}>
          <rect width="100" height="100" fill="white" />
          <rect x="18" y="42" width="20" height="16" fill="black" />
        </mask>
      </defs>
      <path
        mask={`url(#d-mask-${theme})`}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M20 20H50C66.5685 20 80 33.4315 80 50C80 66.5685 66.5685 80 50 80H20V20ZM36 36V64H50C57.732 64 64 57.732 64 50C64 42.268 57.732 36 50 36H36Z"
        fill={primaryColor}
      />
      <circle cx="28" cy="50" r="5" fill={accentColor} />
    </svg>
  );

  const Text = (
    <div className={`flex flex-col ${variant === 'stacked' ? 'items-center' : 'items-start'}`}>
      <div className={`font-sans font-bold tracking-[0.06em] leading-none ${textColor} ${textClassName} flex items-center gap-2`}>
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
