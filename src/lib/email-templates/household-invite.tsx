import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import {
  button,
  card,
  container,
  footer,
  h1,
  main,
  tagline,
  text,
  wordmark,
  wordmarkAccent,
} from './_brand'
import type { TemplateEntry } from './registry'

interface HouseholdInviteProps {
  inviterName?: string
  profileName?: string
  hasAccount?: boolean
  actionUrl?: string
}

export const HouseholdInviteEmail = ({
  inviterName,
  profileName,
  hasAccount,
  actionUrl,
}: HouseholdInviteProps) => {
  const inviter = inviterName || 'A family member'
  const profile = profileName || 'their household'
  const headline = hasAccount
    ? `You now have access to ${profile}`
    : `${inviter} invited you to Æther Wealth`
  const intro = hasAccount
    ? `${inviter} just granted you member access to "${profile}" in their Æther Wealth Family Office. Sign in to see the consolidated view.`
    : `${inviter} would like to share access to "${profile}" with you on Æther Wealth — a private wealth platform for principals and families. Create your account with this email address to accept.`
  const cta = hasAccount ? 'Open Æther Wealth' : 'Create your account'

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{headline}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={card}>
            <Text style={wordmark}>
              <span style={wordmarkAccent}>Æ</span> Æther Wealth · Family Office
            </Text>
            <Heading style={h1}>{headline}</Heading>
            <Text style={text}>{intro}</Text>
            {actionUrl && (
              <Button style={button} href={actionUrl}>
                {cta}
              </Button>
            )}
            <Text style={footer}>
              Weren't expecting this? You can safely ignore this email — no
              access is granted until you sign in.
            </Text>
          </Section>
          <Text style={tagline}>A private bank in your pocket</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default HouseholdInviteEmail

export const template = {
  component: HouseholdInviteEmail,
  subject: (data: Record<string, any>) =>
    data?.hasAccount
      ? `You now have access to ${data?.profileName ?? 'a household'}`
      : `${data?.inviterName ?? 'A family member'} invited you to Æther Wealth`,
  displayName: 'Household → Invite / access granted',
  previewData: {
    inviterName: 'Eleanor Whitfield',
    profileName: 'Charlotte Whitfield',
    hasAccount: false,
    actionUrl: 'https://aetherwealth.co/signup',
  },
} satisfies TemplateEntry
