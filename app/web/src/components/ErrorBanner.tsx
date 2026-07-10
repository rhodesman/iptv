const MESSAGES: Record<string, string> = {
  vlc_unreachable: "Can't reach VLC — is it running with the web interface enabled? See app/README.md.",
  vlc_auth: 'VLC rejected the password — check VLC_PASSWORD in your .env.',
  catalog_unavailable: 'Catalog is unavailable. Try `npm run app:catalog`.',
  load_failed: 'Failed to load the catalog.'
}

export function ErrorBanner({ code, onDismiss }: { code: string | null; onDismiss(): void }) {
  if (!code) return null
  return (
    <div className="banner" role="alert">
      {MESSAGES[code] || `Error: ${code}`}
      <button onClick={onDismiss} aria-label="Dismiss" style={{ marginLeft: 12 }}>✕</button>
    </div>
  )
}
