import * as React from 'react'
import { createAuthEmailHandler } from '@lovable.dev/email-js'
import { createFileRoute } from '@tanstack/react-router'
import { SignupEmail } from '@/lib/email-templates/signup'
import { InviteEmail } from '@/lib/email-templates/invite'
import { MagicLinkEmail } from '@/lib/email-templates/magic-link'
import { RecoveryEmail } from '@/lib/email-templates/recovery'
import { EmailChangeEmail } from '@/lib/email-templates/email-change'
import { ReauthenticationEmail } from '@/lib/email-templates/reauthentication'

// Configuration
const SITE_NAME = "Formlist"
const SENDER_DOMAIN = "notify.formlist.fr"
const ROOT_DOMAIN = "formlist.fr"
const FROM_DOMAIN = "notify.formlist.fr"
const SITE_URL = `https://${ROOT_DOMAIN}`

type AuthEmailHandlerConfig = Parameters<typeof createAuthEmailHandler>[0]

// The SDK handler owns verification, dispatch, and retry semantics; this file
// owns only the email decisions: subjects, templates, and per-type props.
const EMAIL_CONFIG: Omit<AuthEmailHandlerConfig, 'apiKey'> = {
  from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
  senderDomain: SENDER_DOMAIN,
  sendUrl: process.env['LOVABLE_SEND_URL'],
  emails: {
    signup: {
      subject: 'Confirmez votre adresse Formlist',
      render: (data) =>
        React.createElement(SignupEmail, {
          siteName: SITE_NAME,
          siteUrl: SITE_URL,
          recipient: data.email,
          confirmationUrl: data.url,
        }),
    },
    invite: {
      subject: 'Vous êtes invité à rejoindre Formlist',
      render: (data) =>
        React.createElement(InviteEmail, {
          siteName: SITE_NAME,
          siteUrl: SITE_URL,
          confirmationUrl: data.url,
        }),
    },
    magiclink: {
      subject: 'Votre lien de connexion Formlist',
      render: (data) =>
        React.createElement(MagicLinkEmail, {
          siteName: SITE_NAME,
          confirmationUrl: data.url,
        }),
    },
    recovery: {
      subject: 'Réinitialiser votre mot de passe Formlist',
      render: (data) =>
        React.createElement(RecoveryEmail, {
          siteName: SITE_NAME,
          confirmationUrl: data.url,
        }),
    },
    email_change: {
      subject: 'Confirmez votre nouvelle adresse Formlist',
      render: (data) =>
        React.createElement(EmailChangeEmail, {
          siteName: SITE_NAME,
          oldEmail: data.old_email ?? '',
          email: data.email,
          newEmail: data.new_email ?? '',
          confirmationUrl: data.url,
        }),
    },
    reauthentication: {
      subject: 'Votre code de vérification Formlist',
      render: (data) =>
        React.createElement(ReauthenticationEmail, { token: data.token ?? '' }),
    },
  },
}

let handler: ReturnType<typeof createAuthEmailHandler> | undefined

function getHandler(): ReturnType<typeof createAuthEmailHandler> | undefined {
  if (handler) return handler
  const apiKey = process.env['LOVABLE_API_KEY']
  if (!apiKey) {
    return undefined
  }
  handler = createAuthEmailHandler({ ...EMAIL_CONFIG, apiKey })
  return handler
}

export const Route = createFileRoute("/lovable/email/auth/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const h = getHandler()
          return await h(request)
        } catch {
          return Response.json(
            { error: 'Server configuration error' },
            { status: 500 }
          )
        }
      },
    },
  },
})
