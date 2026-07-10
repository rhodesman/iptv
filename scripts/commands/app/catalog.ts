import { Collection } from '@freearhey/core'
import { Storage } from '@freearhey/storage-js'
import { loadData, data as apiData } from '../../api'
import { PlaylistParser } from '../../core'
import { Stream } from '../../models'
import { STREAMS_DIR } from '../../constants'
import {
  Catalog,
  ChannelEntry,
  CountryFacet,
  Facet,
  StreamEntry,
  countryCodeToFlag
} from '../../../app/shared/catalog'
import * as fs from 'fs-extra'
import path from 'node:path'

export async function buildCatalog(): Promise<Catalog> {
  await loadData()

  const storage = new Storage(STREAMS_DIR)
  const parser = new PlaylistParser({ storage })
  const files = await storage.list('**/*.m3u')
  const streams = await parser.parse(files)

  // group streams by channel id; drop streams with no channel metadata
  const groups = new Map<string, Stream[]>()
  streams.forEach((stream: Stream) => {
    const channel = stream.getChannel()
    if (!channel) return
    const list = groups.get(channel.id) || []
    list.push(stream)
    groups.set(channel.id, list)
  })

  const channels: ChannelEntry[] = []
  for (const [channelId, group] of groups) {
    const channel = group[0].getChannel()!
    const sorted = group.sort(
      (a, b) => b.getVerticalResolution() - a.getVerticalResolution()
    )

    const languages = new Set<string>()
    let logo: string | null = null
    const entryStreams: StreamEntry[] = sorted.map((s: Stream) => {
      s.getLanguages().forEach((l: { code: string }) => languages.add(l.code))
      if (!logo) {
        const url = s.getTvgLogo()
        if (url) logo = url
      }
      return {
        url: s.url,
        quality: s.quality || null,
        label: s.label || null,
        userAgent: s.user_agent || null,
        referrer: s.referrer || null
      }
    })

    channels.push({
      id: channelId,
      name: channel.name,
      logo,
      categories: channel.categories || [],
      country: channel.country || null,
      languages: [...languages],
      isNsfw: channel.is_nsfw === true,
      streams: entryStreams
    })
  }

  channels.sort((a, b) => a.name.localeCompare(b.name))

  return {
    generatedAt: new Date().toISOString(),
    filters: buildFilters(channels),
    channels
  }
}

function buildFilters(channels: ChannelEntry[]): Catalog['filters'] {
  const catCount = new Map<string, number>()
  const countryCount = new Map<string, number>()
  const langCount = new Map<string, number>()

  for (const ch of channels) {
    for (const c of ch.categories) catCount.set(c, (catCount.get(c) || 0) + 1)
    if (ch.country) countryCount.set(ch.country, (countryCount.get(ch.country) || 0) + 1)
    for (const l of ch.languages) langCount.set(l, (langCount.get(l) || 0) + 1)
  }

  const categories: Facet[] = [...catCount].map(([id, count]) => ({
    id,
    name: apiData.categoriesKeyById.get(id)?.name || id,
    count
  }))

  const countries: CountryFacet[] = [...countryCount].map(([code, count]) => ({
    id: code,
    name: apiData.countriesKeyByCode.get(code)?.name || code,
    flag: countryCodeToFlag(code),
    count
  }))

  const languages: Facet[] = [...langCount].map(([code, count]) => ({
    id: code,
    name: apiData.languagesKeyByCode.get(code)?.name || code,
    count
  }))

  const byCountThenName = (a: Facet, b: Facet) =>
    b.count - a.count || a.name.localeCompare(b.name)

  return {
    categories: categories.sort(byCountThenName),
    countries: countries.sort(byCountThenName) as CountryFacet[],
    languages: languages.sort(byCountThenName)
  }
}

export async function writeCatalog(filepath: string, catalog: Catalog): Promise<void> {
  await fs.ensureDir(path.dirname(filepath))
  await fs.writeJson(filepath, catalog)
}
