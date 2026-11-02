import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { WebVitals } from "./web-vitals";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Display face for the page title and hero figures. Optical size and softness axes. */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Market Ops Console",
    template: "%s · Market Ops Console",
  },
  description:
    "Market operations console: portfolio performance against forecast, with a streaming assistant that cites its evidence.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
      style={
        {
          "--font-sans": "var(--font-geist-sans)",
          "--font-display": "var(--font-fraunces)",
        } as React.CSSProperties
      }
    >
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <a
          href="#main"
          className="focus:bg-primary focus:text-primary-foreground sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:px-3 focus:py-2"
        >
          Skip to main content
        </a>
        <Providers>{children}</Providers>
        <WebVitals />
      </body>
    </html>
  );
}
