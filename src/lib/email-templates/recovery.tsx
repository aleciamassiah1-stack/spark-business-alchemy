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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your password for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Text style={wordmark}>
            <span style={wordmarkAccent}>Æ</span> {siteName}
          </Text>
          <Heading style={h1}>Reset your password</Heading>
          <Text style={text}>
            We received a request to reset the password protecting your
            {` ${siteName}`} vault. Choose a new one below.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Choose new password
          </Button>
          <Text style={footer}>
            Didn't request a reset? Your password will not be changed —
            you can safely ignore this email.
          </Text>
        </Section>
        <Text style={tagline}>A private bank in your pocket</Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
