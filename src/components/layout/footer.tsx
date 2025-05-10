
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function Footer() {
    const pathname = usePathname();

    const navItems = [
        { href: '/', label: 'Dashboard' },
        { href: '/advisory', label: 'Advisory' },
        { href: '/settings', label: 'Settings' },
        { href: '/info', label: 'Info' },
    ];

    return (
        <footer className="bg-secondary text-secondary-foreground mt-auto shadow-inner">
            <div className="container mx-auto px-2 sm:px-4 py-4 flex flex-col sm:flex-row justify-between items-center">
                <nav className="flex flex-wrap justify-center gap-1 sm:gap-2 items-center mb-2 sm:mb-0 order-2 sm:order-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "px-2 py-1 rounded-md text-xs sm:text-sm transition-colors duration-200 ease-in-out",
                                "hover:text-accent focus:text-accent focus:outline-none focus:ring-1 focus:ring-accent focus:ring-offset-1 focus:ring-offset-secondary",
                                "[text-shadow:_0_0_8px_var(--tw-shadow-color)] shadow-accent",
                                pathname === item.href ? 'font-semibold text-accent' : 'font-medium hover:shadow-accent/80 focus:shadow-accent'
                            )}
                            aria-current={pathname === item.href ? 'page' : undefined}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="text-xs text-muted-foreground order-1 sm:order-2 mb-2 sm:mb-0 text-center sm:text-right">
                    © {new Date().getFullYear()} Craig Heggie. All rights reserved.
                </div>
            </div>
        </footer>
    );
}

