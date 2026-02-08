import { supabase } from './supabase'

// ─── Create Note ────────────────────────────────────
export async function createNote({ userId, sessionId, noteText, wordPosition = 0 }) {
  try {
    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id: userId,
        session_id: sessionId,
        note_text: noteText,
        word_position: wordPosition,
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.warn('Failed to create note:', err.message)
    return null
  }
}

// ─── Update Note ────────────────────────────────────
export async function updateNote(noteId, noteText) {
  try {
    const { data, error } = await supabase
      .from('notes')
      .update({
        note_text: noteText,
        updated_at: new Date().toISOString(),
      })
      .eq('id', noteId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.warn('Failed to update note:', err.message)
    return null
  }
}

// ─── Delete Note ────────────────────────────────────
export async function deleteNote(noteId) {
  try {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId)

    if (error) throw error
    return true
  } catch (err) {
    console.warn('Failed to delete note:', err.message)
    return false
  }
}

// ─── Get Notes for a Session ────────────────────────
export async function getSessionNotes(sessionId) {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('session_id', sessionId)
      .order('word_position', { ascending: true })

    if (error) throw error
    return data || []
  } catch (err) {
    console.warn('Failed to fetch session notes:', err.message)
    return []
  }
}

// ─── Get All User Notes (with session info) ─────────
export async function getAllUserNotes(userId) {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select(`
        *,
        reading_sessions (
          id,
          title,
          source_type
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error
    return data || []
  } catch (err) {
    console.warn('Failed to fetch user notes:', err.message)
    return []
  }
}

// ─── Export Notes as Markdown ────────────────────────
export function exportNotesAsMarkdown(sessionTitle, notes) {
  let md = `# ${sessionTitle}\n\n`
  md += `*${notes.length} note${notes.length !== 1 ? 's' : ''}*\n\n---\n\n`

  notes.forEach((note, i) => {
    md += `### Note ${i + 1}\n`
    if (note.word_position > 0) {
      md += `*At word position: ${note.word_position}*\n\n`
    }
    md += `${note.note_text}\n\n`
    md += `*${new Date(note.created_at).toLocaleString()}*\n\n---\n\n`
  })

  return md
}
