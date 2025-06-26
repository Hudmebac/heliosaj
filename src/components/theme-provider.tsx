"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes" // This is a standard import from next-themes
import type { ThemeProviderProps } from "next-themes/dist/types"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider> // Wrapper component
}
