import React from 'react';

interface GradientButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  icon?: React.ReactNode;
  loadingIcon?: React.ReactNode;
}

const variants = {
  primary: 'from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700',
  secondary: 'from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700',
  danger: 'from-red-400 to-red-500 hover:from-red-500 hover:to-red-600',
};

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3',
  lg: 'px-8 py-4 text-lg',
};

export const GradientButton: React.FC<GradientButtonProps> = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'md',
  className = '',
  icon,
  loadingIcon,
}) => {
  const defaultLoadingIcon = (
    <svg
      className="animate-spin h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  return (
    <button
      className={`group relative overflow-hidden rounded-lg p-0.5 bg-gradient-to-r ${variants[variant]} transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg cursor-pointer ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      <div className={`flex items-center justify-center gap-3 ${sizes[size]} bg-white/90 backdrop-blur-sm rounded-lg text-gray-800 font-medium`}>
        {loading ? (loadingIcon || defaultLoadingIcon) : icon}
        <span className={`${variant === 'danger' ? 'text-red-700' : 'bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent'} font-semibold`}>
          {children}
        </span>
      </div>
    </button>
  );
};
