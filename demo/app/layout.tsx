import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '1inch Unite - Cross-Chain Bridge Demo',
  description: 'Ethereum ↔ Near atomic swaps powered by 1inch Fusion+',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-1inch-50 to-near-50">
          {children}
        </div>
      </body>
    </html>
  )
}