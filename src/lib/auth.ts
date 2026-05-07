export interface RameeloUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  avatarInitials: string;
  avatarColor: string;
  joinedAt: string;
  ticketsCount: number;
  eventsAttended: number;
}

const AVATAR_COLORS = ["#7C1F2C", "#0E8C7A", "#2E1B30", "#D4891B", "#5a1e7a", "#892240", "#1a4a5e"];

export function getUser(): RameeloUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("rameelo_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveUser(user: RameeloUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("rameelo_user", JSON.stringify(user));
}

export function signOut(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("rameelo_user");
}

export function createUser(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city?: string;
  state?: string;
}): RameeloUser {
  const initials = (data.firstName[0] + data.lastName[0]).toUpperCase();
  const colorIndex = data.firstName.charCodeAt(0) % AVATAR_COLORS.length;
  return {
    id: "u-" + Math.random().toString(36).slice(2, 10),
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    city: data.city ?? "",
    state: data.state ?? "",
    avatarInitials: initials,
    avatarColor: AVATAR_COLORS[colorIndex],
    joinedAt: new Date().toISOString(),
    ticketsCount: 3,
    eventsAttended: 1,
  };
}

// Fake seeded tickets for portal demo
export type IndividualTicketStatus = "available" | "pending_transfer" | "transferred";

export interface IndividualTicket {
  ticketId: string;       // e.g. "RM-FP2X8K-T1"
  orderId: string;
  seat: number;           // 1-based index
  status: IndividualTicketStatus;
  assignedTo?: string;    // name if transferred/pending
  assignedEmail?: string;
  transferredAt?: string;
}

export interface PortalTicket {
  orderId: string;
  eventTitle: string;
  artist: string;
  date: string;
  dateISO: string;
  time: string;
  venue: string;
  city: string;
  state: string;
  qty: number;
  ticketType: string;
  unitPrice: number;
  grandTotal: number;
  purchasedAt: string;
  category: string;
  artistColor: string;
  groupId?: string;
  tickets: IndividualTicket[];
}

function makeTickets(orderId: string, qty: number): IndividualTicket[] {
  return Array.from({ length: qty }, (_, i) => ({
    ticketId: `${orderId}-T${i + 1}`,
    orderId,
    seat: i + 1,
    status: "available" as IndividualTicketStatus,
  }));
}

export const SEEDED_TICKETS: PortalTicket[] = [
  {
    orderId: "RM-FP2X8K",
    eventTitle: "Falguni Pathak Live — Edison Navratri",
    artist: "Falguni Pathak",
    date: "Oct 02, 2026",
    dateISO: "2026-10-02",
    time: "7:30 PM",
    venue: "NJ Convention & Exposition Center",
    city: "Edison",
    state: "NJ",
    qty: 2,
    ticketType: "GA",
    unitPrice: 95,
    grandTotal: 199,
    purchasedAt: "2026-05-01T14:32:00.000Z",
    category: "Garba",
    artistColor: "#7C1F2C",
    tickets: makeTickets("RM-FP2X8K", 2),
  },
  {
    orderId: "RM-KD9T4R",
    eventTitle: "Kinjal Dave — Chicago Navratri Nite",
    artist: "Kinjal Dave",
    date: "Oct 06, 2026",
    dateISO: "2026-10-06",
    time: "7:00 PM",
    venue: "Rosemont Convention Center",
    city: "Chicago",
    state: "IL",
    qty: 4,
    ticketType: "GA",
    unitPrice: 65,
    grandTotal: 272,
    purchasedAt: "2026-05-03T09:15:00.000Z",
    category: "Dandiya",
    artistColor: "#F5A623",
    groupId: "RM-GROUP01",
    tickets: makeTickets("RM-KD9T4R", 4),
  },
  {
    orderId: "RM-GR3M7P",
    eventTitle: "Geeta Rabari — NYC Navratri Utsav",
    artist: "Geeta Rabari",
    date: "Oct 08, 2026",
    dateISO: "2026-10-08",
    time: "8:00 PM",
    venue: "Pier 36",
    city: "New York",
    state: "NY",
    qty: 1,
    ticketType: "VIP",
    unitPrice: 145,
    grandTotal: 152,
    purchasedAt: "2026-05-04T18:50:00.000Z",
    category: "Garba",
    artistColor: "#0E8C7A",
    tickets: makeTickets("RM-GR3M7P", 1),
  },
];
