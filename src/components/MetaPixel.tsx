import { META_PIXEL_ID } from "@/lib/meta-pixel";
import MetaPixelRouteTracker from "./MetaPixelRouteTracker";

// Site-wide Meta Pixel base code. Rendered as a raw inline <script> (like the
// site's JSON-LD) so it lands in the initial HTML and runs as early as possible
// — initializing the pixel and firing the first PageView. The client-side
// route tracker re-fires PageView on App Router navigations (which don't reload
// the page). Mounted once in the root layout to cover every page.
export default function MetaPixel() {
  const base = `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');`;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: base }} />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
      <MetaPixelRouteTracker />
    </>
  );
}
