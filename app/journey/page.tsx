import type { Metadata } from 'next'
import { JourneyClient } from './client'

export const metadata: Metadata = {
  title: 'Learning Journey · UPSCMap AI',
  description: 'Master the entire UPSC syllabus topic by topic with interactive maps, PYQ practice, and AI-powered notes.',
}

export default function JourneyPage() {
  return <JourneyClient />
}
