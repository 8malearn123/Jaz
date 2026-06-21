import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface RevealProps {
  children: ReactNode
  className?: string
  /** Stagger delay step in ms */
  delay?: number
  as?: 'div' | 'li' | 'section'
}

/** Considered motion: a quiet fade-up as the element enters the viewport. */
export function Reveal({ children, className, delay = 0, as = 'div' }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true)
      return
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true)
            obs.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const Tag = as
  return (
    <Tag
      ref={ref as never}
      className={cn(
        'transition-all duration-700 ease-editorial will-change-transform',
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5',
        className,
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  )
}
