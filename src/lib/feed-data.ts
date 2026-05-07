export type FeedItemType = "photo" | "purchase" | "join" | "group" | "checkin" | "milestone";

export interface FeedItem {
  id: string;
  type: FeedItemType;
  user: string;
  userInitials: string;
  userColor: string;
  city: string;
  time: string;
  event?: string;
  eventId?: string;
  artistColor?: string;
  qty?: number;
  groupSize?: number;
  photoCount?: number;
  caption?: string;
  likes: number;
  comments: number;
  liked?: boolean;
}

const COLORS = ["#7C1F2C","#0E8C7A","#2E1B30","#D4891B","#5a1e7a","#892240","#1a4a5e","#3D2543"];

export const FEED_ITEMS: FeedItem[] = [
  {
    id:"f1", type:"photo", user:"Priya Patel", userInitials:"PP", userColor:COLORS[0],
    city:"Edison, NJ", time:"2m ago",
    event:"Falguni Pathak Live — Edison Navratri", eventId:"fp-01", artistColor:"#7C1F2C",
    photoCount:4,
    caption:"Night 1 of Edison Navratri and I already can't feel my legs 🥁❤️ Falguni ma brought down the HOUSE. See you all night 2!",
    likes:84, comments:12,
  },
  {
    id:"f2", type:"purchase", user:"Rohan Shah", userInitials:"RS", userColor:COLORS[1],
    city:"Chicago, IL", time:"5m ago",
    event:"Kinjal Dave — Chicago Navratri Nite", eventId:"kd-02",
    qty:6,
    likes:3, comments:0,
  },
  {
    id:"f3", type:"join", user:"Divya Mehta", userInitials:"DM", userColor:COLORS[2],
    city:"Atlanta, GA", time:"8m ago",
    likes:7, comments:2,
  },
  {
    id:"f4", type:"group", user:"Kavya Nair", userInitials:"KN", userColor:COLORS[3],
    city:"Houston, TX", time:"14m ago",
    event:"Geeta Rabari — Houston Navratri", eventId:"gr-04",
    groupSize:10,
    likes:21, comments:5,
  },
  {
    id:"f5", type:"photo", user:"Arjun Desai", userInitials:"AD", userColor:COLORS[4],
    city:"New York, NY", time:"22m ago",
    event:"Falguni Pathak — NYC Navratri Nights", eventId:"fp-03", artistColor:"#7C1F2C",
    photoCount:7,
    caption:"NYC Navratri hits different every year. Pier 36 was absolutely electric. 7 years in a row for our family — this is HOME 🏡",
    likes:143, comments:28,
  },
  {
    id:"f6", type:"checkin", user:"Meera Shah", userInitials:"MS", userColor:COLORS[5],
    city:"Dallas, TX", time:"31m ago",
    event:"Atul Purohit — Dallas Navratri Mela", eventId:"ap-04",
    likes:18, comments:4,
  },
  {
    id:"f7", type:"purchase", user:"Sanjay Bhatt", userInitials:"SB", userColor:COLORS[6],
    city:"San Jose, CA", time:"45m ago",
    event:"Falguni Pathak — Bay Area Navratri", eventId:"fp-04",
    qty:2,
    likes:2, comments:0,
  },
  {
    id:"f8", type:"photo", user:"Rekha Patel", userInitials:"RP", userColor:COLORS[7],
    city:"Fremont, CA", time:"1h ago",
    event:"Kinjal Dave — Bay Area Garba Night", eventId:"kd-09", artistColor:"#F5A623",
    photoCount:11,
    caption:"My chaniya choli has been waiting all year for this moment ✨ Cannot believe how beautiful the hall looked. Thank you Kinjal Dave for an unforgettable night 💛",
    likes:209, comments:41,
  },
  {
    id:"f9", type:"milestone", user:"Rameelo", userInitials:"R", userColor:"#F5A623",
    city:"Nationwide", time:"2h ago",
    likes:512, comments:74,
  },
  {
    id:"f10", type:"group", user:"Pooja Trivedi", userInitials:"PT", userColor:COLORS[0],
    city:"Boston, MA", time:"2h ago",
    event:"Hemant Chauhan — Boston Navratri", eventId:"hc-07",
    groupSize:8,
    likes:34, comments:8,
  },
  {
    id:"f11", type:"photo", user:"Neil Joshi", userInitials:"NJ", userColor:COLORS[1],
    city:"Edison, NJ", time:"3h ago",
    event:"Falguni Pathak Live — Edison Navratri", eventId:"fp-01", artistColor:"#7C1F2C",
    photoCount:3,
    caption:"Brought my 70-year-old nani to her first Navratri in America. She cried when Falguni started singing. Some moments you never forget 🙏",
    likes:892, comments:167,
  },
  {
    id:"f12", type:"join", user:"Tara Modi", userInitials:"TM", userColor:COLORS[2],
    city:"Phoenix, AZ", time:"4h ago",
    likes:9, comments:1,
  },
  {
    id:"f13", type:"purchase", user:"Karan Vora", userInitials:"KV", userColor:COLORS[3],
    city:"Seattle, WA", time:"5h ago",
    event:"Sachin-Jigar — Seattle Navratri Fusion", eventId:"sj-07",
    qty:4,
    likes:1, comments:0,
  },
  {
    id:"f14", type:"photo", user:"Asha Bhatt", userInitials:"AB", userColor:COLORS[4],
    city:"Chicago, IL", time:"6h ago",
    event:"Kinjal Dave — Chicago Navratri Nite", eventId:"kd-02", artistColor:"#F5A623",
    photoCount:9,
    caption:"Chicago crew showing UP! 5 generations of our family dancing together tonight. Navratri is more than an event — it's who we are 🌙",
    likes:444, comments:89,
  },
];

export const STORIES = [
  { name: "Edison Live", initials: "🔴", color: "#7C1F2C", isLive: true },
  { name: "Priya P.", initials: "PP", color: "#0E8C7A", isLive: false },
  { name: "Rohan S.", initials: "RS", color: "#D4891B", isLive: false },
  { name: "Meera D.", initials: "MD", color: "#5a1e7a", isLive: false },
  { name: "Chicago", initials: "🔴", color: "#2E1B30", isLive: true },
  { name: "Kavya N.", initials: "KN", color: "#892240", isLive: false },
  { name: "Neil J.", initials: "NJ", color: "#1a4a5e", isLive: false },
  { name: "NYC Live", initials: "🔴", color: "#7C1F2C", isLive: true },
];
