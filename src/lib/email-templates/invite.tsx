import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
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
  link,
  main,
  tagline,
  text,
  wordmark,
  wordmarkAccent,
} from './_brand'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to join {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Text style={wordmark}>
            <span style={wordmarkAccent}>Æ</span> {siteName}
          </Text>
          <Heading style={h1}>You've been invited</Heading>
          <Text style={text}>
            You've been invited to join{' '}
            <Link href={siteUrl} style={link}>
              <strong>{siteName}</strong>
            </Link>
            — a private wealth platform built for principals, advisors and
            family offices. Accept your invitation to open your vault.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Accept invitation
          </Button>
          <Text style={footer}>
            Weren't expecting this? You can safely ignore this email.
          </Text>
        </Section>
        <Text style={tagline}>A private bank in your pocket</Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
