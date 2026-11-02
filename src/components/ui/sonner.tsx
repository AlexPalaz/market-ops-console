"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react";

/** Ink toasts with paper text, thin icons. */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" strokeWidth={1.75} />,
        info: <InfoIcon className="size-4" strokeWidth={1.75} />,
        warning: <TriangleAlertIcon className="size-4" strokeWidth={1.75} />,
        error: <OctagonXIcon className="size-4" strokeWidth={1.75} />,
        loading: <Loader2Icon className="size-4 animate-spin" strokeWidth={1.75} />,
      }}
      style={
        {
          "--normal-bg": "var(--ink)",
          "--normal-text": "var(--paper)",
          "--normal-border": "var(--ink)",
          "--border-radius": "6px",
          "--font-family": "var(--font-sans)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: { toast: "cn-toast text-[13px]", description: "!text-paper/75" },
      }}
      {...props}
    />
  );
};

export { Toaster };
