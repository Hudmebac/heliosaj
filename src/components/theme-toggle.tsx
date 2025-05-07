
"use client"

import * as React from "react"
import { Moon, Sun, Contrast } from "lucide-react"
import { useTheme } from "next-themes"
import { useHighContrast } from "@/hooks/use-high-contrast" // Import the new hook

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem, // For a toggle-like behavior
  DropdownMenuTrigger,
  DropdownMenuSeparator, // To separate theme and HC toggle
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { setTheme } = useTheme()
  const [isHighContrast, setIsHighContrast] = useHighContrast() // Use the hook

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="bg-background text-foreground hover:bg-muted">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
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
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={isHighContrast}
          onCheckedChange={setIsHighContrast} // Use setIsHighContrast from the hook
        >
          <Contrast className="mr-2 h-4 w-4" />
          High Contrast
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
