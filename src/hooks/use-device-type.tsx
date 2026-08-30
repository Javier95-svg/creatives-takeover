import * as React from "react"

/**
 * The project has two intentional, distinct breakpoints. Keep them separate:
 *
 *  - 1024px (Tailwind `lg`) is the NAVIGATION boundary. Below it you get the
 *    hamburger (VisitorNavbar) and the horizontally scrolling stage rail on
 *    /build. Nothing in this file drives navigation any more — the mobile bottom
 *    bar that used to key off 768px was removed on 2026-08-30.
 *  - 768px (Tailwind `md`) is the PHONE-LAYOUT boundary, used by the hooks below,
 *    the `@media (max-width: 768px)` block in index.css, and PulseWidget's
 *    compact mode.
 *
 * The hero has its own self-contained 720px rule in
 * components/hero-cinematic-spotlight.css; it is documented in place and is not
 * meant to line up with either of these.
 *
 * Note the off-by-one below: `width <= 768` classifies exactly 768px as mobile,
 * while Tailwind's `md:` (min-width: 768px) calls it desktop. Anything relying on
 * JS and CSS agreeing at exactly 768px will disagree. Left as-is deliberately —
 * changing it shifts behaviour for every useIsMobile consumer at once.
 */
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
    if (width <= MOBILE_BREAKPOINT) return 'mobile'
    if (width < TABLET_BREAKPOINT) return 'tablet'
    return 'desktop'
  })

  React.useEffect(() => {
    const updateDeviceType = () => {
      const width = window.innerWidth
      if (width <= MOBILE_BREAKPOINT) {
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
    const mobileQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
    const tabletQuery = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT + 1}px) and (max-width: ${TABLET_BREAKPOINT - 1}px)`)
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

