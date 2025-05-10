
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';
import { QueryProvider } from '@/components/query-provider';
import { InputControlProvider } from '@/hooks/use-input-controls'; // Ensure this is correctly named if it's a provider

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});


export const metadata: Metadata = {
  title: 'HelioHeggie',
  description: 'Solar Energy Forecaster by Craig Heggie',
  icons: {
    icon: '/favicon.ico', 
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
       <head>
         <link rel="icon" href="/favicon.ico" sizes="any" />
       </head>
      <body
        className={`${inter.variable} antialiased flex flex-col min-h-screen`}
        suppressHydrationWarning 
        >
        <InputControlProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark" 
            enableSystem={true}    
            disableTransitionOnChange
            themes={['light', 'dark', 'system', 'high-contrast']}
          >
            <QueryProvider> 
              <Header />
              <main className="flex-grow container mx-auto px-4 py-8">{children}</main>
              <Footer />
              <Toaster />
            </QueryProvider>
          </ThemeProvider>
        </InputControlProvider>
      </body>
    </html>
  );
}

