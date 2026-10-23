import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useVault } from '../store/VaultContext'
import { shuffle, formatDuration } from '../lib/media'
import styles from './Player.module.css'

export default function Player() {
  const { inode: paramInode } = useParams()
  const navigate = useNavigate()
  const {
    folderPath, mediaFiles, tagsData, setTagsData, updateFileTags,
    playlist, setPlaylist, currentIndex, setCurrentIndex,
    repeatSingle, toggleRepeat, shuffled, setShuffled,
    imageDuration, setPausedAt, saveLastPlayed, savePosition,
    vaultTags, incrementPlayCount, deleteFile,
  } = useVault()

  const videoRef      = useRef(null)
  const hideTimerRef  = useRef(null)
  const imageTimerRef = useRef(null)
  const imagePlayingRef = useRef(false)

  const [uiVisible,     setUiVisible]     = useState(false)
  const [isPlaying,     setIsPlaying]     = useState(true)
  const [progress,      setProgress]      = useState(0)
  const [duration,      setDuration]      = useState(0)
  const [volume,        setVolume]        = useState(1)
  const [muted,         setMuted]         = useState(false)
  const [isFullscreen,  setIsFullscreen]  = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const currentInode = playlist[currentIndex] || paramInode
  const currentFile  = mediaFiles.find(f => f.inode === currentInode)
  const isImage = currentFile?.mediaType === 'image'
  const isVideo = currentFile?.mediaType === 'video'
  const entry    = tagsData[currentInode] || {}
  const fileTags = entry.tags || []
  const auto     = entry.auto || {}
  const playCount = entry.playCount || 0

  useEffect(() => { setUiVisible(false); clearTimeout(hideTimerRef.current); setDeleteConfirm(false) }, [currentInode])

  const showUi = useCallback(() => {
    setUiVisible(true)
    clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => setUiVisible(false), 3000)
  }, [])

  const goNext = useCallback(() => {
    if (repeatSingle) {
      if (isImage) startImageTimer()
      else { videoRef.current.currentTime = 0; videoRef.current.play() }
      return
    }
    if (currentIndex < playlist.length - 1) {
      const next = currentIndex + 1
      setCurrentIndex(next)
      navigate(`/player/${playlist[next]}`, { replace: true })
    } else { navigate('/') }
  }, [repeatSingle, currentIndex, playlist, isImage])

  const goPrev = useCallback(() => {
    if (videoRef.current && videoRef.current.currentTime > 3) { videoRef.current.currentTime = 0; return }
    if (currentIndex > 0) {
      const prev = currentIndex - 1
      setCurrentIndex(prev)
      navigate(`/player/${playlist[prev]}`, { replace: true })
    }
  }, [currentIndex, playlist])

  const stop = useCallback(() => { if (videoRef.current) videoRef.current.pause(); navigate('/') }, [])

  const startImageTimer = useCallback(() => {
    clearTimeout(imageTimerRef.current)
    imagePlayingRef.current = false
    if (!isPlaying) return
    imagePlayingRef.current = true
    imageTimerRef.current = setTimeout(() => {
      imagePlayingRef.current = false
      if (repeatSingle) incrementPlayCount(currentInode)
      goNext()
    }, imageDuration * 1000)
  }, [isPlaying, imageDuration, goNext])

  useEffect(() => {
    if (!isImage) return
    startImageTimer()
    return () => { clearTimeout(imageTimerRef.current); imagePlayingRef.current = false }
  }, [isImage, currentInode])

  useEffect(() => {
    if (!isImage) return
    if (isPlaying) startImageTimer()
    else { clearTimeout(imageTimerRef.current); imagePlayingRef.current = false }
  }, [isPlaying])

  useEffect(() => {
    const vid = videoRef.current
    if (!vid || isImage) return
    const onTimeUpdate = () => setProgress(vid.currentTime)
    const onLoaded = () => {
      const dur = Math.floor(vid.duration)
      setDuration(vid.duration); setProgress(0)
      vid.volume = muted ? 0 : volume
      vid.play().catch(() => {}); setIsPlaying(true)
      saveLastPlayed(currentInode, playlist, currentIndex)
      incrementPlayCount(currentInode)
      setTagsData(prev => {
        const existing = prev[currentInode] || {}
        if (existing.auto?.duration) return prev
        const updated = { ...existing, auto: { type: currentFile?.mediaType, duration: dur } }
        const next = { ...prev, [currentInode]: updated }
        if (folderPath) window.vault.writeTags(folderPath, next)
        return next
      })
    }
    const onEnded = () => { if (repeatSingle) { vid.currentTime = 0; vid.play(); incrementPlayCount(currentInode) } else goNext() }
    const onPlay  = () => setIsPlaying(true)
    const onPause = () => { setIsPlaying(false); savePosition(currentInode, vid.currentTime) }
    vid.addEventListener('timeupdate', onTimeUpdate)
    vid.addEventListener('loadedmetadata', onLoaded)
    vid.addEventListener('ended', onEnded)
    vid.addEventListener('play', onPlay)
    vid.addEventListener('pause', onPause)
    return () => {
      vid.removeEventListener('timeupdate', onTimeUpdate)
      vid.removeEventListener('loadedmetadata', onLoaded)
      vid.removeEventListener('ended', onEnded)
      vid.removeEventListener('play', onPlay)
      vid.removeEventListener('pause', onPause)
    }
  }, [currentInode, repeatSingle, goNext, volume, muted, folderPath, playlist, currentIndex])

  useEffect(() => {
    if (isImage && currentInode) { saveLastPlayed(currentInode, playlist, currentIndex); incrementPlayCount(currentInode) }
  }, [currentInode, isImage])

  useEffect(() => { if (!videoRef.current) return; videoRef.current.volume = muted ? 0 : volume }, [volume, muted])

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return
      const vid = videoRef.current
      switch (true) {
        case e.code === 'Space': {
          e.preventDefault()
          if (isImage) setIsPlaying(p => !p)
          else if (vid) { if (vid.paused) vid.play(); else vid.pause() }
          break
        }
        case e.code === 'KeyS': { stop(); break }
        case e.code === 'KeyF': {
          if (!document.fullscreenElement) document.documentElement.requestFullscreen()
          else document.exitFullscreen(); break
        }
        case e.code === 'ArrowRight': { e.preventDefault(); if (vid) vid.currentTime = Math.min(vid.duration, vid.currentTime + 10); break }
        case e.code === 'ArrowLeft':  { e.preventDefault(); if (vid) vid.currentTime = Math.max(0, vid.currentTime - 10); break }
        case e.code === 'ArrowUp':    { e.preventDefault(); setVolume(v => Math.min(1, parseFloat((v + 0.05).toFixed(2)))); break }
        case e.code === 'ArrowDown':  { e.preventDefault(); setVolume(v => Math.max(0, parseFloat((v - 0.05).toFixed(2)))); break }
        case e.code === 'KeyM': { setMuted(m => !m); break }
        case e.code === 'KeyL': { toggleRepeat(); break }
        case e.code === 'KeyN': { goNext(); break }
        case e.code === 'KeyP': { goPrev(); break }
        default: break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isImage, isPlaying, currentInode, goNext, goPrev, stop, toggleRepeat])

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const seek = (e) => {
    if (!videoRef.current || isImage) return
    const rect = e.currentTarget.getBoundingClientRect()
    videoRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration
  }

  const toggleTag = (tag) => {
    if (fileTags.includes(tag)) updateFileTags(currentInode, fileTags.filter(t => t !== tag).sort())
    else updateFileTags(currentInode, [...fileTags, tag].sort())
  }

  const doShuffle = () => {
    const newShuffled = !shuffled
    setShuffled(newShuffled)
    if (newShuffled) {
      const newList = shuffle(playlist)
      setPlaylist(newList)
      setCurrentIndex(newList.indexOf(currentInode) || 0)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return }
    const result = await deleteFile(currentInode, currentFile.filePath)
    if (result.ok) { if (playlist.length > 1) goNext(); else navigate('/') }
    else { console.error('Delete failed:', result.error); setDeleteConfirm(false) }
  }

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '0:00'
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
  }

  if (!currentFile) return (
    <div className={styles.nofile}>
      <p>File not found</p>
      <button onClick={() => navigate('/')}>← Library</button>
    </div>
  )

  const fileUrl = `file://${currentFile.filePath}`

  return (
    <div className={`${styles.container} ${!uiVisible ? styles.hideUi : ''}`} onMouseMove={showUi}>
      {isImage
        ? <img key={currentInode} src={fileUrl} className={styles.media} alt="" draggable={false} />
        : <video key={currentInode} ref={videoRef} src={fileUrl} className={styles.media} autoPlay playsInline />
      }
      <div className={styles.overlay}>
        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={stop}><ChevronLeft /> Library</button>
          <div className={styles.topMeta}>
            <span className={styles.topFilename}>{currentFile.filename}</span>
            <div className={styles.topTags}>
              <span className={`${styles.miniTag} ${styles.autoTag}`}>{auto.type || currentFile.mediaType}</span>
              {auto.duration && <span className={`${styles.miniTag} ${styles.autoTag}`}>{formatDuration(auto.duration)}</span>}
              <span className={`${styles.miniTag} ${styles.autoTag}`} title="Play count">▶ {playCount}</span>
              {fileTags.map(t => <span key={t} className={`${styles.miniTag} ${styles.manualTag}`}>{t}</span>)}
            </div>
          </div>
          <div className={styles.topRight}>
            <span className={styles.counter}>{currentIndex + 1} / {playlist.length}</span>
            <button
              className={`${styles.deleteBtn} ${deleteConfirm ? styles.deleteBtnConfirm : ''}`}
              onClick={handleDelete}
              title={deleteConfirm ? 'Click again to confirm delete' : 'Delete file'}
              onMouseLeave={() => setDeleteConfirm(false)}
            >
              <TrashIcon />
              {deleteConfirm && <span className={styles.deleteBtnLabel}>Confirm?</span>}
            </button>
          </div>
        </div>

        <div className={styles.bottom}>
          {!isImage && (
            <div className={styles.progressWrap}>
              <span className={styles.time}>{formatTime(progress)}</span>
              <div className={styles.progressBar} onClick={seek}>
                <div className={styles.progressFill} style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }} />
              </div>
              <span className={styles.time}>{formatTime(duration)}</span>
            </div>
          )}
          {isImage && isPlaying && (
            <div className={styles.progressWrap}>
              <div className={styles.progressBar} style={{ flex: 1 }}>
                <div className={styles.progressImage} key={`${currentInode}-${isPlaying}`} style={{ animationDuration: `${imageDuration}s` }} />
              </div>
            </div>
          )}
          <div className={styles.controls}>
            <div className={styles.controlsLeft}>
              <button className={styles.ctrl} onClick={goPrev} title="Prev (P)"><SkipBack /></button>
              <button className={styles.ctrl} onClick={stop}   title="Stop (S)"><StopIcon /></button>
              <button className={`${styles.ctrl} ${styles.playBtn}`} onClick={() => {
                if (isImage) setIsPlaying(p => !p)
                else if (videoRef.current) { if (videoRef.current.paused) videoRef.current.play(); else videoRef.current.pause() }
              }} title="Play/Pause (Space)">
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </button>
              <button className={styles.ctrl} onClick={goNext} title="Next (N)"><SkipForward /></button>
              {!isImage && (
                <div className={styles.volRow}>
                  <button className={styles.ctrl} onClick={() => setMuted(m => !m)} title="Mute (M)">
                    {muted || volume === 0 ? <VolumeOff /> : <VolumeOn />}
                  </button>
                  <input type="range" min="0" max="1" step="0.01" value={muted ? 0 : volume}
                    onChange={e => { setVolume(parseFloat(e.target.value)); setMuted(false) }}
                    className={styles.volSlider} />
                  <span className={styles.volPct}>{Math.round((muted ? 0 : volume) * 100)}%</span>
                </div>
              )}
            </div>
            <div className={styles.controlsRight}>
              <button className={`${styles.ctrl} ${repeatSingle ? styles.active : ''}`} onClick={toggleRepeat} title="Loop (L)"><LoopIcon /></button>
              <button className={`${styles.ctrl} ${shuffled ? styles.active : ''}`} onClick={doShuffle} title="Shuffle"><ShuffleIcon /></button>
              <button className={styles.ctrl} onClick={() => {
                if (!document.fullscreenElement) document.documentElement.requestFullscreen()
                else document.exitFullscreen()
              }} title="Fullscreen (F)"><FullscreenIcon /></button>
            </div>
          </div>
          <div className={styles.tagBar}>
            {vaultTags.length === 0
              ? <span className={styles.noTags}>No tags yet — add them in Settings</span>
              : vaultTags.map(tag => (
                  <button key={tag} className={`${styles.tagBtn} ${fileTags.includes(tag) ? styles.tagOn : ''}`} onClick={() => toggleTag(tag)}>
                    {tag}
                  </button>
                ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}

const ChevronLeft    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
const SkipBack       = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2"/></svg>
const SkipForward    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2"/></svg>
const PlayIcon       = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
const PauseIcon      = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
const StopIcon       = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
const VolumeOn       = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
const VolumeOff      = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
const LoopIcon       = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
const ShuffleIcon    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>
const FullscreenIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
const TrashIcon      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
