// components/journey/hooks/useDeviceClass.ts
'use client'

import { useEffect, useState } from 'react'

export type DeviceClass = 'mobile' | 'desktop'

/**
 * Returns the current device class based on viewport width.
 *
 * - Returns `null` on the first render (SSR + before hydration) so the
 *   parent can render a Loading state instead of flashing the wrong shell.
 * - Returns 'mobile' for viewports < 1024px (phone + tablet portrait).
 * - Returns 'desktop' for >= 1024px.
 *
 * Why 1024px not 768px: the desktop journey is a 3-column command center
 * that needs ~960px of horizontal room to feel right. Tablets in portrait
 * (768-1023px) get the mobile experience, which is correct — they
 * already match the phone aspect ratio.
 */
export function useDeviceClass(): DeviceClass | null {
  const [deviceClass, setDeviceClass] = useState<DeviceClass | null>(null)

  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth
      setDeviceClass(w >= 1024 ? 'desktop' : 'mobile')
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])

  return deviceClass
}
