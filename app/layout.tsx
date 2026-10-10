import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "DropYard",
  description: "From one home to another. Local yard sales, simplified.",
  icons: {
    // Tagline-free mark: at favicon size "From one home to another" is a grey
    // smudge that shrinks the house and wordmark to fit around it.
    icon: "/Logo_1.png",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
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
