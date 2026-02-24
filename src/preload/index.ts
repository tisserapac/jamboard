import { contextBridge, ipcRenderer } from 'electron'

const api = {
  boards: {
    list: () => ipcRenderer.invoke('boards:list'),
    create: (title: string) => ipcRenderer.invoke('boards:create', title),
    get: (id: string) => ipcRenderer.invoke('boards:get', id),
    update: (id: string, data: Record<string, unknown>) =>
      ipcRenderer.invoke('boards:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('boards:delete', id),
    duplicate: (id: string) => ipcRenderer.invoke('boards:duplicate', id)
  },
  frames: {
    list: (boardId: string) => ipcRenderer.invoke('frames:list', boardId),
    create: (boardId: string) => ipcRenderer.invoke('frames:create', boardId),
    get: (id: string) => ipcRenderer.invoke('frames:get', id),
    updateCanvas: (id: string, canvasJson: string) =>
      ipcRenderer.invoke('frames:updateCanvas', id, canvasJson),
    updateMeta: (id: string, data: Record<string, unknown>) =>
      ipcRenderer.invoke('frames:updateMeta', id, data),
    delete: (id: string) => ipcRenderer.invoke('frames:delete', id),
    reorder: (boardId: string, frameIds: string[]) =>
      ipcRenderer.invoke('frames:reorder', boardId, frameIds)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type JamboardAPI = typeof api
