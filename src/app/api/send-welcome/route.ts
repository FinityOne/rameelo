import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const { firstName, email } = await request.json();

  if (!email || !firstName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const html = welcomeEmail(firstName);

  const { error } = await resend.emails.send({
    from: "Rameelo <welcome@rameelo.com>",
    to: email,
    subject: `Welcome to Rameelo, ${firstName}! 🌟`,
    html,
  });

  if (error) {
    console.error("Resend error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

function welcomeEmail(firstName: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Rameelo</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#1a0e1c;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a0e1c;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#2E1B30;border-radius:16px;padding:16px 28px;border:1px solid rgba(255,255,255,0.08);">
                    <span style="font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#ffffff;">
                      ra<span style="color:#F5A623;">●</span>meelo
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero card -->
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#2E1B30 0%,#3d1f3f 50%,#2E1B30 100%);border-radius:24px;overflow:hidden;border:1px solid rgba(245,166,35,0.2);">
                <!-- Gold top bar -->
                <tr>
                  <td style="background-color:#F5A623;height:4px;"></td>
                </tr>

                <tr>
                  <td style="padding:40px 40px 32px;">
                    <!-- Greeting -->
                    <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:#F5A623;">Welcome to the family</p>
                    <h1 style="margin:0 0 16px;font-size:32px;font-weight:900;color:#ffffff;line-height:1.15;">
                      Namaste, ${firstName}! 🙏
                    </h1>
                    <p style="margin:0 0 28px;font-size:15px;color:rgba(255,255,255,0.65);line-height:1.65;">
                      You've just joined the largest Raas Garba community in America. From intimate dandiya nights to grand Navratri celebrations — every event, every beat, every memory is here.
                    </p>

                    <!-- CTA button -->
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background-color:#F5A623;border-radius:14px;">
                          <a href="https://rameelo.com/events" style="display:block;padding:14px 32px;font-size:15px;font-weight:700;color:#2E1B30;text-decoration:none;letter-spacing:0.3px;">
                            Browse Events →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Feature grid -->
                <tr>
                  <td style="padding:0 40px 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%" style="padding-right:8px;padding-bottom:12px;vertical-align:top;">
                          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,255,255,0.05);border-radius:14px;border:1px solid rgba(255,255,255,0.08);">
                            <tr><td style="padding:18px;">
                              <p style="margin:0 0 6px;font-size:20px;">🥁</p>
                              <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#ffffff;">Events Near You</p>
                              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.45);line-height:1.5;">Find garba & dandiya nights in your city</p>
                            </td></tr>
                          </table>
                        </td>
                        <td width="50%" style="padding-left:8px;padding-bottom:12px;vertical-align:top;">
                          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,255,255,0.05);border-radius:14px;border:1px solid rgba(255,255,255,0.08);">
                            <tr><td style="padding:18px;">
                              <p style="margin:0 0 6px;font-size:20px;">🎟️</p>
                              <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#ffffff;">Easy Ticketing</p>
                              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.45);line-height:1.5;">Buy tickets in seconds, access them anywhere</p>
                            </td></tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding-right:8px;vertical-align:top;">
                          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,255,255,0.05);border-radius:14px;border:1px solid rgba(255,255,255,0.08);">
                            <tr><td style="padding:18px;">
                              <p style="margin:0 0 6px;font-size:20px;">👥</p>
                              <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#ffffff;">Group Orders</p>
                              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.45);line-height:1.5;">Buy tickets together, go as a group</p>
                            </td></tr>
                          </table>
                        </td>
                        <td width="50%" style="padding-left:8px;vertical-align:top;">
                          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,255,255,0.05);border-radius:14px;border:1px solid rgba(255,255,255,0.08);">
                            <tr><td style="padding:18px;">
                              <p style="margin:0 0 6px;font-size:20px;">🌙</p>
                              <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#ffffff;">Navratri Season</p>
                              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.45);line-height:1.5;">Never miss the biggest nights of the year</p>
                            </td></tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:32px;" align="center">
              <p style="margin:0 0 12px;font-size:12px;color:rgba(255,255,255,0.3);line-height:1.6;">
                You're receiving this because you just created a Rameelo account.<br/>
                Questions? Reply to this email or reach us at <a href="mailto:support@rameelo.com" style="color:#F5A623;text-decoration:none;">support@rameelo.com</a>
              </p>
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.18);">
                © 2026 Rameelo · The home of Raas Garba in America
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
