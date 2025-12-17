import { Brain } from "lucide-react";

interface BrainLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  animated?: boolean;
}

const sizeMap = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-20 h-20",
  xl: "w-32 h-32",
};

export function BrainLogo({ size = "md", animated = true }: BrainLogoProps) {
  return (
    <div className={`relative ${sizeMap[size]} ${animated ? "animate-pulse-glow" : ""}`}>
      <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
      <Brain className={`${sizeMap[size]} text-primary relative z-10`} />
    </div>
  );
}
