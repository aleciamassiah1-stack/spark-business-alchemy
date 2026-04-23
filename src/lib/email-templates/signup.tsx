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
  BRAND,
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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Text style={wordmark}>
            <span style={wordmarkAccent}>Æ</span> {siteName}
          </Text>
          <Heading style={h1}>Confirm your private vault</Heading>
          <Text style={text}>
            Welcome to{' '}
            <Link href={siteUrl} style={link}>
              <strong>{siteName}</strong>
            </Link>
            . To activate the vault for{' '}
            <Link href={`mailto:${recipient}`} style={link}>
              {recipient}
            </Link>
            , confirm your email below.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Verify email
          </Button>
          <Text style={footer}>
            Didn't create an account? You can safely ignore this email — no
            vault will be opened.
          </Text>
        </Section>
        <Text style={tagline}>A private bank in your pocket</Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

// Re-export brand tokens for legacy imports.
export { BRAND }
