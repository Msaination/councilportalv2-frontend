import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Emalahleni Council Portal",
  description: "Document repository for Councillors and Top Management",
  icons: {
    icon: '/emalahleni-logo.png',
    apple: '/emalahleni-logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <nav className="max-w-4xl mx-auto h-14 flex items-center px-6">
              <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
                <img src="/emalahleni-logo.png" alt="Emalahleni" className="h-8 w-8" />
                Emalahleni Council Portal
              </Link>
            </nav>
          </header>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

