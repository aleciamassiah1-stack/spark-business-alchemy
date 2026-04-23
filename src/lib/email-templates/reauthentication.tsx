import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import {
  BRAND,
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

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Æther Wealth verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Text style={wordmark}>
            <span style={wordmarkAccent}>Æ</span> Æther Wealth
          </Text>
          <Heading style={h1}>Confirm your identity</Heading>
          <Text style={text}>Use the verification code below to continue:</Text>
          <Text style={codeStyle}>{token}</Text>
          <Text style={footer}>
            This code expires shortly. If you didn't request it, ignore this
            email — your account remains secure.
          </Text>
        </Section>
        <Text style={tagline}>A private bank in your pocket</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const codeStyle = {
  fontFamily: '"JetBrains Mono", Courier, monospace',
  fontSize: '28px',
  fontWeight: 700 as const,
  color: BRAND.accent,
  letterSpacing: '0.3em',
  margin: '0 0 28px',
  padding: '14px 18px',
  border: `1px solid ${BRAND.cardBorder}`,
  borderRadius: '10px',
  textAlign: 'center' as const,
}
