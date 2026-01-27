import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Personal Resource Gateway",
  description:
    "Self-hostable personal resource access key for safely sharing access to private capabilities",
  keywords: ["API gateway", "resource sharing", "personal proxy", "API key management"],
  authors: [{ name: "Personal Resource Gateway" }],
  openGraph: {
    title: "Personal Resource Gateway",
    description: "Safely share access to your API keys and resources with controlled permissions",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className={`${inter.className} antialiased min-h-screen`}>{children}</body>
    </html>
  );
}
