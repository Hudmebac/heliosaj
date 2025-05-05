import type { Metadata } from 'next';
import { GeistSans } from 'next/font/google'; // Correct import for GeistSans
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';
import { QueryProvider } from '@/components/query-provider'; // Import QueryProvider

const geistSans = GeistSans({ // Correct usage
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

// Remove GeistMono if not used or import correctly if needed
// import { GeistMono } from 'next/font/google';
// const geistMono = GeistMono({
//   variable: '--font-geist-mono',
//   subsets: ['latin'],
// });

export const metadata: Metadata = {
  title: 'HelioHeggie',
  description: 'Solar Energy Forecaster by Craig Heggie',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Add suppressHydrationWarning to html tag for next-themes */}
      <body className={`${geistSans.variable} antialiased flex flex-col min-h-screen`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider> {/* Wrap with QueryProvider */}
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8">{children}</main>
            <Footer />
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
