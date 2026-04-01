import './globals.css'
import type { Metadata } from 'next'
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'CurioSync',
  description: 'AI Learning Partner - 好奇心与知识结构同步生长',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" className={cn("font-sans", inter.variable)} suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
