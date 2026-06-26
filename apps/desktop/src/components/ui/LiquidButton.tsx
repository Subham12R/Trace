"use client";
import React from "react";
import { cn } from "@/lib/utils";

interface LiquidButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  textColor?: string;
  dark?: boolean;
}

const LiquidButton = React.forwardRef<HTMLButtonElement, LiquidButtonProps>(
  ({ className, children, textColor, dark = false, ...props }, ref) => {
    const outerStyle: React.CSSProperties = dark
      ? {
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 24%, rgba(255,255,255,0.08) 100%)",
          boxShadow:
            "inset 0px 4px 6.1px 0px rgba(255,255,255,0.08), 2px 23px 14px 0px rgba(0,0,0,0.06), 1px 10px 10px 0px rgba(0,0,0,0.08), 0px 3px 6px 0px rgba(0,0,0,0.08)",
        }
      : {
          background:
            "linear-gradient(180deg, rgb(245,245,245) 0%, rgba(101,104,111,0.39) 24%, rgba(255,255,255,0.75) 100%)",
          boxShadow:
            "inset 0px 4px 6.1px 0px rgba(255,255,255,0.23), 2px 23px 14px 0px rgba(0,0,0,0.02), 1px 10px 10px 0px rgba(0,0,0,0.03), 0px 3px 6px 0px rgba(0,0,0,0.03)",
        };

    const innerStyle: React.CSSProperties = {
      background: dark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.6)",
      backdropFilter: "blur(8px)",
    };

    const textStyle: React.CSSProperties = {
      color: textColor ?? (dark ? "rgba(255,255,255,0.9)" : "rgb(61,61,61)"),
      letterSpacing: "-0.03em",
      lineHeight: 1.2,
      textShadow: dark
        ? "0px 1px 0px rgba(0,0,0,0.3)"
        : "0px 1px 0px rgba(255,255,255,0.46)",
    };

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "group/lb relative inline-flex items-center justify-center rounded-full p-[2px] text-sm transition-opacity hover:opacity-90 active:opacity-75",
          className,
        )}
        style={outerStyle}
        {...props}
      >
        <span
          className="flex items-center justify-center rounded-full px-2 py-1"
          style={innerStyle}
        >
          <span className="flex items-center gap-1.5 whitespace-nowrap font-semibold" style={textStyle}>
            {children}
          </span>
        </span>
      </button>
    );
  },
);

LiquidButton.displayName = "LiquidButton";
export { LiquidButton };
export default LiquidButton;
