
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { Sun, Home, Settings, Info, BarChart2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { UserSettings } from '@/types/settings';
import { useState, useEffect } from 'react';

export default function Header() {
  const pathname = usePathname();
  const [settings, setSettings] = useLocalStorage<UserSettings | null>('userSettings', null);
  const [isMounted, setIsMounted] = useState(false);

   useEffect(() => {
     setIsMounted(true);
   }, []);

  const navItems = [
    { href: '/', label: 'Dashboard', icon: Home },
    { href: '/advisory', label: 'Advisory', icon: Zap },
    { href: '/settings', label: 'Settings', icon: Settings },
    { href: '/tariffs', label: 'Tariffs', icon: BarChart2 },
    { href: '/info', label: 'Info', icon: Info },
  ];

  return (
    <header className="bg-secondary text-secondary-foreground shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center">
        <Link href="/" className="flex items-center gap-2 mb-2 sm:mb-0 text-lg sm:text-xl font-bold hover:opacity-80 transition-opacity">
          <Sun className="h-6 w-6 text-primary" />
          HelioHeggie
        </Link>

        <nav className="flex gap-1 sm:gap-2 items-center flex-wrap justify-center mb-2 sm:mb-0 order-2 sm:order-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md text-sm transition-colors duration-200 ease-in-out",
                 "hover:text-accent focus:text-accent focus:outline-none focus:ring-1 focus:ring-accent focus:ring-offset-1 focus:ring-offset-secondary",
                 "[text-shadow:_0_0_8px_var(--tw-shadow-color)] shadow-accent", // Silver glow
                 pathname === item.href ? 'font-semibold text-accent shadow-[0_0_8px_theme(colors.accent)]' : 'font-medium hover:shadow-accent/80 focus:shadow-accent'
              )}
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Theme Toggle remains */}
        <div className="absolute top-3 right-4 sm:relative sm:top-auto sm:right-auto">
         <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
