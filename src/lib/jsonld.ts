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
  city: string | null;
  state: string | null;
  venueName?: string | null;
  venueAddress?: string | null;
  organizer?: string;
  performerName?: string;
  performerSlug?: string;
  imageUrl?: string;
  lowestPrice?: number;
  highestPrice?: number;
  currency?: string;
  status?: "EventScheduled" | "EventCancelled" | "EventPostponed";
  category?: string;
  keywords?: string[];
}) {
  const eventUrl = `${BASE}/events/${opts.id}`;
  const city = opts.city ?? "USA";
  const state = opts.state ?? "US";
  const categoryLabel = opts.category
    ? opts.category.charAt(0).toUpperCase() + opts.category.slice(1)
    : "Garba";

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
    // Google Event Rich Results require location
    location: {
      "@type": "Place",
      name: opts.venueName ?? `${categoryLabel} Event — ${city}, ${state}`,
      address: {
        "@type": "PostalAddress",
        ...(opts.venueAddress ? { streetAddress: opts.venueAddress } : {}),
        addressLocality: city,
        addressRegion: state,
        addressCountry: "US",
      },
    },
    organizer: {
      "@type": "Organization",
      name: opts.organizer ?? "Rameelo",
      url: BASE,
    },
    ...(opts.performerName
      ? {
          performer: {
            "@type": "PerformingGroup",
            name: opts.performerName,
            ...(opts.performerSlug
              ? { url: `${BASE}/artists/${opts.performerSlug}`, "@id": `${BASE}/artists/${opts.performerSlug}` }
              : {}),
          },
        }
      : {}),
    ...(opts.imageUrl ? { image: [opts.imageUrl] } : {}),
    ...(opts.keywords?.length ? { keywords: opts.keywords.join(", ") } : {}),
    offers: {
      "@type": "AggregateOffer",
      url: eventUrl,
      priceCurrency: opts.currency ?? "USD",
      ...(opts.lowestPrice !== undefined ? { lowPrice: opts.lowestPrice } : { lowPrice: 0 }),
      ...(opts.highestPrice !== undefined ? { highPrice: opts.highestPrice } : {}),
      offerCount: 1,
      availability: "https://schema.org/InStock",
      validFrom: new Date().toISOString(),
      seller: { "@type": "Organization", name: "Rameelo", url: BASE },
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
  genres?: string[];
}) {
  const artistUrl = `${BASE}/artists/${opts.slug}`;
  // Use @graph to emit both a Person and a PerformingGroup node — covers both
  // Google's Event performer expectations and general knowledge graph
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${artistUrl}#person`,
        name: opts.name,
        url: artistUrl,
        ...(opts.description ? { description: opts.description } : {}),
        ...(opts.imageUrl ? { image: opts.imageUrl } : {}),
        ...(opts.basedIn ? { homeLocation: { "@type": "Place", name: opts.basedIn } } : {}),
        ...(opts.sameAs?.length ? { sameAs: opts.sameAs } : {}),
        ...(opts.genres?.length ? { knowsAbout: opts.genres } : {}),
      },
      {
        "@type": "PerformingGroup",
        "@id": `${artistUrl}#group`,
        name: opts.name,
        url: artistUrl,
        ...(opts.description ? { description: opts.description } : {}),
        ...(opts.imageUrl ? { image: opts.imageUrl } : {}),
        ...(opts.basedIn ? { location: { "@type": "Place", name: opts.basedIn } } : {}),
        ...(opts.sameAs?.length ? { sameAs: opts.sameAs } : {}),
        ...(opts.genres?.length ? { genre: opts.genres.join(", ") } : {}),
        member: { "@type": "Person", "@id": `${artistUrl}#person` },
      },
    ],
  };
}

export function ld(schema: object) {
  return JSON.stringify(schema);
}
