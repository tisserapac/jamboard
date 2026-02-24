import { ipcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../database'

export interface Board {
  id: string
  title: string
  thumbnail: string | null
  created_at: string
  updated_at: string
}

export function registerBoardIpc(): void {
  ipcMain.handle('boards:list', () => {
    const db = getDb()
    return db.prepare('SELECT * FROM boards ORDER BY updated_at DESC').all() as Board[]
  })

  ipcMain.handle('boards:create', (_event, title: string) => {
    const db = getDb()
    const id = uuidv4()
    const frameId = uuidv4()

    const insertBoard = db.prepare(
      'INSERT INTO boards (id, title) VALUES (?, ?)'
    )
    const insertFrame = db.prepare(
      'INSERT INTO frames (id, board_id, frame_order) VALUES (?, ?, 0)'
    )

    const transaction = db.transaction(() => {
      insertBoard.run(id, title || 'Untitled Jam')
      insertFrame.run(frameId, id)
    })
    transaction()

    return db.prepare('SELECT * FROM boards WHERE id = ?').get(id) as Board
  })

  ipcMain.handle('boards:get', (_event, id: string) => {
    const db = getDb()
    return db.prepare('SELECT * FROM boards WHERE id = ?').get(id) as Board | undefined
  })

  ipcMain.handle('boards:update', (_event, id: string, data: Partial<Board>) => {
    const db = getDb()
    const fields: string[] = []
    const values: unknown[] = []

    if (data.title !== undefined) {
      fields.push('title = ?')
      values.push(data.title)
    }
    if (data.thumbnail !== undefined) {
      fields.push('thumbnail = ?')
      values.push(data.thumbnail)
    }

    if (fields.length === 0) return

    fields.push("updated_at = datetime('now')")
    values.push(id)

    db.prepare(`UPDATE boards SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return db.prepare('SELECT * FROM boards WHERE id = ?').get(id) as Board
  })

  ipcMain.handle('boards:delete', (_event, id: string) => {
    const db = getDb()
    db.prepare('DELETE FROM boards WHERE id = ?').run(id)
  })

  ipcMain.handle('boards:duplicate', (_event, id: string) => {
    const db = getDb()
    const original = db.prepare('SELECT * FROM boards WHERE id = ?').get(id) as Board | undefined
    if (!original) throw new Error('Board not found')

    const newId = uuidv4()
    const now = new Date().toISOString()

    const insertBoard = db.prepare(
      'INSERT INTO boards (id, title, thumbnail, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    )
    insertBoard.run(newId, `${original.title} (Copy)`, original.thumbnail, now, now)

    const frames = db.prepare(
      'SELECT * FROM frames WHERE board_id = ? ORDER BY frame_order'
    ).all(id) as Array<{
      id: string
      board_id: string
      frame_order: number
      title: string | null
      background_color: string
      background_template: string | null
      canvas_json: string | null
    }>

    const insertFrame = db.prepare(
      'INSERT INTO frames (id, board_id, frame_order, title, background_color, background_template, canvas_json) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )

    for (const frame of frames) {
      insertFrame.run(
        uuidv4(),
        newId,
        frame.frame_order,
        frame.title,
        frame.background_color,
        frame.background_template,
        frame.canvas_json
      )
    }

    return db.prepare('SELECT * FROM boards WHERE id = ?').get(newId) as Board
  })
}
