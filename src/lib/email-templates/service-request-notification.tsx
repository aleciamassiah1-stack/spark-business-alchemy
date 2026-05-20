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

interface ServiceRequestProps {
  requestType?: string
  subject?: string
  fromName?: string
  fromEmail?: string
  body?: string
  requestId?: string
  pageUrl?: string
  adminUrl?: string
}

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <Section style={block}>
    <Text style={label_}>{label}</Text>
    <Text style={value_}>{value}</Text>
  </Section>
)

export const ServiceRequestNotificationEmail = ({
  requestType,
  subject,
  fromName,
  fromEmail,
  body,
  requestId,
  pageUrl,
  adminUrl,
}: ServiceRequestProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New {requestType ?? 'service'} request{fromName ? ` from ${fromName}` : ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Text style={wordmark}>
            <span style={wordmarkAccent}>Æ</span> Æther Wealth · Admin
          </Text>
          <Heading style={h1}>New {requestType ?? 'service'} request</Heading>
          <Text style={text}>
            A member just submitted a request. Open the admin inbox to assign and respond.
          </Text>

          {requestType && <Row label="Type" value={requestType} />}
          {subject && <Row label="Subject" value={subject} />}
          {fromName && <Row label="From" value={fromName} />}
          {fromEmail && <Row label="Reply to" value={fromEmail} />}
          {body && <Row label="Details" value={body} />}
          {requestId && <Row label="Request ID" value={requestId} />}
          {pageUrl && <Row label="Submitted from" value={pageUrl} />}
          {adminUrl && <Row label="Open in admin" value={adminUrl} />}

          <Text style={footer}>
            Reply directly to this email to reach the member, or open the admin inbox to update status.
          </Text>
        </Section>
        <Text style={tagline}>A private bank in your pocket</Text>
      </Container>
    </Body>
  </Html>
)

export default ServiceRequestNotificationEmail

export const template = {
  component: ServiceRequestNotificationEmail,
  subject: (data: Record<string, any>) => {
    const type = data?.requestType ?? 'service'
    const who = data?.fromName ? ` from ${data.fromName}` : ''
    return `New ${type} request${who}`
  },
  displayName: 'Admin → Service request notification',
  to: 'team@aetherwealth.co',
  previewData: {
    requestType: 'meeting',
    subject: 'Schedule a portfolio review',
    fromName: 'Jane Member',
    fromEmail: 'jane@example.com',
    body: 'Would like to review allocation before EOY.',
    requestId: '00000000-0000-0000-0000-000000000000',
    pageUrl: 'https://aetherwealth.co/family-office',
    adminUrl: 'https://aetherwealth.co/admin/requests',
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
