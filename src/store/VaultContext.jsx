import { createContext, useContext, useState, useEffect, useRef } from 'react'

const VaultContext = createContext(null)

export function VaultProvider({ children }) {
  const [folderPath,    setFolderPath]    = useState(null)
  const [mediaFiles,    setMediaFiles]    = useState([])
  const [tagsData,      setTagsData]      = useState({})
  const [activeFilters, setActiveFilters] = useState([])
  const [playlist,      setPlaylist]      = useState([])
  const [currentIndex,  setCurrentIndex]  = useState(0)
  const [repeatSingle,  setRepeatSingle]  = useState(false)
  const [shuffled,      setShuffled]      = useState(false)
  const [imageDuration, setImageDuration] = useState(10)
  const [pausedAt,      setPausedAt]      = useState(null)
  const [vaultTags,     setVaultTags]     = useState([])
  const sessionIdRef = useRef(null)

  useEffect(() => {
    window.vault.sessionStart().then(id => { sessionIdRef.current = id })
    const handleClose = () => {
      if (sessionIdRef.current != null) window.vault.sessionEnd(sessionIdRef.current)
    }
    window.addEventListener('beforeunload', handleClose)
    return () => window.removeEventListener('beforeunload', handleClose)
  }, [])

  useEffect(() => {
    window.vault.readVaultTags().then(tags => setVaultTags(tags || []))
  }, [])

  function toggleFilter(tag) {
    setActiveFilters(p => p.includes(tag) ? p.filter(t => t !== tag) : [...p, tag])
  }

  function toggleRepeat() { setRepeatSingle(v => !v) }

  function updateFileTags(inode, tags) {
    setTagsData(prev => {
      const next = { ...prev, [inode]: { ...prev[inode], tags } }
      if (folderPath) window.vault.writeTags(folderPath, next)
      return next
    })
  }

  function addVaultTag(tag) {
    const clean = tag.trim().toLowerCase()
    if (!clean) return
    setVaultTags(prev => {
      if (prev.includes(clean)) return prev
      const next = [...prev, clean].sort()
      window.vault.writeVaultTags(next)
      return next
    })
  }

  function removeVaultTag(tag) {
    const next = vaultTags.filter(t => t !== tag)
    setVaultTags(next)
    window.vault.writeVaultTags(next)
  }

  function incrementPlayCount(inode) {
    setTagsData(prev => {
      const entry = prev[inode] || {}
      const next = { ...prev, [inode]: { ...entry, playCount: (entry.playCount || 0) + 1 } }
      if (folderPath) window.vault.writeTags(folderPath, next)
      return next
    })
  }

  function saveLastPlayed(inode, playlistSnapshot, indexSnapshot) {
    const val = { inode, time: 0, playlist: playlistSnapshot, index: indexSnapshot }
    setPausedAt(val)
    setTagsData(prev => {
      const next = { ...prev, __lastPlayed__: val }
      if (folderPath) window.vault.writeTags(folderPath, next)
      return next
    })
  }

  function savePosition(inode, time) {
    setPausedAt(prev => {
      const val = { ...prev, inode, time }
      setTagsData(prev2 => {
        const next = { ...prev2, __lastPlayed__: val }
        if (folderPath) window.vault.writeTags(folderPath, next)
        return next
      })
      return val
    })
  }

  async function deleteFile(inode, filePath) {
    const result = await window.vault.deleteFile(filePath)
    if (!result.ok) return result
    setMediaFiles(prev => prev.filter(f => f.inode !== inode))
    setTagsData(prev => {
      const next = { ...prev }
      delete next[inode]
      if (folderPath) window.vault.writeTags(folderPath, next)
      return next
    })
    setPlaylist(prev => prev.filter(i => i !== inode))
    return result
  }

  return (
    <VaultContext.Provider value={{
      folderPath, setFolderPath,
      mediaFiles, setMediaFiles,
      tagsData,   setTagsData,
      activeFilters, setActiveFilters, toggleFilter,
      playlist,   setPlaylist,
      currentIndex, setCurrentIndex,
      repeatSingle, toggleRepeat,
      shuffled,   setShuffled,
      imageDuration, setImageDuration,
      pausedAt,   setPausedAt,
      saveLastPlayed, savePosition,
      vaultTags,  addVaultTag, removeVaultTag,
      updateFileTags,
      incrementPlayCount,
      deleteFile,
    }}>
      {children}
    </VaultContext.Provider>
  )
}

export function useVault() { return useContext(VaultContext) }
