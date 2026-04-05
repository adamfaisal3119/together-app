import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ThemeProvider } from '@/lib/theme-context'
import { THEME_PRESETS, BG_PRESETS } from '@/lib/themes'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Together',
  description: 'Plan, chat, and make memories with the people you love',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Together' },
}

// Apply both accent and background vars before first paint to avoid flash
const themeScript = `
  try {
    var root = document.documentElement;
    var accents = ${JSON.stringify(Object.fromEntries(THEME_PRESETS.map(p => [p.id, p.vars])))};
    var bgs = ${JSON.stringify(Object.fromEntries(BG_PRESETS.map(p => [p.id, p.vars])))};

    var accent = localStorage.getItem('accent') || 'violet';
    var systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var bg = localStorage.getItem('bg') || (systemDark ? 'dark' : 'sand');

    var accentVars = accents[accent];
    if (accentVars) Object.keys(accentVars).forEach(function(k) { root.style.setProperty(k, accentVars[k]); });

    var bgVars = bgs[bg];
    if (bgVars) Object.keys(bgVars).forEach(function(k) { root.style.setProperty(k, bgVars[k]); });

    // On light backgrounds, use the accent colour itself as accent-lt so it's readable
    var bgPreset = ${JSON.stringify(Object.fromEntries(BG_PRESETS.map(p => [p.id, p.dark])))};
    if (bgPreset[bg] && accentVars) root.style.setProperty('--accent-lt', accentVars['--accent']);
  } catch(e) {}
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, interactive-widget=resizes-content" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#7c3aed" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} suppressHydrationWarning />
        <script dangerouslySetInnerHTML={{ __html: `if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js')` }} />
      </head>
      <body className="min-h-full flex flex-col bg-base text-fg">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
