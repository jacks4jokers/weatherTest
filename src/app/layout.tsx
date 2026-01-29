import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Weather Timeline",
  description: "Hyper-local weather forecasts with timeline scrubbing",
};

/**
 * Script to prevent flash of incorrect theme on page load
 * Runs before React hydration to apply the correct theme class
 */
const themeScript = `
  (function() {
    try {
      var stored = localStorage.getItem('weather-app-theme');
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

      if (stored === 'dark' || (stored !== 'light' && prefersDark)) {
        document.documentElement.classList.add('dark');
      } else if (stored === 'light') {
        document.documentElement.classList.add('light');
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
