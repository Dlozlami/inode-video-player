import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVault } from '../store/VaultContext'
import { filterMedia, shuffle, formatDuration } from '../lib/media'
import styles from './Library.module.css'

export default function Library() {
  const navigate = useNavigate()
  const {
    folderPath,    setFolderPath,
    mediaFiles,    setMediaFiles,
    tagsData,      setTagsData,
    activeFilters, setActiveFilters, toggleFilter,
    playlist,      setPlaylist,
    currentIndex,  setCurrentIndex,
    shuffled,      setShuffled,
    pausedAt,      setPausedAt,
    vaultTags = [],
  } = useVault()

  const [loading,         setLoading]         = useState(false)
  const [tagSearch,       setTagSearch]       = useState('')
  const [durationFilter,  setDurationFilter]  = useState({ min: '', max: '' })
  const [tagCountFilter,  setTagCountFilter]  = useState({ min: '', max: '' })
  const [mediaTypeFilter, setMediaTypeFilter] = useState('all')

  // ── Load folder ──
  const loadFolder = useCallback(async (path) => {
    setLoading(true)
    setFolderPath(path)
    const files = await window.vault.readDir(path)
    const tags  = await window.vault.readTags(path)
    setMediaFiles(files)
    setTagsData(tags)

    // Restore last played from tags.json
    const last = tags.__lastPlayed__
    if (last && last.playlist && last.playlist.length > 0) {
      setPlaylist(last.playlist)
      setCurrentIndex(last.index || 0)
      setPausedAt(last)
    } else {
      setPlaylist(files.map(f => f.inode))
      setCurrentIndex(0)
      setPausedAt(null)
    }

    setLoading(false)
  }, [])

  // ── Restore last folder on boot ──
  useEffect(() => {
    const saved = localStorage.getItem('vault_last_folder')
    if (saved) loadFolder(saved)
  }, [])

  // ── Save last folder ──
  useEffect(() => {
    if (folderPath) localStorage.setItem('vault_last_folder', folderPath)
  }, [folderPath])

  // ── Resume paused ──
  const resumePaused = useCallback(() => {
    if (!pausedAt) return
    navigate(`/player/${pausedAt.inode}`)
  }, [pausedAt])

  // ── Spacebar ──
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return
      if (e.code === 'Space' && pausedAt) {
        e.preventDefault()
        resumePaused()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pausedAt, resumePaused])

  const openFolder = async () => {
    const path = await window.vault.openFolder()
    if (!path) return
    loadFolder(path)
  }

  const filteredFiles = useCallback(() => {
    let files = filterMedia(mediaFiles, tagsData, activeFilters, durationFilter, tagCountFilter)
    if (mediaTypeFilter === 'video') {
      files = files.filter(f => f.mediaType === 'video' || f.mediaType === 'gif')
    } else if (mediaTypeFilter === 'images') {
      files = files.filter(f => f.mediaType === 'image')
    }
    return files
  }, [mediaFiles, tagsData, activeFilters, durationFilter, tagCountFilter, mediaTypeFilter])

  const playAll = () => {
    const files = filteredFiles()
    if (!files.length) return
    let list = files.map(f => f.inode)
    if (shuffled) list = shuffle(list)
    setPlaylist(list)
    setCurrentIndex(0)
    navigate(`/player/${list[0]}`)
  }

  const playFrom = (inode) => {
    const files = filteredFiles()
    let list = files.map(f => f.inode)
    if (shuffled) list = shuffle(list)
    const idx = list.indexOf(inode)
    setPlaylist(list)
    setCurrentIndex(idx >= 0 ? idx : 0)
    navigate(`/player/${inode}`)
  }

  const displayedFilterTags = tagSearch
    ? vaultTags.filter(t => t.toLowerCase().includes(tagSearch.toLowerCase()))
    : vaultTags

  const files     = filteredFiles()
  const lastInode = pausedAt?.inode || playlist[currentIndex]

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <button className={styles.folderBtn} onClick={openFolder}>
            <FolderIcon /> Open Folder
          </button>
          {folderPath && (
            <span className={styles.folderPath}>{folderPath.split('/').slice(-2).join('/')}</span>
          )}
          {pausedAt && (
            <button className={styles.resumeBtn} onClick={resumePaused}>▶ Resume</button>
          )}
        </div>

        <div className={styles.section}>
          <div className={styles.sectionLabel}>Filter by tag</div>
          <input
            className={styles.searchInput}
            placeholder="search tags..."
            value={tagSearch}
            onChange={e => setTagSearch(e.target.value)}
          />
          <div className={styles.filterList}>
            {displayedFilterTags.map(tag => (
              <button
                key={tag}
                className={`${styles.filterTag} ${activeFilters.includes(tag) ? styles.active : ''}`}
                onClick={() => toggleFilter(tag)}
              >
                <span className={styles.filterDot} />
                {tag}
                {activeFilters.includes(tag) && <span className={styles.filterX}>×</span>}
              </button>
            ))}
          </div>
          {activeFilters.length > 0 && (
            <button className={styles.clearBtn} onClick={() => setActiveFilters([])}>clear filters</button>
          )}
        </div>

        <div className={styles.section}>
          <div className={styles.sectionLabel}>Tag count</div>
          <div className={styles.durRow}>
            <input type="number" placeholder="min" value={tagCountFilter.min}
              onChange={e => setTagCountFilter(p => ({ ...p, min: e.target.value }))}
              className={styles.durInput} />
            <span className={styles.durSep}>–</span>
            <input type="number" placeholder="max" value={tagCountFilter.max}
              onChange={e => setTagCountFilter(p => ({ ...p, max: e.target.value }))}
              className={styles.durInput} />
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionLabel}>Duration (min)</div>
          <div className={styles.durRow}>
            <input type="number" placeholder="min" value={durationFilter.min}
              onChange={e => setDurationFilter(p => ({ ...p, min: e.target.value }))}
              className={styles.durInput} />
            <span className={styles.durSep}>–</span>
            <input type="number" placeholder="max" value={durationFilter.max}
              onChange={e => setDurationFilter(p => ({ ...p, max: e.target.value }))}
              className={styles.durInput} />
          </div>
        </div>

        <div className={styles.sidebarBottom}>
          <button
            className={`${styles.sbBtn} ${shuffled ? styles.on : ''}`}
            onClick={() => setShuffled(s => !s)}
          >
            <ShuffleIcon /> {shuffled ? 'Shuffle ON' : 'Shuffle'}
          </button>
          <button className={styles.sbBtn} onClick={() => navigate('/settings')}>
            <SettingsIcon /> Settings
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        {!folderPath ? (
          <div className={styles.empty}>
            <FolderIcon size={40} dim />
            <p>Open a folder to get started</p>
            <p className={styles.emptyHint}>Press Space to resume last session</p>
          </div>
        ) : loading ? (
          <div className={styles.empty}><p>Loading...</p></div>
        ) : (
          <>
            <div className={styles.toolbar}>
              <span className={styles.count}>{files.length} files</span>
              <div className={styles.typeToggle}>
                {['all', 'video', 'images'].map(opt => (
                  <button
                    key={opt}
                    className={`${styles.typeBtn} ${mediaTypeFilter === opt ? styles.typeBtnActive : ''}`}
                    onClick={() => setMediaTypeFilter(opt)}
                  >
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </button>
                ))}
              </div>
              <button className={styles.playAllBtn} onClick={playAll} disabled={!files.length}>
                ▶ Play All
              </button>
            </div>
            <div className={styles.list}>
              {files.map(file => {
                const entry      = tagsData[file.inode] || {}
                const manualTags = entry.tags || []
                const auto       = entry.auto || {}
                const isCurrent  = file.inode === lastInode
                return (
                  <div key={file.inode} className={`${styles.row} ${isCurrent ? styles.current : ''}`}>
                    <div className={styles.thumb} onClick={() => playFrom(file.inode)}>
                      <MediaIcon type={file.mediaType} />
                      <div className={styles.thumbPlay}>▶</div>
                    </div>
                    <div className={styles.info}>
                      <span className={styles.filename}>{file.filename}</span>
                      <div className={styles.tagRow}>
                        {auto.duration && (
                          <span className={`${styles.tag} ${styles.auto}`}>{formatDuration(auto.duration)}</span>
                        )}
                        {manualTags.map(tag => (
                          <span key={tag} className={`${styles.tag} ${styles.manual}`}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function FolderIcon({ size = 14, dim }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={dim ? '#333' : 'currentColor'} strokeWidth="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  )
}
function ShuffleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>
      <polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
    </svg>
  )
}
function SettingsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}
function MediaIcon({ type }) {
  if (type === 'image') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  )
  if (type === 'gif') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <text x="12" y="15" textAnchor="middle" fill="#555" fontSize="7" fontFamily="monospace" stroke="none">GIF</text>
    </svg>
  )
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5">
      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
    </svg>
  )
}