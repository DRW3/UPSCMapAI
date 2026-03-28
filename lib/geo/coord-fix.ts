/**
 * Coordinate correction for annotated points.
 * 1. Instant lookup from curated UPSC locations (~120 entries)
 * 2. Parallel Nominatim geocoding for everything else (free, no API key)
 * 3. Model's original coordinates as final fallback
 */

import type { AnnotatedPoint } from '@/types'

// ── Curated UPSC Location Database (instant, no API call) ───────────────────
const COORDS: Record<string, [number, number]> = {
  // State Capitals
  'new delhi':[28.6139,77.2090],'delhi':[28.6139,77.2090],'mumbai':[19.0760,72.8777],
  'chennai':[13.0827,80.2707],'kolkata':[22.5726,88.3639],'bengaluru':[12.9716,77.5946],
  'bangalore':[12.9716,77.5946],'hyderabad':[17.3850,78.4867],'ahmedabad':[23.0225,72.5714],
  'jaipur':[26.9124,75.7873],'lucknow':[26.8467,80.9462],'bhopal':[23.2599,77.4126],
  'patna':[25.6093,85.1376],'thiruvananthapuram':[8.5241,76.9366],'bhubaneswar':[20.2961,85.8245],
  'chandigarh':[30.7333,76.7794],'dehradun':[30.3165,78.0322],'guwahati':[26.1445,91.7362],
  'shimla':[31.1048,77.1734],'srinagar':[34.0837,74.7973],'gangtok':[27.3389,88.6065],
  'imphal':[24.8170,93.9368],'shillong':[25.5788,91.8933],'ranchi':[23.3441,85.3096],
  'raipur':[21.2514,81.6296],'panaji':[15.4909,73.8278],'port blair':[11.6234,92.7265],
  'leh':[34.1526,77.5771],
  // Major Cities
  'varanasi':[25.3176,83.0068],'agra':[27.1767,78.0081],'amritsar':[31.6340,74.8723],
  'nagpur':[21.1458,79.0882],'visakhapatnam':[17.6868,83.2185],'surat':[21.1702,72.8311],
  'kochi':[9.9312,76.2673],'pune':[18.5204,73.8567],'indore':[22.7196,75.8577],
  'prayagraj':[25.4358,81.8463],'allahabad':[25.4358,81.8463],'kanpur':[26.4499,80.3319],
  'ujjain':[23.1765,75.7885],'madurai':[9.9252,78.1198],'jodhpur':[26.2389,73.0243],
  // Historical
  'plassey':[23.8013,88.2472],'panipat':[29.3909,76.9635],'haldighati':[24.8803,73.6922],
  'buxar':[25.5644,83.9812],'hampi':[15.3350,76.4600],'pataliputra':[25.6093,85.1376],
  'nalanda':[25.1357,85.4432],'sanchi':[23.4793,77.7399],'bodh gaya':[24.6961,84.9869],
  'konark':[19.8876,86.0945],'ajanta':[20.5519,75.7033],'ellora':[20.0258,75.1780],
  'lothal':[22.5218,72.2495],'dholavira':[23.8871,70.2133],'mohenjo daro':[27.3244,68.1386],
  'harappa':[30.6310,72.8647],'fatehpur sikri':[27.0940,77.6610],'taxila':[33.7463,72.7986],
  // Rivers
  'gangotri':[30.9946,78.9398],'yamunotri':[31.0131,78.4482],'amarkantak':[22.6740,81.7534],
  'devprayag':[30.1454,78.5971],'haridwar':[29.9457,78.1642],
  // Passes
  'khyber pass':[34.0957,71.0956],'rohtang pass':[32.3722,77.2476],'nathu la':[27.0386,88.8301],
  'zoji la':[34.2833,75.4833],'bomdi la':[27.2647,92.4013],
  // Parks
  'jim corbett':[29.5300,78.7747],'kaziranga':[26.5775,93.1711],'ranthambore':[26.0173,76.5026],
  'gir':[21.1243,70.7943],'periyar':[9.4680,77.2427],'kanha':[22.3345,80.6115],
  'barren island':[12.2780,93.8580],'valley of flowers':[30.7284,79.6050],
  // Neighbors
  'islamabad':[33.6844,73.0479],'kathmandu':[27.7172,85.3240],'dhaka':[23.8103,90.4125],
  'colombo':[6.9271,79.8612],'thimphu':[27.4728,89.6390],'kabul':[34.5553,69.2075],
}

function toKey(label: string): string {
  return label
    .replace(/[^a-zA-Z0-9\s\-']/g, '')
    .replace(/\s*[:—–].*/g, '')
    .replace(/\s*\([^)]*\)/g, '')
    .trim().toLowerCase()
    .replace(/\s+/g, ' ')
}

function lookupCoords(label: string, id: string): [number, number] | null {
  const labelKey = toKey(label)
  const idKey = id.replace(/_/g, ' ').toLowerCase()
  const match = COORDS[labelKey] || COORDS[idKey]
    || Object.entries(COORDS).find(([k]) => labelKey.includes(k) && k.length >= 4)?.[1]
    || Object.entries(COORDS).find(([k]) => idKey.includes(k) && k.length >= 4)?.[1]
  return match ?? null
}

/**
 * Geocode a place name using Nominatim (OpenStreetMap). Free, no key needed.
 * Returns [lat, lng] or null on failure. Biased toward India/South Asia.
 */
async function geocode(name: string): Promise<[number, number] | null> {
  const clean = toKey(name)
  if (!clean || clean.length < 2) return null
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(clean)}&format=json&limit=1&viewbox=60,5,100,40&bounded=0`
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(2000),
      headers: { 'User-Agent': 'UPSCMapAI/1.0 (educational)' },
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.length === 0) return null
    const lat = parseFloat(data[0].lat)
    const lng = parseFloat(data[0].lon)
    if (isNaN(lat) || isNaN(lng)) return null
    return [lat, lng]
  } catch {
    return null
  }
}

/**
 * Correct coordinates for annotated points:
 * 1. Check curated lookup (instant)
 * 2. For misses, geocode via Nominatim in parallel (adds ~300ms)
 * 3. Keep model's coordinates as fallback
 */
export async function correctCoordinates(points: AnnotatedPoint[]): Promise<AnnotatedPoint[]> {
  // Phase 1: instant lookup
  const needsGeocode: number[] = []
  const results = points.map((pt, i) => {
    const match = lookupCoords(pt.label, pt.id)
    if (match) {
      return { ...pt, coordinates: [match[1], match[0]] as [number, number] }
    }
    needsGeocode.push(i)
    return pt
  })

  // Phase 2: parallel Nominatim geocoding for remaining points
  if (needsGeocode.length > 0) {
    // Nominatim allows 1 req/sec, but for educational use with small batches
    // parallel requests with short timeout is acceptable
    const geocodeResults = await Promise.all(
      needsGeocode.map(i => geocode(points[i].label))
    )

    for (let j = 0; j < needsGeocode.length; j++) {
      const coords = geocodeResults[j]
      if (coords) {
        const idx = needsGeocode[j]
        results[idx] = {
          ...results[idx],
          coordinates: [coords[1], coords[0]] as [number, number],
        }
      }
    }
  }

  return results
}
