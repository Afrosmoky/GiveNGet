import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../styles/tokens.css";
import "./globals.css";
import ErrorContainer from '../components/ErrorContainer';
import { ErrorProvider } from '../context/ErrorContext';
import AdSenseManager from '../components/AdSenseManager';
import { ShellProviders } from '../components/shell/ShellProviders';
import { AppShell } from '../components/shell/AppShell';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Biovlo — ratuj jedzenie z okolicy", template: "%s · Biovlo" },
  description: "Biovlo — żywność z krótkim terminem: oddaj, wymień, odbierz taniej w sklepie obok.",
  applicationName: "Biovlo",
  // Ikony z public/ (generowane ze znaku marki). Manifest: app/manifest.ts
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: { title: "Biovlo" },
};

export const viewport: Viewport = {
  // --brand (#0C6B4C) — kolor paska przeglądarki na mobile
  themeColor: "#0C6B4C",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Zmienne fontów na <html>, bo --font-sans w tokens.css (:root) się do nich odwołuje
    <html lang="pl" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen antialiased">
        <ErrorProvider>
          <AdSenseManager>
            <ErrorContainer />
            {/* Strona renderowana RAZ — powłoka sama dopasowuje się do szerokości ekranu i roli */}
            <ShellProviders>
              <AppShell>{children}</AppShell>
            </ShellProviders>
          </AdSenseManager>
        </ErrorProvider>
      </body>
    </html>
  );
}
