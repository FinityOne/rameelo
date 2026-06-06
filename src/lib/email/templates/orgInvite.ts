import { renderEmail, eyebrow, h1, lead, para, button, divider } from "../layout";
import { EMAIL, C } from "../theme";

// Team invitation email — invites someone to an organization, with a link that
// creates their account (or logs them in) and grants organizer-portal access.
export function orgInviteEmail({ orgName, role, inviterName, acceptUrl }: {
  orgName: string; role: string; inviterName: string; acceptUrl: string;
}): { subject: string; html: string; text: string } {
  const roleLine = role === "Scanner"
    ? "You&rsquo;ll be able to scan tickets at the door."
    : "You&rsquo;ll be able to manage events, orders, and the team.";

  const subject = `You're invited to ${orgName} on Rameelo`;

  const content = [
    eyebrow("Team invitation"),
    h1(`Join ${orgName} on Rameelo`),
    lead(`<strong>${inviterName}</strong> invited you to <strong>${orgName}</strong> as a <strong style="color:${C.marigoldDark};">${role}</strong>. ${roleLine}`),
    para("Accept your invitation to create your account (or log in) — you&rsquo;ll get access to the organizer portal automatically."),
    button(acceptUrl, "Accept invitation"),
    divider(),
    para(`Just sign up with this email address and you&rsquo;ll be added to ${orgName} right away. If you weren&rsquo;t expecting this, you can safely ignore this email.`),
  ].join("");

  const html = renderEmail({
    preheader: `${inviterName} invited you to join ${orgName} on Rameelo.`,
    contentHtml: content,
  });

  const text = [
    `${inviterName} invited you to join ${orgName} on Rameelo as a ${role}.`,
    "",
    `Accept your invitation: ${acceptUrl}`,
    "",
    "Sign up with this email address and you'll be added automatically, with access to the organizer portal.",
    "",
    `Questions? ${EMAIL.support}`,
  ].join("\n");

  return { subject, html, text };
}
