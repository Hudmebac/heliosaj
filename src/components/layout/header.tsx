
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
    // Change background and text to secondary colors like the footer
    <header className="bg-secondary text-secondary-foreground shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center">
        <Link href="/" className="flex items-center gap-2 mb-2 sm:mb-0 text-lg sm:text-xl font-bold hover:opacity-80 transition-opacity">
          <Sun className="h-6 w-6" /> {/* Consider a logo that works on dark/light secondary backgrounds */}
          HelioHeggie
        </Link>

        {/* Navigation Links - Adjust hover/focus/active styles for secondary background */}
        <nav className="flex gap-1 sm:gap-2 items-center flex-wrap justify-center mb-2 sm:mb-0">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md text-sm transition-colors duration-200 ease-in-out",
                // Use text color change on hover/focus like footer, ensure glow works
                "hover:text-accent focus:text-accent focus:outline-none focus:ring-1 focus:ring-accent focus:ring-offset-1 focus:ring-offset-secondary", // Glow effect on hover/focus
                "[text-shadow:_0_0_8px_var(--tw-shadow-color)] shadow-accent", // Silver text glow (applied via accent color)
                pathname === item.href
                  ? 'font-semibold text-accent shadow-[0_0_8px_theme(colors.accent)]' // Active link uses accent text color and glow
                  : 'font-medium hover:shadow-accent/80 focus:shadow-accent' // Non-active link styling
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
