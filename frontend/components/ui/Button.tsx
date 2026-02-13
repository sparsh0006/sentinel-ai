"use client";

import { clsx } from "clsx";
import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150",
        "focus:outline-none focus:ring-2 focus:ring-brand-500/50",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        {
          "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800": variant === "primary",
          "bg-surface-3 text-gray-300 hover:bg-surface-4 hover:text-white": variant === "secondary",
          "bg-red-600/20 text-red-400 hover:bg-red-600/30": variant === "danger",
          "text-gray-400 hover:text-white hover:bg-surface-3": variant === "ghost",
        },
        {
          "text-xs px-3 py-1.5": size === "sm",
          "text-sm px-4 py-2.5": size === "md",
          "text-base px-6 py-3": size === "lg",
        },
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}