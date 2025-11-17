export interface LandlordService {
  id: string;
  slug: string;
  title: string;
  description: string;
  priceRange: string;
  priceFrom: number;
  image: string;
  duration: string;
}

export const landlordServices: LandlordService[] = [
  {
    id: 'svc-001',
    slug: 'gas-safety',
    title: 'Gas Safety Certificate (Annual)',
    description:
      'Ensure every gas appliance is inspected and certified so that your tenancy stays compliant with UK legislation.',
    priceRange: '£70–£120',
    priceFrom: 70,
    image: '/images/landlord-gas-safety.svg',
    duration: '45–60 mins on site',
  },
  {
    id: 'svc-002',
    slug: 'eicr',
    title: 'Electrical Installation Condition Report',
    description:
      'Full EICR completed by NICEIC-approved engineers covering fixed wiring, sockets and distribution boards.',
    priceRange: '£150–£250',
    priceFrom: 150,
    image: '/images/landlord-eicr.svg',
    duration: '1.5–3 hrs on site',
  },
  {
    id: 'svc-003',
    slug: 'pat-testing',
    title: 'Portable Appliance Testing',
    description:
      'PAT testing for white goods and supplied appliances with a digital inventory and reminder schedule.',
    priceRange: '£60–£110',
    priceFrom: 60,
    image: '/images/landlord-pat.svg',
    duration: '60 mins for 10 items',
  },
  {
    id: 'svc-004',
    slug: 'epc',
    title: 'Energy Performance Certificate',
    description:
      'Produce or renew your EPC with accredited assessors and receive upgrade recommendations for your property.',
    priceRange: '£65–£95',
    priceFrom: 65,
    image: '/images/landlord-epc.svg',
    duration: '45 mins per dwelling',
  },
  {
    id: 'svc-005',
    slug: 'boiler-service',
    title: 'Boiler Service & Maintenance',
    description:
      'Annual boiler service including flue analysis, system pressure checks and digital service record.',
    priceRange: '£80–£160',
    priceFrom: 80,
    image: '/images/landlord-boiler.svg',
    duration: '60–90 mins on site',
  },
  {
    id: 'svc-006',
    slug: 'legionella',
    title: 'Legionella Risk Assessment',
    description:
      'Survey and risk assessment for legionella with remedial recommendations and photographic evidence.',
    priceRange: '£120–£200',
    priceFrom: 120,
    image: '/images/landlord-legionella.svg',
    duration: '60 mins on site',
  },
];

export function findLandlordService(slug?: string | null) {
  if (!slug) return undefined;
  return landlordServices.find((service) => service.slug === slug);
}
