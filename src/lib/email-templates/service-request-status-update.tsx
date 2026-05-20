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

interface StatusUpdateProps {
  memberName?: string
  requestType?: string
  subject?: string
  status?: 'new' | 'in_progress' | 'resolved' | string
  requestId?: string
  adminNotes?: string
}

const STATUS_HEADLINE: Record<string, string> = {
  in_progress: 'Your request is now in progress',
  resolved: 'Your request has been resolved',
  new: 'Your request has been reopened',
}

const STATUS_BODY: Record<string, string> = {
  in_progress:
    'Our team has picked up your request and is actively working on it. We will be in touch shortly with next steps.',
  resolved:
    'Your request has been marked as resolved. If anything else comes up, simply reply to this email or submit a new request from your Family Office.',
  new: 'Your request has been reopened and is back in our queue.',
}

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <Section style={block}>
    <Text style={label_}>{label}</Text>
    <Text style={value_}>{value}</Text>
  </Section>
)

export const ServiceRequestStatusUpdateEmail = ({
  memberName,
  requestType,
  subject,
  status,
  requestId,
  adminNotes,
}: StatusUpdateProps) => {
  const headline =
    (status && STATUS_HEADLINE[status]) ?? 'Update on your request'
  const intro =
    (status && STATUS_BODY[status]) ??
    'There is an update on the request you submitted.'

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
            <Text style={text}>
              {memberName ? `Hi ${memberName}, ` : ''}
              {intro}
            </Text>

            {subject && <Row label="Subject" value={subject} />}
            {requestType && <Row label="Type" value={requestType} />}
            {status && (
              <Row
                label="Status"
                value={
                  status === 'in_progress'
                    ? 'In progress'
                    : status.charAt(0).toUpperCase() + status.slice(1)
                }
              />
            )}
            {adminNotes && <Row label="Note from our team" value={adminNotes} />}
            {requestId && <Row label="Reference" value={requestId} />}

            <Text style={footer}>
              Reply directly to this email to reach our team.
            </Text>
          </Section>
          <Text style={tagline}>A private bank in your pocket</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default ServiceRequestStatusUpdateEmail

export const template = {
  component: ServiceRequestStatusUpdateEmail,
  subject: (data: Record<string, any>) => {
    const subj = data?.subject ? `: ${data.subject}` : ''
    if (data?.status === 'resolved') return `Resolved${subj}`
    if (data?.status === 'in_progress') return `In progress${subj}`
    return `Update on your request${subj}`
  },
  displayName: 'Member → Service request status update',
  previewData: {
    memberName: 'Jane',
    requestType: 'meeting',
    subject: 'Schedule a family meeting',
    status: 'in_progress',
    requestId: '00000000-0000-0000-0000-000000000000',
    adminNotes: 'We will reach out within 24 hours to confirm a time.',
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
