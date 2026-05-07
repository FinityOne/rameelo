export interface GroupMember {
  name: string;
  initial: string;
  joinedAt: string;
  paid: boolean;
}

export interface GroupOrder {
  groupId: string;
  eventId: string;
  organizerFirstName: string;
  organizerLastName: string;
  organizerPhone: string;
  ticketType: "ga" | "vip";
  targetSize: number;
  discountPct: number;
  members: GroupMember[];
  createdAt: string;
  deadline: string;
}

export const GROUP_TIERS = [
  { min: 10, discount: 15, label: "10+ people" },
  { min: 8,  discount: 12, label: "8–9 people" },
  { min: 5,  discount: 10, label: "5–7 people" },
];

export function discountForTarget(target: number): number {
  for (const t of GROUP_TIERS) {
    if (target >= t.min) return t.discount;
  }
  return 0;
}

export function generateGroupId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "RM-";
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export function saveGroup(group: GroupOrder): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`rameelo_group_${group.groupId}`, JSON.stringify(group));
  // Keep an index so we can look up by event
  const index: string[] = JSON.parse(localStorage.getItem("rameelo_group_index") ?? "[]");
  if (!index.includes(group.groupId)) {
    index.push(group.groupId);
    localStorage.setItem("rameelo_group_index", JSON.stringify(index));
  }
}

export function loadGroup(groupId: string): GroupOrder | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`rameelo_group_${groupId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function addMemberToGroup(groupId: string, member: GroupMember): GroupOrder | null {
  const group = loadGroup(groupId);
  if (!group) return null;
  group.members.push(member);
  saveGroup(group);
  return group;
}
