import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL('https://autovoyce.sanketsonkusare.me'),
  title: 'Autovoyce — Talk to YouTube. Not just watch it.',
  description:
    'Autovoyce analyzes YouTube videos, remembers context, and lets you ask questions via chat or voice. Turn videos into conversations with AI.',
  generator: 'Autovoyce',
  applicationName: 'Autovoyce',
  keywords: [
    'YouTube',
    'AI',
    'chat',
    'voice',
    'video analysis',
    'research',
    'autovoyce',
  ],
  authors: [{ name: 'Sanket Sonkusare', url: 'https://sanketsonkusare.me' }],
  creator: 'Sanket Sonkusare',
  icons: {
    icon: '/logocopy.png',
    apple: '/logocopy.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://autovoyce.sanketsonkusare.me',
    siteName: 'Autovoyce',
    title: 'Autovoyce — Talk to YouTube. Not just watch it.',
    description:
      'Chat with any YouTube video using AI. Ask questions via text or voice and get instant, context-aware answers.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Autovoyce — Talk to YouTube, not just watch it. AI-powered video analysis with text and voice chat.',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Autovoyce — Talk to YouTube. Not just watch it.',
    description:
      'Chat with any YouTube video using AI. Ask questions via text or voice and get instant, context-aware answers.',
    images: ['/og-image.png'],
    creator: '@sanketsonkusare',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
