import * as React from "react";
import { cn } from "@/lib/utils";

const CyberCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { glow?: "primary" | "secondary" | "accent" | "none" }
>(({ className, glow = "none", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "bg-card border-2 border-border p-6 transition-all duration-300",
      glow === "primary" && "hover:border-primary hover:glow-primary",
      glow === "secondary" && "hover:border-secondary hover:glow-secondary",
      glow === "accent" && "hover:border-accent hover:glow-accent",
      className
    )}
    {...props}
  />
));
CyberCard.displayName = "CyberCard";

const CyberCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-2 pb-4 border-b border-border", className)}
    {...props}
  />
));
CyberCardHeader.displayName = "CyberCardHeader";

const CyberCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-display text-xl font-bold uppercase tracking-wider text-foreground", className)}
    {...props}
  />
));
CyberCardTitle.displayName = "CyberCardTitle";

const CyberCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("pt-4", className)} {...props} />
));
CyberCardContent.displayName = "CyberCardContent";

export { CyberCard, CyberCardHeader, CyberCardTitle, CyberCardContent };
