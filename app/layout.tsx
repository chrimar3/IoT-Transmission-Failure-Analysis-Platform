import './globals.css'
import type { Metadata } from 'next'
import SessionProvider from '../src/components/SessionProvider'

export const metadata: Metadata = {
  title: 'CU-BEMS IoT Analytics Platform',
  description: 'Bangkok Building Energy Management System - 124.9M Sensor Records Analyzed',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
