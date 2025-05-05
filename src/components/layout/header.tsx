
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation'; // Import usePathname
import { ThemeToggle } from '@/components/theme-toggle';
import { Sun, Home, Settings, Info, BarChart2, Zap, List } from 'lucide-react'; // Import List icon
import { cn } from '@/lib/utils'; // Import cn utility
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // Import Dropdown components
import { Button } from '@/components/ui/button'; // Import Button for trigger

export default function Header() {
  const pathname = usePathname(); // Get current path

  const navItems = [
    { href: '/', label: 'Dashboard', icon: Home },
    { href: '/settings', label: 'Settings', icon: Settings },
    { href: '/info', label: 'Info', icon: Info },
    { href: '/tariffs', label: 'Tariffs', icon: BarChart2 },
    { href: '/advisory', label: 'Advisory', icon: Zap },
  ];

  const weatherSources = [
    { name: "AccuWeather", url: "https://www.accuweather.com" },
    { name: "The Weather Channel", url: "https://www.weather.com" },
    { name: "Weather Underground", url: "https://www.wunderground.com" },
    { name: "NWS (US)", url: "https://www.weather.gov" },
    { name: "Google Weather", url: "https://www.google.com/search?q=weather" },
    { name: "BBC Weather", url: "https://www.bbc.com/weather" },
    { name: "Ventusky", url: "https://www.ventusky.com" },
    { name: "Windy", url: "https://www.windy.com" },
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

          {/* Source Dropdown */}
           <DropdownMenu>
             <DropdownMenuTrigger asChild>
               <Button
                 variant="ghost" // Use ghost to match link style appearance
                 className={cn(
                   "flex items-center gap-1 px-2 py-1 rounded-md text-sm transition-colors duration-200 ease-in-out font-medium",
                   "hover:text-accent focus:text-accent focus:outline-none focus:ring-1 focus:ring-accent focus:ring-offset-1 focus:ring-offset-secondary", // Glow effect on hover/focus
                   "[text-shadow:_0_0_8px_var(--tw-shadow-color)] shadow-accent hover:shadow-accent/80 focus:shadow-accent", // Silver text glow
                   // Reset default button padding/height if needed
                    "h-auto" // Allow height to be determined by content + padding
                 )}
               >
                 <List className="h-4 w-4" />
                 Source
               </Button>
             </DropdownMenuTrigger>
             <DropdownMenuContent align="end" className="bg-secondary border-border text-secondary-foreground">
               {weatherSources.map((source) => (
                 <DropdownMenuItem key={source.name} asChild className="cursor-pointer focus:bg-accent/20 focus:text-accent">
                   <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-sm">
                     {source.name}
                   </a>
                 </DropdownMenuItem>
               ))}
             </DropdownMenuContent>
           </DropdownMenu>

        </nav>

        <div className="absolute top-3 right-4 sm:relative sm:top-auto sm:right-auto">
         <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
