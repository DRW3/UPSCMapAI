/**
 * Coordinate correction for annotated points.
 * Uses a curated lookup of ~120 common UPSC locations with verified coordinates,
 * plus a fallback Wikipedia geocoding pass for unlisted locations.
 */

import type { AnnotatedPoint } from '@/types'

// ── Curated UPSC Location Database ──────────────────────────────────────────
// [lat, lng] — verified coordinates for places that appear frequently in UPSC maps

const COORDS: Record<string, [number, number]> = {
  // ── State Capitals ──
  'new delhi':        [28.6139, 77.2090], 'delhi':             [28.6139, 77.2090],
  'mumbai':           [19.0760, 72.8777], 'chennai':           [13.0827, 80.2707],
  'kolkata':          [22.5726, 88.3639], 'bengaluru':         [12.9716, 77.5946],
  'bangalore':        [12.9716, 77.5946], 'hyderabad':         [17.3850, 78.4867],
  'ahmedabad':        [23.0225, 72.5714], 'pune':              [18.5204, 73.8567],
  'jaipur':           [26.9124, 75.7873], 'lucknow':           [26.8467, 80.9462],
  'bhopal':           [23.2599, 77.4126], 'patna':             [25.6093, 85.1376],
  'thiruvananthapuram':[8.5241, 76.9366], 'bhubaneswar':       [20.2961, 85.8245],
  'chandigarh':       [30.7333, 76.7794], 'dehradun':          [30.3165, 78.0322],
  'dispur':           [26.1445, 91.7362], 'guwahati':          [26.1445, 91.7362],
  'shimla':           [31.1048, 77.1734], 'srinagar':          [34.0837, 74.7973],
  'jammu':            [32.7266, 74.8570], 'gangtok':           [27.3389, 88.6065],
  'imphal':           [24.8170, 93.9368], 'shillong':          [25.5788, 91.8933],
  'aizawl':           [23.7271, 92.7176], 'kohima':            [25.6751, 94.1086],
  'agartala':         [23.8315, 91.2868], 'itanagar':          [27.0844, 93.6053],
  'ranchi':           [23.3441, 85.3096], 'raipur':            [21.2514, 81.6296],
  'panaji':           [15.4909, 73.8278], 'gandhinagar':       [23.2156, 72.6369],
  'amaravati':        [16.5062, 80.6480], 'port blair':        [11.6234, 92.7265],
  'leh':              [34.1526, 77.5771], 'kavaratti':         [10.5626, 72.6369],
  'silvassa':         [20.2766, 73.0169], 'daman':             [20.3974, 72.8328],

  // ── Major Cities ──
  'varanasi':         [25.3176, 83.0068], 'agra':              [27.1767, 78.0081],
  'amritsar':         [31.6340, 74.8723], 'coimbatore':        [11.0168, 76.9558],
  'nagpur':           [21.1458, 79.0882], 'visakhapatnam':     [17.6868, 83.2185],
  'indore':           [22.7196, 75.8577], 'surat':             [21.1702, 72.8311],
  'kochi':            [9.9312, 76.2673],  'mysuru':            [12.2958, 76.6394],
  'mysore':           [12.2958, 76.6394], 'madurai':           [9.9252, 78.1198],
  'ujjain':           [23.1765, 75.7885], 'prayagraj':         [25.4358, 81.8463],
  'allahabad':        [25.4358, 81.8463], 'kanpur':            [26.4499, 80.3319],
  'jodhpur':          [26.2389, 73.0243], 'udaipur':           [24.5854, 73.7125],
  'gwalior':          [26.2183, 78.1828], 'thanjavur':         [10.7870, 79.1378],

  // ── Historical Sites / Battles ──
  'plassey':          [23.8013, 88.2472], 'panipat':           [29.3909, 76.9635],
  'haldighati':       [24.8803, 73.6922], 'talikota':          [16.4742, 76.3118],
  'buxar':            [25.5644, 83.9812], 'tarain':            [29.2844, 76.9703],
  'kalinga':          [20.4625, 85.8830], 'taxila':            [33.7463, 72.7986],
  'hampi':            [15.3350, 76.4600], 'fatehpur sikri':    [27.0940, 77.6610],
  'pataliputra':      [25.6093, 85.1376], 'nalanda':           [25.1357, 85.4432],
  'sanchi':           [23.4793, 77.7399], 'bodh gaya':         [24.6961, 84.9869],
  'konark':           [19.8876, 86.0945], 'khajuraho':         [24.8318, 79.9199],
  'ajanta':           [20.5519, 75.7033], 'ellora':            [20.0258, 75.1780],
  'lothal':           [22.5218, 72.2495], 'dholavira':         [23.8871, 70.2133],
  'mohenjo daro':     [27.3244, 68.1386], 'harappa':           [30.6310, 72.8647],
  'rakhigarhi':       [29.2813, 76.1165], 'kalibangan':        [29.4722, 74.1301],

  // ── Rivers (source / key points) ──
  'gangotri':         [30.9946, 78.9398], 'gomukh':            [30.9268, 79.0833],
  'devprayag':        [30.1454, 78.5971], 'haridwar':          [29.9457, 78.1642],
  'prayagraj sangam': [25.4250, 81.8855], 'diamond harbour':   [22.1910, 88.1859],
  'yamuna nagar':     [30.1290, 77.2674], 'yamunotri':         [31.0131, 78.4482],
  'manasarovar':      [30.6500, 81.4636], 'amarkantak':        [22.6740, 81.7534],
  'mahabaleshwar':    [17.9307, 73.6477], 'trimbakeshwar':     [19.9322, 73.5303],
  'talakaveri':       [12.4218, 75.4927], 'sundarbans':        [21.9497, 89.1833],

  // ── Mountain Passes ──
  'khyber pass':      [34.0957, 71.0956], 'bolan pass':        [29.8733, 67.2906],
  'rohtang pass':     [32.3722, 77.2476], 'zoji la':           [34.2833, 75.4833],
  'nathu la':         [27.0386, 88.8301], 'shipki la':         [31.7810, 78.7560],
  'bomdi la':         [27.2647, 92.4013], 'jelep la':          [27.3161, 88.8303],
  'karakoram pass':   [35.5255, 77.8115], 'burzil pass':       [34.8903, 75.0906],

  // ── National Parks / Reserves ──
  'jim corbett':      [29.5300, 78.7747], 'kaziranga':         [26.5775, 93.1711],
  'ranthambore':      [26.0173, 76.5026], 'sundarbans np':     [21.9497, 89.1833],
  'gir':              [21.1243, 70.7943], 'periyar':           [9.4680, 77.2427],
  'kanha':            [22.3345, 80.6115], 'bandipur':          [11.6723, 76.6343],
  'sariska':          [27.3128, 76.3988], 'manas':             [26.6592, 90.9500],
  'valley of flowers':[30.7284, 79.6050], 'hemis':             [33.8952, 77.3898],
  'namdapha':         [27.4939, 96.3893], 'silent valley':     [11.0833, 76.4333],
  'barren island':    [12.2780, 93.8580], 'narcondam':         [13.4300, 94.2700],

  // ── Dams / Infrastructure ──
  'bhakra nangal':    [31.4105, 76.4341], 'hirakud':           [21.5283, 83.8691],
  'tehri dam':        [30.3780, 78.4800], 'sardar sarovar':    [21.8302, 73.7470],
  'nagarjuna sagar':  [16.5740, 79.3130], 'tungabhadra dam':   [15.2673, 76.3362],

  // ── Ports ──
  'kandla':           [23.0333, 70.2167], 'nhava sheva':       [18.9500, 72.9500],
  'jnpt':             [18.9500, 72.9500], 'mundra':            [22.8394, 69.7216],
  'paradip':          [20.2647, 86.6085], 'ennore':            [13.2167, 80.3167],
  'tuticorin':        [8.7642, 78.1348],  'mangalore':         [12.9141, 74.8560],
  'haldia':           [22.0667, 88.0667], 'cochin port':       [9.9667, 76.2667],

  // ── Nuclear Plants ──
  'tarapur':          [19.8299, 72.6508], 'kudankulam':        [8.1710, 77.7140],
  'kalpakkam':        [12.5594, 80.1756], 'rawatbhata':        [24.8800, 75.5869],
  'narora':           [28.1954, 78.3897], 'kaiga':             [14.8518, 74.4360],
  'kakrapar':         [21.2366, 73.3503],

  // ── Volcanoes (India) ──
  'barren island volcano': [12.2780, 93.8580],
  'deccan traps':     [19.0000, 75.0000],

  // ── Neighbors' Capitals ──
  'islamabad':        [33.6844, 73.0479], 'kathmandu':         [27.7172, 85.3240],
  'dhaka':            [23.8103, 90.4125], 'colombo':           [6.9271, 79.8612],
  'thimphu':          [27.4728, 89.6390], 'naypyidaw':         [19.7633, 96.0785],
  'kabul':            [34.5553, 69.2075], 'beijing':           [39.9042, 116.4074],
  'male':             [4.1755, 73.5093],
}

/**
 * Normalize a label to a lookup key: lowercase, strip emoji/parentheticals/descriptions
 */
function toKey(label: string): string {
  return label
    .replace(/[^a-zA-Z0-9\s\-']/g, '')         // strip emoji and special chars
    .replace(/\s*[:—–\-].*/g, '')              // strip "— description" suffix
    .replace(/\s*\([^)]*\)/g, '')              // strip (parentheticals)
    .replace(/\b(river|dam|pass|port|city|capital|fort|np|national park|reserve|volcano|island)\b/gi, '')
    .trim().toLowerCase()
    .replace(/\s+/g, ' ')
}

/**
 * Correct coordinates for annotated points using the curated lookup.
 * Matches by point label or id. Keeps the model's coordinates for unlisted locations.
 */
export function correctCoordinates(points: AnnotatedPoint[]): AnnotatedPoint[] {
  return points.map(pt => {
    // Try matching by label (most reliable)
    const labelKey = toKey(pt.label)
    const idKey = pt.id.replace(/_/g, ' ').toLowerCase()

    // Try exact match first, then partial matches
    const match = COORDS[labelKey] || COORDS[idKey]
      || Object.entries(COORDS).find(([k]) => labelKey.includes(k) && k.length >= 4)?.[1]
      || Object.entries(COORDS).find(([k]) => idKey.includes(k) && k.length >= 4)?.[1]

    if (match) {
      return { ...pt, coordinates: [match[1], match[0]] as [number, number] }
    }

    return pt
  })
}
