import * as React from "react"

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

export type DeviceType = 'mobile' | 'tablet' | 'desktop'

/**
 * Hook to detect current device type based on screen width
 * @returns 'mobile' | 'tablet' | 'desktop'
 */
export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = React.useState<DeviceType>(() => {
    // SSR-safe initialization
    if (typeof window === 'undefined') return 'desktop'
    const width = window.innerWidth
    if (width < MOBILE_BREAKPOINT) return 'mobile'
    if (width < TABLET_BREAKPOINT) return 'tablet'
    return 'desktop'
  })

  React.useEffect(() => {
    const updateDeviceType = () => {
      const width = window.innerWidth
      if (width < MOBILE_BREAKPOINT) {
        setDeviceType('mobile')
      } else if (width < TABLET_BREAKPOINT) {
        setDeviceType('tablet')
      } else {
        setDeviceType('desktop')
      }
    }

    // Initial check
    updateDeviceType()

    // Use matchMedia for efficient breakpoint detection
    const mobileQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const tabletQuery = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${TABLET_BREAKPOINT - 1}px)`)
    const desktopQuery = window.matchMedia(`(min-width: ${TABLET_BREAKPOINT}px)`)

    const handleMobileChange = (e: MediaQueryListEvent) => {
      if (e.matches) setDeviceType('mobile')
    }
    const handleTabletChange = (e: MediaQueryListEvent) => {
      if (e.matches) setDeviceType('tablet')
    }
    const handleDesktopChange = (e: MediaQueryListEvent) => {
      if (e.matches) setDeviceType('desktop')
    }

    // Modern browsers support addEventListener
    if (mobileQuery.addEventListener) {
      mobileQuery.addEventListener('change', handleMobileChange)
      tabletQuery.addEventListener('change', handleTabletChange)
      desktopQuery.addEventListener('change', handleDesktopChange)
    } else {
      // Fallback for older browsers
      mobileQuery.addListener(handleMobileChange)
      tabletQuery.addListener(handleTabletChange)
      desktopQuery.addListener(handleDesktopChange)
    }

    return () => {
      if (mobileQuery.removeEventListener) {
        mobileQuery.removeEventListener('change', handleMobileChange)
        tabletQuery.removeEventListener('change', handleTabletChange)
        desktopQuery.removeEventListener('change', handleDesktopChange)
      } else {
        mobileQuery.removeListener(handleMobileChange)
        tabletQuery.removeListener(handleTabletChange)
        desktopQuery.removeListener(handleDesktopChange)
      }
    }
  }, [])

  return deviceType
}

/**
 * Convenience hook to check if device is mobile
 * @returns boolean
 */
export function useIsMobile(): boolean {
  const deviceType = useDeviceType()
  return deviceType === 'mobile'
}

/**
 * Convenience hook to check if device is tablet
 * @returns boolean
 */
export function useIsTablet(): boolean {
  const deviceType = useDeviceType()
  return deviceType === 'tablet'
}

/**
 * Convenience hook to check if device is desktop
 * @returns boolean
 */
export function useIsDesktop(): boolean {
  const deviceType = useDeviceType()
  return deviceType === 'desktop'
}

