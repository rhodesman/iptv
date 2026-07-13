export interface AppConfig {
  vlcHost: string
  vlcPort: number
  vlcPassword: string
  appPort: number
  catalogPath: string
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    vlcHost: env.VLC_HOST || 'localhost',
    vlcPort: Number(env.VLC_PORT) || 8080,
    vlcPassword: env.VLC_PASSWORD ?? '',
    appPort: Number(env.APP_PORT) || 4000,
    catalogPath: env.CATALOG_PATH || 'app/catalog.json'
  }
}
