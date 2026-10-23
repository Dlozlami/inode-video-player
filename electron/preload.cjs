const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('vault', {
  openFolder:     ()                  => ipcRenderer.invoke('dialog:openFolder'),
  readDir:        (folderPath)        => ipcRenderer.invoke('fs:readDir', folderPath),
  readTags:       (folderPath)        => ipcRenderer.invoke('fs:readTags', folderPath),
  writeTags:      (folderPath, data)  => ipcRenderer.invoke('fs:writeTags', folderPath, data),
  readVaultTags:  ()                  => ipcRenderer.invoke('vaultTags:read'),
  writeVaultTags: (tags)              => ipcRenderer.invoke('vaultTags:write', tags),
  deleteFile:     (filePath)          => ipcRenderer.invoke('fs:deleteFile', filePath),
  deleteFiles:    (filePaths)         => ipcRenderer.invoke('fs:deleteFiles', filePaths),
  saveExport:     (data)              => ipcRenderer.invoke('fs:saveExport', data),
  sessionStart:   ()                  => ipcRenderer.invoke('session:start'),
  sessionEnd:     (sessionId)         => ipcRenderer.invoke('session:end', sessionId),
})
