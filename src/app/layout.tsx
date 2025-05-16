import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata = {
  title: 'Payment Gateways Manager',
  description: 'Manage payment gateways and their allowed countries for WordPress sites',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Toaster position="top-right" />
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
} 