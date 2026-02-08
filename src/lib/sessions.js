import { supabase } from './supabase'

const OFFLINE_KEY = 'flowly-offline-sessions'

// ─── Helpers ────────────────────────────────────────
function getOfflineQueue() {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveOfflineQueue(queue) {
  try {
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(queue))
  } catch { /* storage full */ }
}

function addToOfflineQueue(action, data) {
  const queue = getOfflineQueue()
  queue.push({ action, data, timestamp: Date.now() })
  saveOfflineQueue(queue)
}

// ─── Create Session ─────────────────────────────────
export async function createSession({ userId, title, sourceType, sourceUrl, contentText, wordCount }) {
  const row = {
    user_id: userId,
    title: title || 'Untitled',
    source_type: sourceType || 'sample',
    source_url: sourceUrl || null,
    content_text: contentText,
    word_count: wordCount,
    current_position: 0,
    completed: false,
    time_spent_seconds: 0,
    average_wpm: null,
  }

  try {
    const { data, error } = await supabase
      .from('reading_sessions')
      .insert(row)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.warn('Failed to create session online, queuing offline:', err.message)
    const offlineId = `offline-${Date.now()}`
    const offlineRow = { ...row, id: offlineId, created_at: new Date().toISOString(), last_read_at: new Date().toISOString() }
    addToOfflineQueue('create', offlineRow)
    return offlineRow
  }
}

// ─── Update Session Progress ────────────────────────
export async function updateSessionProgress(sessionId, { currentPosition, timeSpentSeconds, averageWpm }) {
  // Skip offline-created sessions (they'll sync later)
  if (String(sessionId).startsWith('offline-')) {
    addToOfflineQueue('update', { sessionId, currentPosition, timeSpentSeconds, averageWpm })
    return null
  }

  try {
    const { data, error } = await supabase
      .from('reading_sessions')
      .update({
        current_position: currentPosition,
        time_spent_seconds: timeSpentSeconds,
        average_wpm: averageWpm,
        last_read_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.warn('Failed to update session, queuing offline:', err.message)
    addToOfflineQueue('update', { sessionId, currentPosition, timeSpentSeconds, averageWpm })
    return null
  }
}

// ─── Complete Session ───────────────────────────────
export async function completeSession(sessionId, { timeSpentSeconds, averageWpm, wordsRead }) {
  if (String(sessionId).startsWith('offline-')) {
    addToOfflineQueue('complete', { sessionId, timeSpentSeconds, averageWpm, wordsRead })
    return null
  }

  try {
    const { data, error } = await supabase
      .from('reading_sessions')
      .update({
        completed: true,
        current_position: wordsRead,
        time_spent_seconds: timeSpentSeconds,
        average_wpm: averageWpm,
        last_read_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.warn('Failed to complete session, queuing offline:', err.message)
    addToOfflineQueue('complete', { sessionId, timeSpentSeconds, averageWpm, wordsRead })
    return null
  }
}

// ─── Get Incomplete Sessions (for Resume) ───────────
export async function getIncompleteSessions(userId) {
  try {
    const { data, error } = await supabase
      .from('reading_sessions')
      .select('id, title, source_type, source_url, content_text, word_count, current_position, time_spent_seconds, average_wpm, last_read_at')
      .eq('user_id', userId)
      .eq('completed', false)
      .order('last_read_at', { ascending: false })
      .limit(5)

    if (error) throw error
    return data || []
  } catch (err) {
    console.warn('Failed to fetch incomplete sessions:', err.message)
    return []
  }
}

// ─── Get All Sessions (for History) ─────────────────
export async function getAllSessions(userId) {
  try {
    const { data, error } = await supabase
      .from('reading_sessions')
      .select('id, title, source_type, source_url, word_count, current_position, completed, time_spent_seconds, average_wpm, created_at, last_read_at')
      .eq('user_id', userId)
      .order('last_read_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return data || []
  } catch (err) {
    console.warn('Failed to fetch sessions:', err.message)
    return []
  }
}

// ─── Get Single Session (for resuming) ──────────────
export async function getSession(sessionId) {
  try {
    const { data, error } = await supabase
      .from('reading_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.warn('Failed to fetch session:', err.message)
    return null
  }
}

// ─── Delete Session ─────────────────────────────────
export async function deleteSession(sessionId) {
  try {
    const { error } = await supabase
      .from('reading_sessions')
      .delete()
      .eq('id', sessionId)

    if (error) throw error
    return true
  } catch (err) {
    console.warn('Failed to delete session:', err.message)
    return false
  }
}

// ─── Sync Offline Queue ─────────────────────────────
export async function syncOfflineQueue() {
  const queue = getOfflineQueue()
  if (queue.length === 0) return

  const remaining = []

  for (const item of queue) {
    try {
      if (item.action === 'create') {
        const { id: _offlineId, ...row } = item.data
        await supabase.from('reading_sessions').insert(row)
      } else if (item.action === 'update') {
        if (!String(item.data.sessionId).startsWith('offline-')) {
          await supabase
            .from('reading_sessions')
            .update({
              current_position: item.data.currentPosition,
              time_spent_seconds: item.data.timeSpentSeconds,
              average_wpm: item.data.averageWpm,
              last_read_at: new Date().toISOString(),
            })
            .eq('id', item.data.sessionId)
        }
      } else if (item.action === 'complete') {
        if (!String(item.data.sessionId).startsWith('offline-')) {
          await supabase
            .from('reading_sessions')
            .update({
              completed: true,
              current_position: item.data.wordsRead,
              time_spent_seconds: item.data.timeSpentSeconds,
              average_wpm: item.data.averageWpm,
              last_read_at: new Date().toISOString(),
            })
            .eq('id', item.data.sessionId)
        }
      }
    } catch {
      remaining.push(item)
    }
  }

  saveOfflineQueue(remaining)
}
