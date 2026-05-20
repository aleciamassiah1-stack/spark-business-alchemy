import type { ComponentType } from 'react'
import { template as conciergeMessage } from './concierge-message'
import { template as serviceRequestNotification } from './service-request-notification'
import { template as serviceRequestStatusUpdate } from './service-request-status-update'
import { template as householdInvite } from './household-invite'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'concierge-message': conciergeMessage,
  'service-request-notification': serviceRequestNotification,
  'service-request-status-update': serviceRequestStatusUpdate,
  'household-invite': householdInvite,
}
