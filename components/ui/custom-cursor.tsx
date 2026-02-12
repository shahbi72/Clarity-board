'use client'

import React from 'react'

const HOVER_SELECTOR =
  'a, button, input, select, textarea, [role="button"], [data-cursor="hover"]'

export default function CustomCursor() {
  const cursorRef = React.useRef<HTMLDivElement | null>(null)
  const dotRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const supportsFinePointer = window.matchMedia('(pointer: fine)').matches
    if (!supportsFinePointer) return

    const cursor = cursorRef.current
    const dot = dotRef.current
    if (!cursor || !dot) return

    document.body.classList.add('cursor-enabled')

    const updatePosition = (event: PointerEvent) => {
      const { clientX, clientY } = event
      cursor.style.opacity = '1'
      dot.style.opacity = '1'
      cursor.style.left = `${clientX}px`
      cursor.style.top = `${clientY}px`
      dot.style.left = `${clientX}px`
      dot.style.top = `${clientY}px`
    }

    const updateHover = (event: Event) => {
      const target = event.target as HTMLElement | null
      if (!target) return
      const isInteractive = Boolean(target.closest(HOVER_SELECTOR))
      cursor.classList.toggle('hover', isInteractive)
      dot.classList.toggle('hover', isInteractive)
    }

    const clearHover = () => {
      cursor.classList.remove('hover')
      dot.classList.remove('hover')
    }

    document.addEventListener('pointermove', updatePosition)
    document.addEventListener('pointerover', updateHover)
    document.addEventListener('pointerout', clearHover)

    return () => {
      document.body.classList.remove('cursor-enabled')
      document.removeEventListener('pointermove', updatePosition)
      document.removeEventListener('pointerover', updateHover)
      document.removeEventListener('pointerout', clearHover)
    }
  }, [])

  return (
    <>
      <div ref={cursorRef} className="cursor" aria-hidden="true" />
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
    </>
  )
}
