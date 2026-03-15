import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

export const dynamic = 'force-dynamic';
import { AppProviders } from '@/components/providers/app-providers';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Modern Commerce';
const siteDescription =
  'A modern e-commerce platform for discovering products, managing your cart, and checking out securely.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} | Modern E-Commerce`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: [
    'e-commerce',
    'online store',
    'shopping cart',
    'secure checkout',
    'products',
    'inventory',
    'orders',
  ],
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  category: 'shopping',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    title: `${siteName} | Modern E-Commerce`,
    description: siteDescription,
    siteName,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteName} | Modern E-Commerce`,
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <AppProviders>
          <div className="flex min-h-screen flex-col">
            <a
              href="#main-content"
              className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
            >
              Skip to content
            </a>
            <SiteHeader />
            <main id="main-content" className="flex-1">
              {children}
            </main>
            <SiteFooter />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}