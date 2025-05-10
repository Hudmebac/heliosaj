
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';
import { QueryProvider } from '@/components/query-provider'; // Import QueryProvider
import { InputControlProvider } from '@/hooks/use-input-controls'; // Ensure this is correctly named if it's a provider

const inter = Inter({
  variable: '--font-inter', // Assign a CSS variable
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
        <InputControlProvider> {/** Ensure InputControlProvider wraps ThemeProvider if it also uses localStorage or causes hydration issues **/}
          <ThemeProvider
            attribute="class"
            defaultTheme="system" // Changed from "dark" to "system"
            enableSystem={true}    // Explicitly true, or can be omitted as it's default
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

