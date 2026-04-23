// Æther Wealth — shared brand styles for auth email templates.
// Email body background must be white; brand the inner card with violet accents.
export const BRAND = {
  siteName: 'Æther Wealth',
  primary: '#7c5cff',
  primaryDark: '#4f3acc',
  bg: '#ffffff',
  cardBg: '#0f0f18',
  cardBorder: '#2a2640',
  textOnDark: '#f4f2ff',
  mutedOnDark: '#a8a3c4',
  accent: '#c9a84c',
} as const

export const main = {
  backgroundColor: BRAND.bg,
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Arial, sans-serif',
  margin: '0',
  padding: '0',
}

export const container = {
  maxWidth: '480px',
  margin: '0 auto',
  padding: '32px 16px',
}

export const card = {
  backgroundColor: BRAND.cardBg,
  border: `1px solid ${BRAND.cardBorder}`,
  borderRadius: '16px',
  padding: '36px 32px',
  textAlign: 'left' as const,
}

export const wordmark = {
  fontFamily: '"Cormorant Garamond", Georgia, serif',
  fontSize: '22px',
  fontWeight: 600,
  color: BRAND.textOnDark,
  letterSpacing: '0.02em',
  margin: '0 0 28px',
}

export const wordmarkAccent = {
  color: BRAND.primary,
}

export const h1 = {
  fontFamily: '"Cormorant Garamond", Georgia, serif',
  fontSize: '28px',
  fontWeight: 600,
  color: BRAND.textOnDark,
  margin: '0 0 16px',
  lineHeight: '1.2',
}

export const text = {
  fontSize: '14px',
  color: BRAND.mutedOnDark,
  lineHeight: '1.6',
  margin: '0 0 20px',
}

export const button = {
  backgroundColor: BRAND.primary,
  backgroundImage: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 100%)`,
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600,
  borderRadius: '999px',
  padding: '13px 26px',
  textDecoration: 'none',
  display: 'inline-block',
  letterSpacing: '0.01em',
}

export const link = {
  color: BRAND.primary,
  textDecoration: 'underline',
}

export const footer = {
  fontSize: '11px',
  color: '#6b6789',
  margin: '28px 0 0',
  lineHeight: '1.5',
}

export const tagline = {
  fontFamily: 'Inter, sans-serif',
  fontSize: '10px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.18em',
  color: '#8682a8',
  margin: '24px 0 0',
  textAlign: 'center' as const,
}
