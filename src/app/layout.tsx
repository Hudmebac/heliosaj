import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Switched to Inter
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';
import { QueryProvider } from '@/components/query-provider'; // Import QueryProvider

const inter = Inter({ // Use Inter
  variable: '--font-inter', // Assign a CSS variable
  subsets: ['latin'],
});


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
      {/* Apply the font variable to the body */}
      <body className={`${inter.variable} antialiased flex flex-col min-h-screen`}>
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
