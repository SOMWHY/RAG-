import { clsx } from "clsx";
import { type ButtonHTMLAttributes, forwardRef } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

const VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default:
    "gradient-brand text-white shadow-[0_10px_30px_-12px_var(--color-brand-600)] hover:brightness-110 active:brightness-95",
  secondary: "bg-ink-800 text-ink-100 hover:bg-ink-700",
  outline:
    "border border-white/15 bg-white/5 text-ink-200 hover:border-brand-400/60 hover:bg-brand-500/15 hover:text-ink-100",
  ghost: "text-ink-300 hover:bg-white/8 hover:text-ink-100",
  destructive: "bg-accent-red/90 text-white hover:bg-accent-red",
};

const SIZES: Record<NonNullable<ButtonProps["size"]>, string> = {
  default: "h-10 px-4 py-2 text-sm",
  sm: "h-8 rounded-md px-3 text-xs",
  lg: "h-11 rounded-md px-6 text-sm",
  icon: "size-10",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", type = "button", ...props }, ref) => {
    return (
      <button
        type={type}
        className={clsx(
          "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:pointer-events-none disabled:opacity-50",
          VARIANTS[variant],
          SIZES[size],
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button };
