import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'amber' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:active:bg-indigo-700 shadow-xs border border-transparent',
  secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-700/90 dark:active:bg-slate-700 border border-transparent dark:border-slate-700/60',
  outline: 'border border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white shadow-2xs',
  amber: 'bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 dark:active:bg-amber-700 shadow-xs border border-transparent',
  ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/70 border border-transparent',
  destructive: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 dark:bg-rose-700 dark:hover:bg-rose-600 dark:active:bg-rose-800 shadow-xs border border-transparent',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-xs font-medium rounded-lg gap-1.5 min-h-[32px]',
  md: 'px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl gap-2 min-h-[38px]',
  lg: 'px-5 py-2.5 text-sm font-semibold rounded-xl gap-2.5 min-h-[44px]',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      type = 'button',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center transition-all select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
