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

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email change for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Text style={wordmark}>
            <span style={wordmarkAccent}>Æ</span> {siteName}
          </Text>
          <Heading style={h1}>Confirm your email change</Heading>
          <Text style={text}>
            You requested to move the email on your {siteName} vault from{' '}
            <Link href={`mailto:${email}`} style={link}>
              {email}
            </Link>{' '}
            to{' '}
            <Link href={`mailto:${newEmail}`} style={link}>
              {newEmail}
            </Link>
            . Confirm below to complete the change.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Confirm email change
          </Button>
          <Text style={footer}>
            Didn't request this? Secure your account immediately at
            support@aetherwealth.co.
          </Text>
        </Section>
        <Text style={tagline}>A private bank in your pocket</Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail
