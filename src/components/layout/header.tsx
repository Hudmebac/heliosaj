'use client';

import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { Sun } from 'lucide-react'; // Example Icon

export default function Header() {
  return (
    <header className="bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
           <Sun className="h-6 w-6" /> {/* Replace with a better logo/icon if available */}
           <h1 className="text-xl font-bold">HelioHeggie</h1>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
