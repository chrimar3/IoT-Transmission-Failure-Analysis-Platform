/**
 * Navigation Component for CU-BEMS Platform
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/dashboard', label: 'Analytics Dashboard', icon: '📊' },
  ]

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold text-blue-600">CU-BEMS</span>
            <span className="ml-2 text-sm text-gray-500">IoT Analytics</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>

          {/* Status Indicator */}
          <div className="flex items-center">
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
              <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-2"></span>
              124.9M Records Analyzed
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}