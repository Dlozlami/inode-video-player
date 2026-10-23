export function formatDuration(seconds) {
  if (!seconds) return null
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function filterMedia(mediaFiles, tagsData, activeFilters, durationFilter, tagCountFilter, playCountFilter) {
  let files = mediaFiles

  if (activeFilters.length) {
    files = files.filter(f => {
      const entry = tagsData[f.inode]
      if (!entry) return false
      return activeFilters.every(af => (entry.tags || []).includes(af))
    })
  }

  const minSec = durationFilter?.min ? parseInt(durationFilter.min) * 60 : null
  const maxSec = durationFilter?.max ? parseInt(durationFilter.max) * 60 : null
  if (minSec !== null || maxSec !== null) {
    files = files.filter(f => {
      const dur = tagsData[f.inode]?.auto?.duration
      if (!dur) return false
      if (minSec !== null && dur < minSec) return false
      if (maxSec !== null && dur > maxSec) return false
      return true
    })
  }

  const minTags = tagCountFilter?.min !== '' && tagCountFilter?.min != null ? parseInt(tagCountFilter.min) : null
  const maxTags = tagCountFilter?.max !== '' && tagCountFilter?.max != null ? parseInt(tagCountFilter.max) : null
  if (minTags !== null || maxTags !== null) {
    files = files.filter(f => {
      const count = (tagsData[f.inode]?.tags || []).length
      if (minTags !== null && count < minTags) return false
      if (maxTags !== null && count > maxTags) return false
      return true
    })
  }

  const minPlays = playCountFilter?.min !== '' && playCountFilter?.min != null ? parseInt(playCountFilter.min) : null
  const maxPlays = playCountFilter?.max !== '' && playCountFilter?.max != null ? parseInt(playCountFilter.max) : null
  if (minPlays !== null || maxPlays !== null) {
    files = files.filter(f => {
      const plays = tagsData[f.inode]?.playCount || 0
      if (minPlays !== null && plays < minPlays) return false
      if (maxPlays !== null && plays > maxPlays) return false
      return true
    })
  }

  return files
}

export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
