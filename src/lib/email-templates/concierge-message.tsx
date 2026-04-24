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

interface ConciergeMessageProps {
  fromEmail?: string
  fromName?: string
  message?: string
  conversation?: string
  pageUrl?: string
}

const MessageBlock: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <Section style={block}>
    <Text style={label_}>{label}</Text>
    <Text style={value_}>{value}</Text>
  </Section>
)

export const ConciergeMessageEmail = ({
  fromEmail,
  fromName,
  message,
  conversation,
  pageUrl,
}: ConciergeMessageProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New concierge message{fromName ? ` from ${fromName}` : ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Text style={wordmark}>
            <span style={wordmarkAccent}>Æ</span> Æther Wealth · Concierge
          </Text>
          <Heading style={h1}>New message for the team</Heading>
          <Text style={text}>
            A member just sent a message from the in-app concierge.
          </Text>

          {fromName && <MessageBlock label="From" value={fromName} />}
          {fromEmail && <MessageBlock label="Reply to" value={fromEmail} />}
          {message && <MessageBlock label="Message" value={message} />}
          {conversation && (
            <MessageBlock label="Recent chat transcript" value={conversation} />
          )}
          {pageUrl && <MessageBlock label="Page" value={pageUrl} />}

          <Text style={footer}>
            Reply directly to this email — the member's address is in the
            "Reply to" field above.
          </Text>
        </Section>
        <Text style={tagline}>A private bank in your pocket</Text>
      </Container>
    </Body>
  </Html>
)

export default ConciergeMessageEmail

export const template = {
  component: ConciergeMessageEmail,
  subject: (data: Record<string, any>) =>
    data?.fromName
      ? `Concierge message from ${data.fromName}`
      : 'New concierge message',
  displayName: 'Concierge → Team message',
  to: 'team@aetherwealth.co',
  previewData: {
    fromName: 'Jane Member',
    fromEmail: 'jane@example.com',
    message: 'Could someone help me link my brokerage account? Plaid keeps timing out.',
    conversation:
      'You: Could someone help me link my brokerage account?\nConcierge: Open Connections → Add account…',
    pageUrl: 'https://aetherwealth.co/support',
  },
} satisfies TemplateEntry

const block = {
  borderTop: '1px solid #2a2640',
  padding: '14px 0 0',
  margin: '14px 0 0',
}
const label_ = {
  fontFamily: 'Inter, sans-serif',
  fontSize: '10px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.16em',
  color: '#8682a8',
  margin: '0 0 6px',
}
const value_ = {
  fontSize: '14px',
  color: '#f4f2ff',
  lineHeight: '1.55',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
}
