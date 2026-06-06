import { renderEmail, eyebrow, h1, lead, para, button, divider, actionCard, sectionTitle, spacer } from "../layout";
import { EMAIL } from "../theme";

// Warm welcome email — draws the member to log in, explore Garba 2026 events,
// buy tickets, and start their Garba Passport.
export function welcomeEmail({ firstName }: { firstName?: string | null }): { subject: string; html: string; text: string } {
  const name = (firstName ?? "").trim() || "friend";
  const s = EMAIL.site;
  const subject = `Welcome to Rameelo, ${(firstName ?? "").trim() || "Garba lover"}! 🪔`;

  const content = [
    eyebrow("Jai Shree Krishna 🙏"),
    h1(`Welcome to Rameelo, ${name}!`),
    lead("We&rsquo;re so glad you&rsquo;re here. Rameelo is the home for Raas Garba &amp; Navratri across America &mdash; one place to discover every event, grab your tickets, and celebrate the season with your community."),
    para("Log in to your account to get started &mdash; your next unforgettable Garba night is just a tap away."),
    spacer(6),
    button(`${s}/auth/signin`, "Log in to Rameelo"),
    divider(),
    sectionTitle("Here&rsquo;s what&rsquo;s waiting for you"),
    actionCard("🪩", "Find your next Garba", "Explore the biggest Garba &amp; Navratri 2026 nights happening near you.", `${s}/events`, "Explore 2026 events"),
    actionCard("🎟️", "Grab your tickets", "Secure your spot in seconds &mdash; with group discounts when you go with friends.", `${s}/events`, "Buy tickets"),
    actionCard("🛂", "Start your Garba Passport", "Collect a stamp for every Garba you attend &mdash; even past ones! Build your story, one night at a time.", `${s}/portal/my-card`, "Open your passport"),
    divider(),
    para("See you on the dance floor. <strong style=\"color:#241C26;\">Garbe ki raat, Rameelo ke saath!</strong> 💃"),
  ].join("");

  const html = renderEmail({
    preheader: "Your next Garba starts here — log in, explore 2026 events, and start your Garba Passport.",
    contentHtml: content,
  });

  const text = [
    `Welcome to Rameelo, ${name}!`,
    "",
    "We're so glad you're here. Rameelo is the home for Raas Garba & Navratri across America — one place to discover every event, grab your tickets, and celebrate the season.",
    "",
    `Log in: ${s}/auth/signin`,
    `Explore 2026 events: ${s}/events`,
    `Buy tickets: ${s}/events`,
    `Start your Garba Passport: ${s}/portal/my-card`,
    "",
    "See you on the dance floor. Garbe ki raat, Rameelo ke saath!",
    "",
    `Questions? ${EMAIL.support}`,
  ].join("\n");

  return { subject, html, text };
}
