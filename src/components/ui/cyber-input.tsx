import * as React from "react";
import { cn } from "@/lib/utils";

export interface CyberInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const CyberInput = React.forwardRef<HTMLInputElement, CyberInputProps>(
  ({ className, type, label, ...props }, ref) => {
    return (
      <div className="relative">
        {label && (
          <label className="block text-xs font-display uppercase tracking-wider text-primary mb-2">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            "flex h-12 w-full bg-input border-2 border-border px-4 py-2 text-base font-mono text-foreground transition-all duration-300",
            "placeholder:text-muted-foreground",
            "focus:outline-none focus:border-primary focus:glow-primary",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);
CyberInput.displayName = "CyberInput";

export { CyberInput };
