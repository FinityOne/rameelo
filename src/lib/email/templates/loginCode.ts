import { renderEmail, eyebrow, h1, lead, para, divider } from "../layout";
import { EMAIL, C, FONT_HEAD, FONT_BODY } from "../theme";

// One-time 6-digit code for passwordless sign-in / sign-up. Big, copy-friendly code
// block; clear 30-minute expiry; security reassurance.
export function loginCodeEmail(p: {
  code: string;
  purpose: "login" | "signup";
  firstName?: string | null;
  minutes?: number;
}): { subject: string; html: string; text: string } {
  const minutes = p.minutes ?? 30;
  const first = (p.firstName ?? "").trim().split(" ")[0];
  const isSignup = p.purpose === "signup";
  const subject = `${p.code} is your Rameelo ${isSignup ? "sign-up" : "sign-in"} code`;

  // Spaced code for readability in the big display (e.g. 1 2 3 4 5 6).
  const spaced = p.code.split("").join(" ");

  const codeBlock = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 6px;">
    <tr><td align="center">
      <div style="display:inline-block;background:${C.ivory};border:1px solid ${C.ivory200};border-radius:16px;padding:18px 30px;">
        <p style="margin:0;font-family:${FONT_HEAD};font-size:38px;font-weight:800;letter-spacing:10px;color:${C.ink};">${spaced}</p>
      </div>
    </td></tr>
  </table>`;

  const note = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 6px;background:${C.marigold}14;border:1px solid ${C.marigold}40;border-radius:14px;">
    <tr><td style="padding:12px 16px;">
      <p style="margin:0;font-family:${FONT_BODY};font-size:13px;line-height:1.6;color:${C.inkMuted};">
        This code expires in <strong>${minutes} minutes</strong>. If you didn&rsquo;t request it, you can safely ignore this email — your account stays secure.
      </p>
    </td></tr>
  </table>`;

  const content = [
    eyebrow(isSignup ? "Confirm your account" : "Sign in to Rameelo"),
    h1(isSignup ? "Welcome — confirm it&rsquo;s you" : "Here&rsquo;s your sign-in code"),
    lead(`${first ? `Hi ${first}, e` : "E"}nter this 6-digit code to ${isSignup ? "finish creating your account" : "sign in"}.`),
    codeBlock,
    note,
    para("No passwords to remember — we email you a fresh code each time you sign in."),
    divider(),
  ].join("");

  const html = renderEmail({
    preheader: `Your Rameelo code is ${p.code} (expires in ${minutes} minutes).`,
    contentHtml: content,
  });

  const text = [
    isSignup ? "Confirm your Rameelo account" : "Sign in to Rameelo",
    "",
    `Your 6-digit code is: ${p.code}`,
    "",
    `It expires in ${minutes} minutes. If you didn't request it, ignore this email.`,
    "",
    `Questions? ${EMAIL.support}`,
  ].join("\n");

  return { subject, html, text };
}
