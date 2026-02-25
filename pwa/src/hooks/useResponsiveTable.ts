import { useEffect, useState } from 'react'

export function useResponsiveTable() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    let debounceTimer: NodeJS.Timeout

    const handleResize = () => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        setIsMobile(window.innerWidth < 768)
      }, 150)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      clearTimeout(debounceTimer)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return { isMobile }
}
