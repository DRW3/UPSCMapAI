import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'UPSC Map AI',
  description: 'AI-powered map generator for UPSC geography, history, and current affairs',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
