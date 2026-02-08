/**
 * cleanText — Deterministic text cleanup for RSVP reading.
 *
 * Pipeline runs in order. No AI, no external libs — only regex and string rules.
 * Does NOT rewrite, summarize, or change meaning. Only removes extraction noise.
 *
 * Example:
 *   INPUT (noisy PDF text):
 *     "The inter-\nnational community has\nrecognized [1] that climate\nchange (Smith et al., 2021) poses\n\n\n\n• significant risks\n— to biodiversity.\nSee https://example.com for more.\n\nReferences\nSmith, J. (2021). Climate..."
 *
 *   OUTPUT (clean):
 *     "The international community has recognized that climate change poses\n\nsignificant risks to biodiversity.\nSee for more."
 */

export function cleanText(text) {
  if (!text || typeof text !== 'string') return ''

  let t = text

  // ─── Step 1: Fix hyphenated line breaks from PDFs ───────────────
  // "inter-\nnational" → "international"
  t = t.replace(/(\w)-\s*\n\s*(\w)/g, '$1$2')

  // ─── Step 2: Join broken lines inside paragraphs ────────────────
  // A line that doesn't end with sentence-ending punctuation
  // followed by a line that starts with a lowercase letter
  // → join them (this is a broken line, not a paragraph break)
  t = t.replace(/([^\n.!?:;])\n(?!\n)([a-z])/g, '$1 $2')

  // Also join lines where previous line ends with a word and next starts with a word
  // but only single newlines (not double)
  t = t.replace(/(\w)\n(?!\n)(\w)/g, '$1 $2')

  // ─── Step 3: Collapse excessive newlines ────────────────────────
  // Convert 3+ newlines into exactly 2 (preserve paragraph separation)
  t = t.replace(/\n{3,}/g, '\n\n')

  // ─── Step 4: Remove bullet and list prefix characters ───────────
  // Remove leading: • - – — * ▪ ▸ ► ○ ● at the start of lines
  t = t.replace(/^[\s]*[•\-–—*▪▸►○●]\s*/gm, '')

  // ─── Step 5: Remove footnote markers ────────────────────────────
  // Remove patterns like [1], [23], [1,2], [1-3]
  t = t.replace(/\[\d+(?:[,\-–]\d+)*\]/g, '')
  // Remove patterns like (1), (2), (23) — only small numbers to avoid false positives
  t = t.replace(/\((\d{1,2})\)(?=\s|$|[.,;])/g, '')

  // ─── Step 6: Remove inline academic citations ───────────────────
  // "(Smith et al., 2021)", "(Jones, 2020)", "(Smith & Jones, 2019)"
  // "(Smith et al., 2021; Jones, 2020)" — multiple citations
  t = t.replace(/\([A-Z][a-zA-Z\s&.,;]+(?:et\s+al\.?)?\s*,?\s*\d{4}[a-z]?(?:\s*;\s*[A-Z][a-zA-Z\s&.,]+(?:et\s+al\.?)?\s*,?\s*\d{4}[a-z]?)*\)/g, '')

  // ─── Step 7: Remove URLs inside the text ────────────────────────
  // Match http(s) URLs and bare www. URLs
  t = t.replace(/https?:\/\/[^\s)>\]]+/gi, '')
  t = t.replace(/www\.[^\s)>\]]+/gi, '')

  // ─── Step 8: Remove References / Bibliography section ───────────
  // Remove everything after a line that starts with "References" or "Bibliography"
  // (case-insensitive, must be on its own line or with minimal following text)
  t = t.replace(/\n\s*(?:References|Bibliography|Works\s+Cited|Literature\s+Cited)\s*\n[\s\S]*/i, '')

  // ─── Step 9: Normalize spacing ─────────────────────────────────
  // Replace multiple spaces with single space
  t = t.replace(/[ \t]+/g, ' ')
  // Clean up spaces after newlines
  t = t.replace(/\n /g, '\n')
  // Trim each line
  t = t.split('\n').map(line => line.trim()).join('\n')
  // Collapse any remaining excessive newlines (cleanup may have created some)
  t = t.replace(/\n{3,}/g, '\n\n')
  // Trim leading and trailing whitespace
  t = t.trim()

  return t
}
