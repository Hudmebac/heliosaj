
"use client"

import * as React from "react"
import { Moon, Sun, Contrast } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Render a placeholder or null on the server to avoid hydration mismatch for the icon
    return <Button variant="outline" size="icon" className="bg-background text-foreground hover:bg-muted" disabled><Sun className="h-[1.2rem] w-[1.2rem]" /></Button>;
  }

  const Icon = resolvedTheme === 'dark' ? Moon : resolvedTheme === 'high-contrast' ? Contrast : Sun;
  
  // For the button icon, we can show Sun/Moon based on resolved light/dark, 
  // or a specific icon if high-contrast is selected.
  // Or, keep it simple with Sun and Moon only, and let the dropdown show the active state.
  // Let's show Contrast icon when high-contrast is active.
  let TriggerIcon;
  if (theme === 'high-contrast' || resolvedTheme === 'high-contrast') {
    TriggerIcon = <Contrast className="h-[1.2rem] w-[1.2rem]" />;
  } else if (resolvedTheme === 'dark') {
    TriggerIcon = <Moon className="h-[1.2rem] w-[1.2rem]" />;
  } else {
    TriggerIcon = <Sun className="h-[1.2rem] w-[1.2rem]" />;
  }


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="bg-background text-foreground hover:bg-muted">
          {/* Conditional rendering for the icon based on current theme state */}
          {theme === 'light' && <Sun className="h-[1.2rem] w-[1.2rem] transition-all" />}
          {theme === 'dark' && <Moon className="h-[1.2rem] w-[1.2rem] transition-all" />}
          {theme === 'high-contrast' && <Contrast className="h-[1.2rem] w-[1.2rem] transition-all" />}
          {theme === 'system' && (
            <>
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </>
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("high-contrast")}>
          High Contrast
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
