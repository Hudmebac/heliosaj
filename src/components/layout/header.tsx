'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation'; // Import usePathname
import { ThemeToggle } from '@/components/theme-toggle';
import { Sun, Home, Settings, Info, BarChart2, Zap } from 'lucide-react'; // Import icons
import { cn } from '@/lib/utils'; // Import cn utility

export default function Header() {
  const pathname = usePathname(); // Get current path

  const navItems = [
    { href: '/', label: 'Dashboard', icon: Home },
    { href: '/settings', label: 'Settings', icon: Settings },
    { href: '/info', label: 'Info', icon: Info },
    { href: '/tariffs', label: 'Tariffs', icon: BarChart2 },
    { href: '/advisory', label: 'Advisory', icon: Zap },
  ];

  return (
    <header className="bg-primary text-primary-foreground shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center">
        <Link href="/" className="flex items-center gap-2 mb-2 sm:mb-0">
          <Sun className="h-6 w-6" /> {/* Replace with a better logo/icon if available */}
          <h1 className="text-xl font-bold">HelioHeggie</h1>
        </Link>

        {/* Navigation Links */}
        <nav className="flex gap-1 sm:gap-2 items-center flex-wrap justify-center mb-2 sm:mb-0">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md text-sm transition-colors hover:bg-primary/80",
                pathname === item.href ? 'bg-primary/90 font-semibold' : 'font-medium'
              )}
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute top-3 right-4 sm:relative sm:top-auto sm:right-auto">
         <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
