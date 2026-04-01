import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Blex — Dental AI Sales Agent',
  description: 'WhatsApp AI Sales Dashboard for Dental Clinic',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0f0f0f] text-[#f5f5f5] antialiased`}>
        {children}
      </body>
    </html>
  )
}
