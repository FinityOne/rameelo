const BASE = "https://rameelo.com";

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function webPageSchema(opts: {
  name: string;
  url: string;
  description: string;
  breadcrumbs?: { name: string; url: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": opts.url,
    name: opts.name,
    url: opts.url,
    description: opts.description,
    isPartOf: { "@id": `${BASE}/#website` },
    ...(opts.breadcrumbs
      ? { breadcrumb: breadcrumbSchema(opts.breadcrumbs) }
      : {}),
  };
}

export function eventSchema(opts: {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  city: string;
  state: string;
  venueName: string;
  venueAddress?: string;
  organizer?: string;
  performerName?: string;
  imageUrl?: string;
  lowestPrice?: number;
  highestPrice?: number;
  currency?: string;
  status?: "EventScheduled" | "EventCancelled" | "EventPostponed";
  category?: string;
}) {
  const eventUrl = `${BASE}/events/${opts.id}`;
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": eventUrl,
    name: opts.name,
    description: opts.description,
    startDate: opts.startDate,
    ...(opts.endDate ? { endDate: opts.endDate } : {}),
    eventStatus: `https://schema.org/${opts.status ?? "EventScheduled"}`,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: opts.venueName,
      address: {
        "@type": "PostalAddress",
        streetAddress: opts.venueAddress ?? "",
        addressLocality: opts.city,
        addressRegion: opts.state,
        addressCountry: "US",
      },
    },
    ...(opts.organizer
      ? {
          organizer: {
            "@type": "Organization",
            name: opts.organizer,
            url: BASE,
          },
        }
      : {}),
    ...(opts.performerName
      ? {
          performer: {
            "@type": "PerformingGroup",
            name: opts.performerName,
          },
        }
      : {}),
    ...(opts.imageUrl ? { image: [opts.imageUrl] } : {}),
    offers: {
      "@type": "Offer",
      url: eventUrl,
      ...(opts.lowestPrice !== undefined
        ? { price: opts.lowestPrice, priceCurrency: opts.currency ?? "USD" }
        : { price: "0", priceCurrency: "USD" }),
      ...(opts.highestPrice !== undefined
        ? { highPrice: opts.highestPrice }
        : {}),
      availability: "https://schema.org/InStock",
      validFrom: new Date().toISOString(),
    },
  };
}

export function itemListSchema(
  name: string,
  items: { name: string; url: string; position?: number }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: item.position ?? i + 1,
      name: item.name,
      url: item.url,
    })),
  };
}

export function faqSchema(
  pairs: { question: string; answer: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: pairs.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
}

export function personSchema(opts: {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  sameAs?: string[];
  basedIn?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${BASE}/artists/${opts.slug}`,
    name: opts.name,
    url: `${BASE}/artists/${opts.slug}`,
    ...(opts.description ? { description: opts.description } : {}),
    ...(opts.imageUrl ? { image: opts.imageUrl } : {}),
    ...(opts.basedIn
      ? { homeLocation: { "@type": "Place", name: opts.basedIn } }
      : {}),
    ...(opts.sameAs?.length ? { sameAs: opts.sameAs } : {}),
  };
}

export function ld(schema: object) {
  return JSON.stringify(schema);
}
