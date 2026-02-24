import { ipcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../database'

export interface Frame {
  id: string
  board_id: string
  frame_order: number
  title: string | null
  background_color: string
  background_template: string | null
  canvas_json: string | null
  created_at: string
  updated_at: string
}

export function registerFrameIpc(): void {
  ipcMain.handle('frames:list', (_event, boardId: string) => {
    const db = getDb()
    return db
      .prepare('SELECT * FROM frames WHERE board_id = ? ORDER BY frame_order')
      .all(boardId) as Frame[]
  })

  ipcMain.handle('frames:create', (_event, boardId: string) => {
    const db = getDb()
    const id = uuidv4()

    const maxOrder = db
      .prepare('SELECT MAX(frame_order) as max_order FROM frames WHERE board_id = ?')
      .get(boardId) as { max_order: number | null }

    const newOrder = (maxOrder.max_order ?? -1) + 1

    db.prepare(
      'INSERT INTO frames (id, board_id, frame_order) VALUES (?, ?, ?)'
    ).run(id, boardId, newOrder)

    return db.prepare('SELECT * FROM frames WHERE id = ?').get(id) as Frame
  })

  ipcMain.handle('frames:get', (_event, id: string) => {
    const db = getDb()
    return db.prepare('SELECT * FROM frames WHERE id = ?').get(id) as Frame | undefined
  })

  ipcMain.handle('frames:updateCanvas', (_event, id: string, canvasJson: string) => {
    const db = getDb()
    db.prepare(
      "UPDATE frames SET canvas_json = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(canvasJson, id)

    const frame = db.prepare('SELECT board_id FROM frames WHERE id = ?').get(id) as
      | { board_id: string }
      | undefined
    if (frame) {
      db.prepare("UPDATE boards SET updated_at = datetime('now') WHERE id = ?").run(
        frame.board_id
      )
    }
  })

  ipcMain.handle(
    'frames:updateMeta',
    (_event, id: string, data: Partial<Frame>) => {
      const db = getDb()
      const fields: string[] = []
      const values: unknown[] = []

      if (data.title !== undefined) {
        fields.push('title = ?')
        values.push(data.title)
      }
      if (data.background_color !== undefined) {
        fields.push('background_color = ?')
        values.push(data.background_color)
      }
      if (data.background_template !== undefined) {
        fields.push('background_template = ?')
        values.push(data.background_template)
      }

      if (fields.length === 0) return

      fields.push("updated_at = datetime('now')")
      values.push(id)

      db.prepare(`UPDATE frames SET ${fields.join(', ')} WHERE id = ?`).run(...values)
      return db.prepare('SELECT * FROM frames WHERE id = ?').get(id) as Frame
    }
  )

  ipcMain.handle('frames:delete', (_event, id: string) => {
    const db = getDb()

    const frame = db.prepare('SELECT board_id, frame_order FROM frames WHERE id = ?').get(id) as
      | { board_id: string; frame_order: number }
      | undefined
    if (!frame) return

    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM frames WHERE id = ?').run(id)
      db.prepare(
        'UPDATE frames SET frame_order = frame_order - 1 WHERE board_id = ? AND frame_order > ?'
      ).run(frame.board_id, frame.frame_order)
    })
    transaction()
  })

  ipcMain.handle('frames:reorder', (_event, boardId: string, frameIds: string[]) => {
    const db = getDb()
    const update = db.prepare('UPDATE frames SET frame_order = ? WHERE id = ? AND board_id = ?')

    const transaction = db.transaction(() => {
      for (let i = 0; i < frameIds.length; i++) {
        update.run(i, frameIds[i], boardId)
      }
    })
    transaction()
  })
}
