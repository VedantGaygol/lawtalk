import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export function Button({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  isLoading, 
  children, 
  disabled,
  ...props 
}: ButtonProps) {
  
  const variants = {
    primary: "bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:shadow-lg active:scale-[0.98]",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]",
    outline: "border-2 border-border bg-transparent hover:bg-secondary hover:text-foreground active:scale-[0.98]",
    ghost: "bg-transparent hover:bg-secondary/50 text-foreground active:scale-[0.98]",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm active:scale-[0.98]",
  };

  const sizes = {
    sm: "h-9 px-3 text-xs rounded-lg",
    md: "h-11 px-5 py-2 text-sm font-medium rounded-xl",
    lg: "h-14 px-8 text-base font-semibold rounded-2xl",
    icon: "h-11 w-11 flex items-center justify-center rounded-xl",
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : null}
      {children}
    </button>
  );
}
