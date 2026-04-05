import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ThemeProvider } from '@/lib/theme-context'
import { THEME_PRESETS } from '@/lib/themes'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Together',
  description: 'Plan, chat, and make memories with the people you love',
}

// Inline script to apply saved accent before first paint (avoids flash)
const themeScript = `
  try {
    var accent = localStorage.getItem('accent') || 'violet';
    var themes = ${JSON.stringify(Object.fromEntries(THEME_PRESETS.map(p => [p.id, p.vars])))};
    var vars = themes[accent];
    if (vars) {
      var root = document.documentElement;
      Object.keys(vars).forEach(function(k) { root.style.setProperty(k, vars[k]); });
    }
  } catch(e) {}
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} suppressHydrationWarning />
      </head>
      <body className="min-h-full flex flex-col bg-base text-fg">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
