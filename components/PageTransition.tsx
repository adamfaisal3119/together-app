'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [displayChildren, setDisplayChildren] = useState(children)
  const [style, setStyle] = useState<React.CSSProperties>({ opacity: 1, transform: 'translateY(0px)' })
  const prevPathname = useRef(pathname)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (pathname === prevPathname.current) {
      setDisplayChildren(children)
      return
    }
    prevPathname.current = pathname
    if (timer.current) clearTimeout(timer.current)

    // Fade out — quick, barely perceptible
    setStyle({ opacity: 0, transform: 'translateY(6px)', transition: 'opacity 120ms ease, transform 120ms ease' })

    // Swap and fade in with a longer, spring-like ease
    timer.current = setTimeout(() => {
      setDisplayChildren(children)
      setStyle({ opacity: 0, transform: 'translateY(12px)' })
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setStyle({
            opacity: 1,
            transform: 'translateY(0px)',
            transition: 'opacity 350ms cubic-bezier(0.22, 1, 0.36, 1), transform 350ms cubic-bezier(0.22, 1, 0.36, 1)',
          })
        })
      })
    }, 130)

    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [pathname, children])

  return (
    <div style={{ ...style, willChange: 'opacity, transform' }}>
      {displayChildren}
    </div>
  )
}
