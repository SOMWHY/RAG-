import { clsx } from "clsx";
import { type InputHTMLAttributes, forwardRef } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        className={clsx(
          "h-11 w-full rounded-xl border border-white/12 bg-ink-900/70 px-4 text-sm text-ink-100 placeholder:text-ink-500",
          "transition duration-150 hover:border-white/20 focus:border-brand-400/70 focus:outline-none focus:ring-2 focus:ring-brand-500/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

export { Input };
