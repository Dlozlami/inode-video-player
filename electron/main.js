import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync, unlinkSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

function sessionsPath() {
  return join(app.getPath('userData'), 'sessions.json')
}
function readSessions() {
  const p = sessionsPath()
  if (!existsSync(p)) return []
  try { return JSON.parse(readFileSync(p, 'utf-8')) } catch { return [] }
}
function writeSessions(sessions) {
  writeFileSync(sessionsPath(), JSON.stringify(sessions, null, 2), 'utf-8')
}
function readVaultTags() {
  const p = join(app.getPath('userData'), 'vault_tags.json')
  if (!existsSync(p)) return []
  try { return JSON.parse(readFileSync(p, 'utf-8')) } catch { return [] }
}
function writeVaultTags(tags) {
  writeFileSync(join(app.getPath('userData'), 'vault_tags.json'), JSON.stringify(tags, null, 2), 'utf-8')
}
const MEDIA_EXTENSIONS = {
  video: ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.flv', '.wmv', '.m4v'],
  gif:   ['.gif'],
  image: ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.avif'],
}
function getMediaType(filename) {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'))
  for (const [type, exts] of Object.entries(MEDIA_EXTENSIONS)) {
    if (exts.includes(ext)) return type
  }
  return null
}
function getInode(filePath) {
  try { return statSync(filePath).ino.toString() } catch { return null }
}
function readTags(folderPath) {
  const p = join(folderPath, 'tags.json')
  if (!existsSync(p)) return {}
  try { return JSON.parse(readFileSync(p, 'utf-8')) } catch { return {} }
}
function writeTags(folderPath, data) {
  writeFileSync(join(folderPath, 'tags.json'), JSON.stringify(data, null, 2), 'utf-8')
}
function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 900, minHeight: 600,
    backgroundColor: '#0d0d0d',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  })
  if (process.env['VITE_DEV_SERVER_URL']) {
    win.loadURL(process.env['VITE_DEV_SERVER_URL'])
  } else {
    win.loadFile(join(__dirname, '../dist/index.html'))
  }
}
app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
  return result.canceled ? null : result.filePaths[0]
})
ipcMain.handle('fs:readDir', async (_, folderPath) => {
  const files = []
  for (const filename of readdirSync(folderPath)) {
    const mediaType = getMediaType(filename)
    if (!mediaType) continue
    const filePath = join(folderPath, filename)
    const inode = getInode(filePath)
    if (inode) files.push({ inode, filename, filePath, mediaType })
  }
  return files
})
ipcMain.handle('fs:readTags',  async (_, p)       => readTags(p))
ipcMain.handle('fs:writeTags', async (_, p, data) => { writeTags(p, data); return true })
ipcMain.handle('fs:deleteFile', async (_, filePath) => {
  try { unlinkSync(filePath); return { ok: true } }
  catch (err) { return { ok: false, error: err.message } }
})
ipcMain.handle('vaultTags:read',  async ()        => readVaultTags())
ipcMain.handle('vaultTags:write', async (_, tags) => { writeVaultTags(tags); return true })
ipcMain.handle('session:start', async () => {
  const sessions = readSessions()
  const id = Date.now()
  sessions.push({ id, openedAt: new Date().toISOString(), closedAt: null, durationSec: null })
  writeSessions(sessions)
  return id
})
ipcMain.handle('session:end', async (_, sessionId) => {
  const sessions = readSessions()
  const entry = sessions.find(s => s.id === sessionId)
  if (!entry) return false
  entry.closedAt = new Date().toISOString()
  entry.durationSec = Math.round((Date.now() - sessionId) / 1000)
  writeSessions(sessions)
  return true
})

// Bulk delete — attempts each file, returns per-path results
ipcMain.handle('fs:deleteFiles', async (_, filePaths) => {
  return filePaths.map(filePath => {
    try { unlinkSync(filePath); return { filePath, ok: true } }
    catch (err) { return { filePath, ok: false, error: err.message } }
  })
})

// Export — opens a save dialog and writes the JSON the renderer built
ipcMain.handle('fs:saveExport', async (_, data) => {
  const result = await dialog.showSaveDialog({
    title: 'Export library',
    defaultPath: 'inode-export.json',
    filters: [{ name: 'JSON', extensions: ['json'] }],
  })
  if (result.canceled || !result.filePath) return { ok: false }
  try {
    writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf-8')
    return { ok: true, filePath: result.filePath }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})
