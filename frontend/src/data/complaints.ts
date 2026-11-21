import type { Complaint, ComplaintStatus, ComplaintTimelineEntry, IncidentCategory, Priority } from '@/types'
import { getNearestCell } from '@/lib/risk'

// Seeded demo complaints. Citizen "Aarav Sharma" owns the first six so the
// citizen portal has a believable history. All records are simulated and
// labelled as such in the interface.

const STATUS_SEQUENCE: ComplaintStatus[] = [
  'submitted',
  'under_review',
  'inspection_scheduled',
  'in_progress',
  'resolved',
]

const STEP_NOTE: Record<ComplaintStatus, string> = {
  submitted: 'Complaint received, validated and geo-tagged to a 250 m grid cell.',
  under_review: 'Zone office reviewing the report and linked risk context.',
  inspection_scheduled: 'Field inspection scheduled with the responsible department.',
  in_progress: 'Maintenance crew assigned and work order opened.',
  resolved: 'Work completed and marked resolved by the authority.',
}

function isoDaysAgo(days: number, hour = 10, minute = 20) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

function buildTimeline(
  status: ComplaintStatus,
  createdAt: string,
  department: string,
  resolutionNote?: string,
): ComplaintTimelineEntry[] {
  const end = STATUS_SEQUENCE.indexOf(status)
  return STATUS_SEQUENCE.slice(0, end + 1).map((step, index) => ({
    status: step,
    label: STEP_NOTE[step],
    at: new Date(new Date(createdAt).getTime() + index * 18 * 3_600_000).toISOString(),
    actor: index === 0 ? 'citizen' : 'authority',
    note: step === 'in_progress' ? `Assigned to ${department}.` : step === 'resolved' ? resolutionNote : undefined,
  }))
}

interface Seed {
  id: string
  ref: string
  category: IncidentCategory
  title: string
  description: string
  address: string
  localityId: string
  location: { lng: number; lat: number }
  status: ComplaintStatus
  priority: Priority
  daysAgo: number
  citizen: string
  department: string
  resolutionNote?: string
}

const SEEDS: Seed[] = [
  {
    id: 'cmp-001',
    ref: 'CLX-2026-0121',
    category: 'waterlogging',
    title: 'Water pooling near Scheme 54 market',
    description:
      'After the evening rain, water stands knee-deep for about two hours in front of the market entrance. Two-wheelers are being pushed through and the storm drain is overflowing.',
    address: 'Scheme 54, near Satya Sai Square, Vijay Nagar',
    localityId: 'vijay-nagar',
    location: { lng: 75.8917, lat: 22.7521 },
    status: 'under_review',
    priority: 'high',
    daysAgo: 2,
    citizen: 'Aarav Sharma',
    department: 'Stormwater & Drainage Cell',
  },
  {
    id: 'cmp-002',
    ref: 'CLX-2026-0119',
    category: 'potholes',
    title: 'Deep potholes on AB Road service lane',
    description:
      'Two deep potholes in the left lane just before the Palasia turn. They fill with water and are hard to see at night. A scooter rider fell here yesterday.',
    address: 'AB Road service lane, near Palasia Square',
    localityId: 'palasia',
    location: { lng: 75.8831, lat: 22.7239 },
    status: 'inspection_scheduled',
    priority: 'high',
    daysAgo: 5,
    citizen: 'Aarav Sharma',
    department: 'Roads & Bridges Department',
  },
  {
    id: 'cmp-003',
    ref: 'CLX-2026-0124',
    category: 'garbage',
    title: 'Garbage pile blocking drain near Rajwada',
    description:
      'A large pile of commercial waste has been left beside the drain for three days. It is starting to block the grating and smells strongly in the afternoon.',
    address: 'Near Rajwada palace, Malharganj side',
    localityId: 'rajwada',
    location: { lng: 75.8546, lat: 22.7192 },
    status: 'submitted',
    priority: 'medium',
    daysAgo: 1,
    citizen: 'Aarav Sharma',
    department: 'Solid Waste Management',
  },
  {
    id: 'cmp-004',
    ref: 'CLX-2026-0110',
    category: 'drainage',
    title: 'Broken drain cover at Sudama Nagar main road',
    description:
      'The concrete cover over the stormwater drain is broken and has fallen in. The opening is about two feet wide and is a hazard for pedestrians and cyclists.',
    address: 'Sudama Nagar main road, near the water tank',
    localityId: 'sudama-nagar',
    location: { lng: 75.8318, lat: 22.6871 },
    status: 'in_progress',
    priority: 'high',
    daysAgo: 9,
    citizen: 'Aarav Sharma',
    department: 'Stormwater & Drainage Cell',
  },
  {
    id: 'cmp-005',
    ref: 'CLX-2026-0098',
    category: 'road_damage',
    title: 'Cracked road surface near Bhawarkuan square',
    description:
      'A long crack has opened across the bus lane and the surface is sinking slightly. It looks like water is getting under the pavement.',
    address: 'Bhawarkuan square, towards DAVV campus',
    localityId: 'bhawarkuan',
    location: { lng: 75.8684, lat: 22.6895 },
    status: 'resolved',
    priority: 'medium',
    daysAgo: 14,
    citizen: 'Aarav Sharma',
    department: 'Roads & Bridges Department',
    resolutionNote:
      'Crack sealed and a 6 m section of wearing course replaced. Site re-inspected after 48 hours.',
  },
  {
    id: 'cmp-006',
    ref: 'CLX-2026-0117',
    category: 'other',
    title: 'Damaged footpath near Annapurna temple',
    description:
      'The footpath paver blocks are missing over a stretch of about ten metres. Elderly visitors are walking on the road to avoid the gap.',
    address: 'Annapurna Road, near the temple entrance',
    localityId: 'annapurna',
    location: { lng: 75.8296, lat: 22.7031 },
    status: 'submitted',
    priority: 'low',
    daysAgo: 3,
    citizen: 'Aarav Sharma',
    department: 'Indore Municipal Corporation — Zone Office',
  },
  {
    id: 'cmp-007',
    ref: 'CLX-2026-0116',
    category: 'waterlogging',
    title: 'Knee-deep water at Khajrana temple road',
    description:
      'The road outside the temple parking floods quickly. Shopkeepers have placed sandbags but water is entering the first row of shops.',
    address: 'Khajrana temple road, near the main gate',
    localityId: 'khajrana',
    location: { lng: 75.9092, lat: 22.7261 },
    status: 'in_progress',
    priority: 'urgent',
    daysAgo: 4,
    citizen: 'Priya Verma',
    department: 'Stormwater & Drainage Cell',
  },
  {
    id: 'cmp-008',
    ref: 'CLX-2026-0113',
    category: 'potholes',
    title: 'Pothole cluster on MR-10 near Vijay Nagar',
    description:
      'A cluster of five or six potholes across the left lane after the MR-10 flyover. Traffic slows suddenly and there is a risk of rear-end collisions.',
    address: 'MR-10, eastbound after Vijay Nagar flyover',
    localityId: 'mr-10',
    location: { lng: 75.9048, lat: 22.7467 },
    status: 'under_review',
    priority: 'high',
    daysAgo: 6,
    citizen: 'Rohan Jain',
    department: 'Roads & Bridges Department',
  },
  {
    id: 'cmp-009',
    ref: 'CLX-2026-0111',
    category: 'drainage',
    title: 'Storm drain choked with silt in Juni Indore',
    description:
      'The drain along the lane is almost full of silt and plastic. Even a short shower causes water to back up into the lane.',
    address: 'Juni Indore, near the old municipal school',
    localityId: 'juni-indore',
    location: { lng: 75.8612, lat: 22.7147 },
    status: 'inspection_scheduled',
    priority: 'urgent',
    daysAgo: 8,
    citizen: 'Meera Patel',
    department: 'Stormwater & Drainage Cell',
  },
  {
    id: 'cmp-010',
    ref: 'CLX-2026-0107',
    category: 'garbage',
    title: 'Dumping near Pipliyahana lake edge',
    description:
      'Construction debris and household waste are being dumped on the lake edge. Some of it is sliding into the water.',
    address: 'Pipliyahana lake, northern access road',
    localityId: 'pipliyahana',
    location: { lng: 75.9107, lat: 22.7408 },
    status: 'resolved',
    priority: 'medium',
    daysAgo: 11,
    citizen: 'Imran Khan',
    department: 'Solid Waste Management',
    resolutionNote: 'Debris removed and a no-dumping board installed. Site handed to the lake maintenance team.',
  },
  {
    id: 'cmp-011',
    ref: 'CLX-2026-0118',
    category: 'waterlogging',
    title: 'Water enters shops on Malharganj main road',
    description:
      'During heavy rain, water crosses the footpath and enters three shops. The drain in front appears to be lower than the road level.',
    address: 'Malharganj main road, near the cloth market',
    localityId: 'malharganj',
    location: { lng: 75.8451, lat: 22.7163 },
    status: 'under_review',
    priority: 'urgent',
    daysAgo: 3,
    citizen: 'Sneha Kulkarni',
    department: 'Stormwater & Drainage Cell',
  },
  {
    id: 'cmp-012',
    ref: 'CLX-2026-0112',
    category: 'road_damage',
    title: 'Road caved in near Nanda Nagar bus stop',
    description:
      'A section of the road has sunk by several inches next to the bus stop. It looks hollow underneath and is cordoned off with a plastic chair.',
    address: 'Nanda Nagar bus stop, main road',
    localityId: 'nanda-nagar',
    location: { lng: 75.8966, lat: 22.7011 },
    status: 'in_progress',
    priority: 'high',
    daysAgo: 7,
    citizen: 'Vikram Rathore',
    department: 'Roads & Bridges Department',
  },
  {
    id: 'cmp-013',
    ref: 'CLX-2026-0105',
    category: 'drainage',
    title: 'Open drain near Bengali Square school',
    description:
      'The drain cover is missing along the school boundary. Children walk past it every morning and the drain is about three feet deep.',
    address: 'Bengali Square, near the government school',
    localityId: 'bengali-square',
    location: { lng: 75.9006, lat: 22.7107 },
    status: 'resolved',
    priority: 'high',
    daysAgo: 12,
    citizen: 'Ananya Dubey',
    department: 'Stormwater & Drainage Cell',
    resolutionNote: 'New RCC covers installed over 12 m and the drain desilted before the school reopening.',
  },
  {
    id: 'cmp-014',
    ref: 'CLX-2026-0101',
    category: 'potholes',
    title: 'Potholes at Mhow Naka turn',
    description:
      'The turn from the highway has broken up into loose gravel and potholes. Buses are swerving into the opposite lane to avoid it.',
    address: 'Mhow Naka, highway turn towards Sudama Nagar',
    localityId: 'mhow-naka',
    location: { lng: 75.8457, lat: 22.6906 },
    status: 'resolved',
    priority: 'medium',
    daysAgo: 16,
    citizen: 'Karan Malhotra',
    department: 'Roads & Bridges Department',
    resolutionNote: 'Patch repaired with hot mix and the shoulder compacted. Follow-up inspection scheduled.',
  },
  {
    id: 'cmp-015',
    ref: 'CLX-2026-0115',
    category: 'waterlogging',
    title: 'Rainwater stagnates at Silicon City entrance',
    description:
      'The entrance road holds water for a long time after rain because the outlet is blocked by leaves and silt.',
    address: 'Silicon City main entrance, north Indore',
    localityId: 'silicon-city',
    location: { lng: 75.8728, lat: 22.7725 },
    status: 'submitted',
    priority: 'medium',
    daysAgo: 5,
    citizen: 'Neha Agrawal',
    department: 'Stormwater & Drainage Cell',
  },
  {
    id: 'cmp-016',
    ref: 'CLX-2026-0123',
    category: 'garbage',
    title: 'Commercial waste dumped on Vallabh Nagar footpath',
    description:
      'Restaurant waste is being left on the footpath overnight. It attracts dogs and blocks the pedestrian route.',
    address: 'Vallabh Nagar main market',
    localityId: 'vallabh-nagar',
    location: { lng: 75.8726, lat: 22.7106 },
    status: 'under_review',
    priority: 'low',
    daysAgo: 2,
    citizen: 'Devansh Joshi',
    department: 'Solid Waste Management',
  },
  {
    id: 'cmp-017',
    ref: 'CLX-2026-0096',
    category: 'road_damage',
    title: 'Broken speed breaker near Tilak Nagar',
    description:
      'The speed breaker has crumbled at both ends. The exposed edge is sharp and damaging tyres at night.',
    address: 'Tilak Nagar, near the community hall',
    localityId: 'tilak-nagar',
    location: { lng: 75.8807, lat: 22.7005 },
    status: 'resolved',
    priority: 'medium',
    daysAgo: 20,
    citizen: 'Ritu Sethi',
    department: 'Roads & Bridges Department',
    resolutionNote: 'Speed breaker rebuilt and painted with reflective markings.',
  },
  {
    id: 'cmp-018',
    ref: 'CLX-2026-0109',
    category: 'drainage',
    title: 'Culvert blocked at Bicholi Mardana',
    description:
      'The culvert under the village link road is blocked with branches and silt. Water is already pooling on the upstream side.',
    address: 'Bicholi Mardana link road',
    localityId: 'bicholi-mardana',
    location: { lng: 75.8906, lat: 22.7704 },
    status: 'inspection_scheduled',
    priority: 'high',
    daysAgo: 13,
    citizen: 'Sameer Khan',
    department: 'Stormwater & Drainage Cell',
  },
  {
    id: 'cmp-019',
    ref: 'CLX-2026-0125',
    category: 'waterlogging',
    title: 'Waterlogging near Palasia crossing after rain',
    description:
      'Water collects around the crossing and the pedestrian refuge island. Vehicles splash pedestrians waiting to cross.',
    address: 'Palasia crossing, AB Road',
    localityId: 'palasia',
    location: { lng: 75.8841, lat: 22.7248 },
    status: 'submitted',
    priority: 'high',
    daysAgo: 1,
    citizen: 'Farah Siddiqui',
    department: 'Stormwater & Drainage Cell',
  },
  {
    id: 'cmp-020',
    ref: 'CLX-2026-0108',
    category: 'potholes',
    title: 'Potholes on Airport Road near Super Corridor junction',
    description:
      'Several potholes have formed where the new corridor road meets the old Airport Road. The edges are breaking away.',
    address: 'Airport Road, near Super Corridor junction',
    localityId: 'airport-road',
    location: { lng: 75.8026, lat: 22.7296 },
    status: 'in_progress',
    priority: 'medium',
    daysAgo: 10,
    citizen: 'Manish Tiwari',
    department: 'Roads & Bridges Department',
  },
  {
    id: 'cmp-021',
    ref: 'CLX-2026-0114',
    category: 'garbage',
    title: 'Waste burning near Rajwada parking',
    description:
      'Waste is being burned in the open near the parking area in the evenings. The smoke drifts into nearby shops and homes.',
    address: 'Rajwada parking area, old city',
    localityId: 'rajwada',
    location: { lng: 75.8561, lat: 22.7179 },
    status: 'under_review',
    priority: 'medium',
    daysAgo: 6,
    citizen: 'Pooja Bansal',
    department: 'Solid Waste Management',
  },
  {
    id: 'cmp-022',
    ref: 'CLX-2026-0099',
    category: 'other',
    title: 'Damaged footpath near Vijay Nagar square',
    description:
      'Paver blocks have come loose along the footpath and one section is missing entirely. Pedestrians are stepping onto the road.',
    address: 'Vijay Nagar square, near the shopping complex',
    localityId: 'vijay-nagar',
    location: { lng: 75.8944, lat: 22.7539 },
    status: 'resolved',
    priority: 'low',
    daysAgo: 18,
    citizen: 'Arjun Nair',
    department: 'Indore Municipal Corporation — Zone Office',
    resolutionNote: 'Paver blocks re-laid and the edge kerb repaired.',
  },
  {
    id: 'cmp-023',
    ref: 'CLX-2026-0120',
    category: 'waterlogging',
    title: 'Drain overflow at Bhawarkuan underpass',
    description:
      'The underpass fills quickly and the pump does not seem to be running. Water was above the footboard level of a car yesterday.',
    address: 'Bhawarkuan underpass, towards Rajwada',
    localityId: 'bhawarkuan',
    location: { lng: 75.8668, lat: 22.6883 },
    status: 'under_review',
    priority: 'urgent',
    daysAgo: 2,
    citizen: 'Shreya Deshmukh',
    department: 'Stormwater & Drainage Cell',
  },
  {
    id: 'cmp-024',
    ref: 'CLX-2026-0103',
    category: 'drainage',
    title: 'Silted nala near Khajrana',
    description:
      'The nala behind the colony is silted up and the banks are eroding. A short spell of rain is enough to flood the service lane.',
    address: 'Khajrana, behind the colony water tank',
    localityId: 'khajrana',
    location: { lng: 75.9078, lat: 22.7249 },
    status: 'resolved',
    priority: 'high',
    daysAgo: 15,
    citizen: 'Rahul Chouhan',
    department: 'Stormwater & Drainage Cell',
    resolutionNote: 'Nala desilted over 180 m and the eroded bank protected with rubble pitching.',
  },
]

export const SEEDED_COMPLAINTS: Complaint[] = SEEDS.map((seed) => {
  const createdAt = isoDaysAgo(seed.daysAgo)
  const timeline = buildTimeline(seed.status, createdAt, seed.department, seed.resolutionNote)
  const updatedAt = timeline[timeline.length - 1]?.at ?? createdAt
  const nearest = getNearestCell(seed.location.lng, seed.location.lat)
  return {
    id: seed.id,
    ref: seed.ref,
    category: seed.category,
    title: seed.title,
    description: seed.description,
    address: seed.address,
    localityId: seed.localityId,
    location: seed.location,
    status: seed.status,
    priority: seed.priority,
    createdAt,
    updatedAt,
    assignedDepartment: seed.department,
    citizenName: seed.citizen,
    linkedCellId: nearest.cell.id,
    timeline,
    resolutionNote: seed.resolutionNote,
    imageProvenance: undefined,
  }
})

export const DEMO_CITIZEN_NAME = 'Aarav Sharma'
