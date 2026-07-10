import { loadConfig } from '../../../app/server/config'

describe('loadConfig', () => {
  it('applies defaults when env is empty', () => {
    const cfg = loadConfig({})
    expect(cfg).toEqual({
      vlcHost: 'localhost',
      vlcPort: 8080,
      vlcPassword: '',
      appPort: 4000,
      catalogPath: 'app/catalog.json'
    })
  })

  it('reads values from env', () => {
    const cfg = loadConfig({
      VLC_HOST: 'vlc.local',
      VLC_PORT: '9090',
      VLC_PASSWORD: 'secret',
      APP_PORT: '5000',
      CATALOG_PATH: '/tmp/c.json'
    })
    expect(cfg).toEqual({
      vlcHost: 'vlc.local',
      vlcPort: 9090,
      vlcPassword: 'secret',
      appPort: 5000,
      catalogPath: '/tmp/c.json'
    })
  })
})
