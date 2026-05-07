import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import FloatingLines from '@/components/app/floating-lines';
import { ThemeProvider } from '@/components/theme-provider';

import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'INVISIFY',
  description: 'A Steganography Detection System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn('h-full', inter.variable)} suppressHydrationWarning>
      <body
        className={cn(
          'font-body antialiased h-full flex flex-col bg-background overflow-x-hidden p-0 m-0',
          process.env.NODE_ENV === 'development' ? 'debug-screens' : ''
        )}
      >
        <ThemeProvider>
          <main className="flex-1 flex flex-col">{children}</main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}