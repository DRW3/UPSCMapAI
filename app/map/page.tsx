import type { Metadata } from 'next'
import { MapClient } from './client'

export const metadata: Metadata = {
  title: 'Map · PadhAI UPSC',
  description: 'AI-generated map for any UPSC topic — geography, history, current affairs.',
}

export default function MapPage() {
  return <MapClient />
}
