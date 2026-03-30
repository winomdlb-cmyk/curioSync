import './globals.css'
import type { Metadata } from 'next'

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
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  )
}
