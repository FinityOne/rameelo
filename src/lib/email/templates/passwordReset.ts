import { renderEmail, eyebrow, h1, lead, para, button } from "../layout";
import { EMAIL } from "../theme";

// Password reset email — sent when an admin resets a member's password.
export function passwordResetEmail({ firstName, resetUrl }: { firstName?: string | null; resetUrl: string }): {
  subject: string; html: string; text: string;
} {
  const name = (firstName ?? "").trim() || "there";
  const subject = "Reset your Rameelo password";

  const content = [
    eyebrow("Account security"),
    h1("Reset your password"),
    lead(`Hi ${name}, we received a request to reset the password for your Rameelo account.`),
    para("Click the button below to choose a new password. This link stays active for <strong>24 hours</strong>, so you can come back to it if you need to."),
    button(resetUrl, "Reset my password"),
    para("If you didn&rsquo;t request this, you can safely ignore this email &mdash; your password won&rsquo;t change until you create a new one."),
  ].join("");

  const html = renderEmail({
    preheader: "Choose a new password for your Rameelo account — this link expires in 1 hour.",
    contentHtml: content,
  });

  const text = [
    `Hi ${name},`,
    "",
    "We received a request to reset the password for your Rameelo account.",
    "",
    `Reset your password: ${resetUrl}`,
    "",
    "This link stays active for 24 hours. If you didn't request this, you can ignore this email.",
    "",
    `Questions? ${EMAIL.support}`,
  ].join("\n");

  return { subject, html, text };
}
