import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Sans } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { GlobalLayout } from "@/components/GlobalLayout";
import { GoogleOAuthProviderWrapper } from "@/components/GoogleOAuthProviderWrapper";
import { AuthProvider } from "@/context/AuthContext";
import { SocketProvider } from "@/context/SocketContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DropYard",
  description: "From one home to another. Local yard sales, simplified.",
  icons: {
    // The house symbol alone, cropped from logo-wordmark.png. The full
    // wordmark shrank to an unreadable strip at tab size. `?v=` busts the
    // browser's favicon cache; bump it whenever these files change.
    icon: [
      { url: "/favicon.ico?v=2", sizes: "16x16 32x32 48x48" },
      { url: "/icon-192.png?v=2", type: "image/png", sizes: "192x192" },
    ],
    apple: { url: "/apple-touch-icon.png?v=2", sizes: "180x180" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${instrumentSans.variable} antialiased`}
        suppressHydrationWarning
      >
        <GoogleOAuthProviderWrapper>
          <AuthProvider>
            <SocketProvider>
              <Suspense fallback={<div className="min-h-screen" />}>
                <GlobalLayout>{children}</GlobalLayout>
              </Suspense>
            </SocketProvider>
          </AuthProvider>
        </GoogleOAuthProviderWrapper>
      </body>
    </html>
  );
}
