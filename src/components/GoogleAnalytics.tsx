import GoogleAnalyticsRouteTracker from "./GoogleAnalyticsRouteTracker";

// Google Analytics 4 (gtag.js), installed the least-invasive way: the library
// loads from Google's CDN with `async` so it never blocks first paint, and the
// tiny inline init runs immediately. The `config` call fires the initial
// page_view (with full traffic-source, referrer, and geo attribution); the
// client route tracker sends a page_view on each App Router navigation, since
// the SPA changes pages without a full reload. Mounted once in the root layout.
// Measurement ID is env-overridable but defaults to the live property so it
// works out of the box in production.
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-N2LBD36G7S";

export default function GoogleAnalytics() {
  if (!GA_ID) return null;
  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`,
        }}
      />
      <GoogleAnalyticsRouteTracker />
    </>
  );
}
