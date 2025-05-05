'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation'; // Import usePathname
import { cn } from '@/lib/utils'; // Import cn utility

export default function Footer() {
    const pathname = usePathname(); // Get current path

    const navItems = [
    { href: '/', label: 'Dashboard' },
    { href: '/settings', label: 'Settings' },
    { href: '/info', label: 'Info' },
    { href: '/tariffs', label: 'Tariffs' },
    { href: '/advisory', label: 'Advisory' },
  ];

  return (
    <footer className="bg-secondary text-secondary-foreground mt-auto shadow-inner">
      <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center">
         {/* Navigation Links */}
        <nav className="flex gap-2 sm:gap-4 items-center flex-wrap justify-center mb-2 sm:mb-0 order-2 sm:order-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-2 py-1 rounded-md text-sm transition-colors duration-200 ease-in-out",
                 "hover:text-accent focus:text-accent focus:outline-none focus:ring-1 focus:ring-accent focus:ring-offset-1 focus:ring-offset-secondary", // Glow effect on hover/focus
                 "[text-shadow:_0_0_8px_var(--tw-shadow-color)] shadow-accent", // Silver text glow
                pathname === item.href ? 'font-semibold text-accent' : 'font-medium hover:shadow-accent/80 focus:shadow-accent' // Active link styling
              )}
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="text-xs text-muted-foreground order-1 sm:order-2 mb-2 sm:mb-0">
          © {new Date().getFullYear()} Craig Heggie. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
