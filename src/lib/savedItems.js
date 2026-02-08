import { supabase } from './supabase'

// ─── Save Item for Later ────────────────────────────
export async function saveItem({ userId, title, sourceUrl, sourceType = 'url', estimatedWordCount = null }) {
  try {
    const { data, error } = await supabase
      .from('saved_items')
      .insert({
        user_id: userId,
        title: title || 'Untitled',
        source_url: sourceUrl || null,
        source_type: sourceType,
        estimated_word_count: estimatedWordCount,
        status: 'queued',
        priority: 0,
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.warn('Failed to save item:', err.message)
    return null
  }
}

// ─── Get Reading Queue (queued items) ───────────────
export async function getReadingQueue(userId) {
  try {
    const { data, error } = await supabase
      .from('saved_items')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'queued')
      .order('priority', { ascending: false })
      .order('added_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return data || []
  } catch (err) {
    console.warn('Failed to fetch reading queue:', err.message)
    return []
  }
}

// ─── Get All Saved Items ────────────────────────────
export async function getAllSavedItems(userId) {
  try {
    const { data, error } = await supabase
      .from('saved_items')
      .select('*')
      .eq('user_id', userId)
      .order('added_at', { ascending: false })
      .limit(100)

    if (error) throw error
    return data || []
  } catch (err) {
    console.warn('Failed to fetch saved items:', err.message)
    return []
  }
}

// ─── Update Item Status ─────────────────────────────
export async function updateItemStatus(itemId, status) {
  try {
    const { data, error } = await supabase
      .from('saved_items')
      .update({ status })
      .eq('id', itemId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.warn('Failed to update item status:', err.message)
    return null
  }
}

// ─── Update Item Priority ───────────────────────────
export async function updateItemPriority(itemId, priority) {
  try {
    const { data, error } = await supabase
      .from('saved_items')
      .update({ priority })
      .eq('id', itemId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.warn('Failed to update item priority:', err.message)
    return null
  }
}

// ─── Reorder Items (batch update priorities) ────────
export async function reorderItems(items) {
  // items = [{ id, priority }]
  try {
    for (const item of items) {
      await supabase
        .from('saved_items')
        .update({ priority: item.priority })
        .eq('id', item.id)
    }
    return true
  } catch (err) {
    console.warn('Failed to reorder items:', err.message)
    return false
  }
}

// ─── Delete Saved Item ──────────────────────────────
export async function deleteSavedItem(itemId) {
  try {
    const { error } = await supabase
      .from('saved_items')
      .delete()
      .eq('id', itemId)

    if (error) throw error
    return true
  } catch (err) {
    console.warn('Failed to delete saved item:', err.message)
    return false
  }
}

// ─── Auto-categorize source type ────────────────────
export function detectSourceType(url) {
  if (!url) return 'url'
  const lower = url.toLowerCase()
  if (lower.endsWith('.pdf')) return 'research'
  if (lower.includes('arxiv.org') || lower.includes('scholar.google') || lower.includes('doi.org')) return 'research'
  if (lower.includes('medium.com') || lower.includes('substack.com') || lower.includes('blog')) return 'article'
  if (lower.includes('kindle') || lower.includes('gutenberg')) return 'book'
  return 'article'
}

// ─── Estimate reading time ──────────────────────────
export function estimateReadingTime(wordCount, wpm = 250) {
  if (!wordCount || wordCount <= 0) return null
  const minutes = Math.ceil(wordCount / wpm)
  if (minutes < 1) return '< 1 min'
  if (minutes < 60) return `${minutes} min`
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`
}
