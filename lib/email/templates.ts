const BRAND_COLOR = '#2563EB'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://hub.leadsolution.de'

/**
 * Wraps email content in a full HTML email layout with LeadSolution branding.
 */
export function emailLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="de" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>LeadSolution</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body { margin: 0; padding: 0; background-color: #f4f4f5; -webkit-font-smoothing: antialiased; }
    table { border-spacing: 0; }
    td { padding: 0; }
    img { border: 0; display: block; }
    .email-body { background-color: #f4f4f5; width: 100%; }
    .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; }
    .email-header { background-color: ${BRAND_COLOR}; padding: 24px 32px; }
    .email-header-text { color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 22px; font-weight: 700; margin: 0; }
    .email-content { padding: 32px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; }
    .email-footer { padding: 24px 32px; text-align: center; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #71717a; border-top: 1px solid #e4e4e7; }
    .email-footer a { color: ${BRAND_COLOR}; text-decoration: none; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; border-radius: 0 !important; }
      .email-content { padding: 24px 20px !important; }
      .email-header { padding: 20px !important; }
    }
  </style>
</head>
<body>
  <table role="presentation" class="email-body" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0">
          <!-- Header -->
          <tr>
            <td class="email-header">
              <p class="email-header-text">LeadSolution</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td class="email-content">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td class="email-footer">
              <p style="margin: 0;">LeadSolution &mdash; <a href="${APP_URL}">hub.leadsolution.de</a></p>
              <p style="margin: 8px 0 0 0;">Diese E-Mail wurde automatisch versendet. Bitte nicht direkt antworten.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * Returns a styled CTA button for use inside email templates.
 */
export function emailButton(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
  <tr>
    <td align="center" style="border-radius: 6px; background-color: ${BRAND_COLOR};">
      <a href="${url}" target="_blank"
         style="display: inline-block; padding: 14px 28px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px; background-color: ${BRAND_COLOR};">
        ${text}
      </a>
    </td>
  </tr>
</table>`
}
