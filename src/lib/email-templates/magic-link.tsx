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

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your secure login link for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Text style={wordmark}>
            <span style={wordmarkAccent}>Æ</span> {siteName}
          </Text>
          <Heading style={h1}>Your private login link</Heading>
          <Text style={text}>
            Tap below to open your vault on this device. For your security,
            this link expires shortly and works only once.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Open my vault
          </Button>
          <Text style={footer}>
            Didn't request this? Ignore this email — nothing will happen.
          </Text>
        </Section>
        <Text style={tagline}>A private bank in your pocket</Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
