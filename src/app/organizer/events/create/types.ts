export type EventCategory = 'garba' | 'dandiya' | 'raas' | 'workshop' | 'community' | 'other';
export type DressCode = 'none' | 'encouraged' | 'required';
export type DandiyaSticks = 'provided' | 'byod' | 'not_applicable';
export type AgeRestriction = 'all' | '13+' | '18+' | '21+';
export type ParkingOption = 'free' | 'paid_nearby' | 'street' | 'valet' | 'limited' | 'none';

export type TicketTier = {
  tempId: string;
  name: string;
  description: string;
  price: string;
  quantity: string;
  saleStartDate: string;
  saleEndDate: string;
  groupDiscountEnabled: boolean;
  groupDiscountMode: 'simple' | 'scaling';
  groupDiscountMinQty: string;
  groupDiscountType: 'percentage' | 'fixed';
  groupDiscountValue: string;
};

export type EventFormData = {
  // Step 1
  title: string;
  category: EventCategory;
  orgId: string;         // uuid from organizations table (optional)
  artist: string;        // display name (free-text fallback)
  artistId: string;      // uuid from artists table (preferred)
  description: string;
  navratriNights: number[];

  // Step 2
  isMultiDay: boolean;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  doorsOpenTime: string;

  // Step 3
  venueName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  parking: ParkingOption;
  parkingNotes: string;
  websiteUrl: string;

  // Step 4
  coverImageUrl: string;
  coverGradient: string;
  dressCode: DressCode;
  dressCodeDetails: string;
  dandiyaSticks: DandiyaSticks;
  ageRestriction: AgeRestriction;

  // Step 5
  capacity: string;
  ticketTiers: TicketTier[];
};

export const EMPTY_TIER = (): TicketTier => ({
  tempId: Math.random().toString(36).slice(2),
  name: '',
  description: '',
  price: '',
  quantity: '',
  saleStartDate: '',
  saleEndDate: '',
  groupDiscountEnabled: false,
  groupDiscountMode: 'simple',
  groupDiscountMinQty: '',
  groupDiscountType: 'percentage',
  groupDiscountValue: '',
});

export const DEFAULT_FORM: EventFormData = {
  title: '', category: 'garba', orgId: '', artist: '', artistId: '', description: '', navratriNights: [],
  isMultiDay: false, startDate: '', endDate: '', startTime: '', endTime: '', doorsOpenTime: '',
  venueName: '', addressLine1: '', addressLine2: '', city: '', state: '', zip: '',
  parking: 'none', parkingNotes: '', websiteUrl: '',
  coverImageUrl: '', coverGradient: 'aubergine',
  dressCode: 'none', dressCodeDetails: '', dandiyaSticks: 'not_applicable', ageRestriction: 'all',
  capacity: '', ticketTiers: [EMPTY_TIER()],
};

export const GRADIENTS = [
  {
    id: 'aubergine',
    name: 'Atlantic Night',
    label: 'Northeast',
    states: ['NY','NJ','CT','MA','PA','RI','VT','NH','ME','DE','MD','DC'],
    css: 'linear-gradient(135deg, #0F1F3D 0%, #1E3A7A 45%, #2C1B4A 100%)',
    preview: 'from-[#0F1F3D] via-[#1E3A7A] to-[#2C1B4A]',
  },
  {
    id: 'peacock',
    name: 'Great Lakes',
    label: 'Midwest',
    states: ['IL','OH','MI','IN','WI','MN','IA','MO','KS','NE','SD','ND'],
    css: 'linear-gradient(135deg, #0A3D35 0%, #0E7A6A 50%, #1A5C2E 100%)',
    preview: 'from-[#0A3D35] via-[#0E7A6A] to-[#1A5C2E]',
  },
  {
    id: 'durga',
    name: 'Peach Atlanta',
    label: 'Southeast',
    states: ['FL','GA','NC','SC','VA','TN','AL','WV','KY'],
    css: 'linear-gradient(135deg, #8B2500 0%, #CC4A20 45%, #F0845A 100%)',
    preview: 'from-[#8B2500] via-[#CC4A20] to-[#F0845A]',
  },
  {
    id: 'south',
    name: 'Gulf Night',
    label: 'South',
    states: ['TX','OK','NM','LA','AR','MS'],
    css: 'linear-gradient(135deg, #1A0635 0%, #4A1060 45%, #8B2050 100%)',
    preview: 'from-[#1A0635] via-[#4A1060] to-[#8B2050]',
  },
  {
    id: 'marigold',
    name: 'Golden Coast',
    label: 'West',
    states: ['CA','OR','WA','NV','UT','CO','ID','MT','WY','AK','HI'],
    css: 'linear-gradient(135deg, #B8720A 0%, #F5C030 45%, #E87A08 100%)',
    preview: 'from-[#B8720A] via-[#F5C030] to-[#E87A08]',
  },
  {
    id: 'desert',
    name: 'Desert Terracotta',
    label: 'Southwest',
    states: ['AZ'],
    css: 'linear-gradient(135deg, #6B2210 0%, #B84A22 42%, #E07840 100%)',
    preview: 'from-[#6B2210] via-[#B84A22] to-[#E07840]',
  },
];

export const GRADIENT_BY_STATE: Record<string, string> = Object.fromEntries(
  GRADIENTS.flatMap(g => g.states.map(s => [s, g.id]))
);
