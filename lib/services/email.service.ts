import { Resend } from 'resend'

// ============================================================================
// EMAIL SERVICE
// Handles sending emails via Resend API
// ============================================================================

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = 'Luniqo <noreply@luniqo.fr>'

/**
 * Send a portal invitation email to a guardian (parent)
 */
export async function sendGuardianInvitation(input: {
  to: string
  guardianFirstName: string
  guardianLastName: string
  nurseryName: string
  invitationUrl: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { to, guardianFirstName, guardianLastName, nurseryName, invitationUrl } = input

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `${nurseryName} vous invite sur le portail parents Luniqo`,
      html: buildInvitationHtml({
        guardianFirstName,
        guardianLastName,
        nurseryName,
        invitationUrl,
      }),
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Email send error:', err)
    return { success: false, error: 'Erreur lors de l\'envoi de l\'email' }
  }
}

/**
 * Build the invitation email HTML
 */
function buildInvitationHtml(input: {
  guardianFirstName: string
  guardianLastName: string
  nurseryName: string
  invitationUrl: string
}): string {
  const { guardianFirstName, guardianLastName, nurseryName, invitationUrl } = input

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f8fbfd; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fbfd;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #5a9dc9 0%, #2c5f7f 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                Luniqo
              </h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                Portail Parents
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; color: #1a1a1a; font-size: 20px; font-weight: 600;">
                Bonjour ${guardianFirstName} ${guardianLastName},
              </h2>

              <p style="margin: 0 0 24px; color: #4a4a4a; font-size: 15px; line-height: 1.6;">
                La creche <strong>${nurseryName}</strong> vous invite a rejoindre le portail parents Luniqo.
                Ce portail vous permet de suivre le quotidien de votre enfant, consulter les documents
                et communiquer avec l'equipe.
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 8px 0 32px;">
                    <a href="${invitationUrl}"
                       style="display: inline-block; background: linear-gradient(135deg, #5a9dc9 0%, #2c5f7f 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 12px;">
                      Creer mon compte
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 8px; color: #888888; font-size: 13px;">
                Ce lien est valable pendant <strong>7 jours</strong>.
                Si vous n'avez pas demande cet acces, ignorez cet email.
              </p>

              <p style="margin: 0; color: #888888; font-size: 13px;">
                Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :
              </p>
              <p style="margin: 8px 0 0; color: #5a9dc9; font-size: 12px; word-break: break-all;">
                ${invitationUrl}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fbfd; padding: 24px 40px; border-top: 1px solid #e8eef3;">
              <p style="margin: 0; color: #888888; font-size: 12px; text-align: center;">
                Luniqo - Gestion de creche intelligente
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}
