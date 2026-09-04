<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>New consultation inquiry from {{ $fullName }}</title>
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
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background: #eef3ee; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2d3748; }
    a { color: #3d7639; }
    .preheader { display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; overflow: hidden; mso-hide: all; }
    @media only screen and (max-width: 620px) {
      .wrapper { width: 100% !important; }
      .px { padding-left: 20px !important; padding-right: 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#eef3ee;">
  <div class="preheader">
    {{ $fullName }} sent a consultation request{{ $inquiryMessage !== '' ? ': '.Illuminate\Support\Str::limit($inquiryMessage, 80) : '' }}. Reply to this email to reach them.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef3ee;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" class="wrapper" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 18px rgba(45,74,41,0.10);">

          {{-- Header --}}
          <tr>
            <td style="background:#3d7639;padding:28px 32px;" class="px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <div style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.4px;line-height:1.3;">Kibondo Green Farm</div>
                    <div style="color:rgba(255,255,255,0.78);font-size:12px;margin-top:4px;">Hass avocados · Kibondo, Kigoma, Tanzania</div>
                  </td>
                  <td align="right" valign="top" style="padding-left:12px;">
                    <span style="display:inline-block;background:rgba(255,255,255,0.16);color:#ffffff;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;padding:6px 10px;border-radius:4px;">Consultation</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="height:4px;background:#c4a35a;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          {{-- Intro --}}
          <tr>
            <td class="px" style="padding:28px 32px 8px;">
              <div style="font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#3d7639;margin-bottom:8px;">New website inquiry</div>
              <div style="font-size:22px;font-weight:700;color:#1a2e18;line-height:1.3;margin-bottom:10px;">{{ $fullName }} wants to get in touch</div>
              <p style="margin:0;font-size:14px;line-height:1.7;color:#4a5568;">
                This request was submitted on the consultation form at
                <a href="https://kibondogreenfarm.co.tz/#consultation" style="color:#3d7639;font-weight:600;text-decoration:none;">kibondogreenfarm.co.tz</a>
                on {{ $receivedAt }}. Reply to this email or use the buttons below.
              </p>
            </td>
          </tr>

          {{-- Contact cards --}}
          <tr>
            <td class="px" style="padding:20px 32px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f9f6;border:1px solid #dce8dc;border-radius:10px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:0 0 14px;border-bottom:1px solid #e2ebe2;">
                          <div style="font-size:11px;color:#718096;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Visitor</div>
                          <div style="font-size:16px;font-weight:700;color:#1a2e18;">{{ $fullName }}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:14px 0;border-bottom:1px solid #e2ebe2;">
                          <div style="font-size:11px;color:#718096;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Email</div>
                          <a href="mailto:{{ $email }}" style="font-size:14px;font-weight:600;color:#3d7639;text-decoration:none;">{{ $email }}</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:14px 0 0;">
                          <div style="font-size:11px;color:#718096;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Phone</div>
                          <a href="tel:{{ preg_replace('/\s+/', '', $phone) }}" style="font-size:14px;font-weight:600;color:#3d7639;text-decoration:none;">{{ $phone }}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          {{-- Message --}}
          <tr>
            <td class="px" style="padding:16px 32px 8px;">
              <div style="font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#718096;margin-bottom:8px;">Message</div>
              @if ($inquiryMessage !== '')
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #dce8dc;border-left:4px solid #3d7639;border-radius:0 8px 8px 0;">
                  <tr>
                    <td style="padding:16px 18px;font-size:15px;line-height:1.7;color:#2d3748;white-space:pre-wrap;">{{ $inquiryMessage }}</td>
                  </tr>
                </table>
              @else
                <p style="margin:0;font-size:14px;color:#718096;font-style:italic;">No written message — they may prefer a phone call.</p>
              @endif
            </td>
          </tr>

          {{-- Actions --}}
          <tr>
            <td class="px" style="padding:24px 32px 8px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:6px;background:#3d7639;">
                    <a href="mailto:{{ $email }}?subject={{ rawurlencode('Re: your Kibondo Green Farm inquiry') }}" style="display:inline-block;padding:12px 20px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Reply by email</a>
                  </td>
                  <td width="12"></td>
                  <td style="border-radius:6px;background:#ffffff;border:1px solid #3d7639;">
                    <a href="tel:{{ preg_replace('/\s+/', '', $phone) }}" style="display:inline-block;padding:12px 20px;font-size:14px;font-weight:700;color:#3d7639;text-decoration:none;">Call {{ $phone }}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:12px 32px 28px;font-size:12px;line-height:1.6;color:#718096;">
              Hitting Reply in your mail app also works — this message is already set to reply to {{ $email }}.
            </td>
          </tr>

          {{-- Footer --}}
          <tr>
            <td class="px" style="border-top:1px solid #e2e8f0;padding:18px 32px 22px;background:#fafcfb;">
              <div style="font-size:12px;font-weight:600;color:#3d7639;margin-bottom:4px;">Kibondo Green Farm</div>
              <div style="font-size:11px;color:#a0aec0;line-height:1.6;">
                Kibondo town, Kigoma, Tanzania<br>
                Mon–Sat 10am–6pm · info@kibondogreenfarm.co.tz<br>
                Internal notification · Consultation &amp; visits form
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
