import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/unsubscribe')({
  head: () => ({
    meta: [
      { title: 'Unsubscribe — Æther Wealth' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: UnsubscribePage,
})

type State =
  | { kind: 'loading' }
  | { kind: 'valid' }
  | { kind: 'already' }
  | { kind: 'invalid' }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'error'; message: string }

function UnsubscribePage() {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('token')
    setToken(t)

    if (!t) {
      setState({ kind: 'invalid' })
      return
    }

    fetch(`/email/unsubscribe?token=${encodeURIComponent(t)}`)
      .then(async (r) => {
        const json = await r.json().catch(() => ({}))
        if (!r.ok) {
          setState({ kind: 'invalid' })
          return
        }
        if (json.valid === false && json.reason === 'already_unsubscribed') {
          setState({ kind: 'already' })
          return
        }
        if (json.valid) {
          setState({ kind: 'valid' })
          return
        }
        setState({ kind: 'invalid' })
      })
      .catch(() => setState({ kind: 'invalid' }))
  }, [])

  async function confirm() {
    if (!token) return
    setState({ kind: 'submitting' })
    try {
      const r = await fetch('/email/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const json = await r.json().catch(() => ({}))
      if (!r.ok) {
        setState({ kind: 'error', message: json?.error || 'Could not unsubscribe.' })
        return
      }
      if (json.success === false && json.reason === 'already_unsubscribed') {
        setState({ kind: 'already' })
        return
      }
      setState({ kind: 'success' })
    } catch {
      setState({ kind: 'error', message: 'Network error. Please try again.' })
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-card p-8 text-center">
        <p className="font-serif text-2xl text-foreground">
          <span className="text-primary">Æ</span> Æther Wealth
        </p>
        <h1 className="mt-4 font-serif text-xl text-foreground">
          Email preferences
        </h1>

        {state.kind === 'loading' && (
          <p className="mt-4 text-sm text-muted-foreground">Checking link…</p>
        )}

        {state.kind === 'valid' && (
          <>
            <p className="mt-4 text-sm text-muted-foreground">
              Click below to unsubscribe from app emails. You'll still receive
              essential account messages (security, billing, password resets).
            </p>
            <button
              type="button"
              onClick={confirm}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Confirm unsubscribe
            </button>
          </>
        )}

        {state.kind === 'submitting' && (
          <p className="mt-4 text-sm text-muted-foreground">Processing…</p>
        )}

        {state.kind === 'success' && (
          <p className="mt-4 text-sm text-foreground">
            You've been unsubscribed. We're sorry to see you go.
          </p>
        )}

        {state.kind === 'already' && (
          <p className="mt-4 text-sm text-foreground">
            You're already unsubscribed. No further action needed.
          </p>
        )}

        {state.kind === 'invalid' && (
          <p className="mt-4 text-sm text-muted-foreground">
            This unsubscribe link is invalid or has expired. If you'd like to
            stop receiving emails, please contact{' '}
            <a className="text-primary underline" href="mailto:team@aetherwealth.co">
              team@aetherwealth.co
            </a>
            .
          </p>
        )}

        {state.kind === 'error' && (
          <p className="mt-4 text-sm text-destructive">{state.message}</p>
        )}
      </div>
    </main>
  )
}
