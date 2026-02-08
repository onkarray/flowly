import { Readability } from '@mozilla/readability'
import DOMPurify from 'dompurify'
import { cleanText } from './cleanText'

const CORS_PROXIES = [
  // Our own Vercel serverless proxy (most reliable)
  (url) => `/api/fetch?url=${encodeURIComponent(url)}`,
  // Public fallbacks
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
]

/**
 * Extract clean readable text from a URL.
 */
export async function extractTextFromURL(url) {
  const html = await fetchHTML(url)
  const rawText = parseHTMLToText(html, url)
  const text = cleanText(rawText)

  if (!text || text.length < 50) {
    throw new Error('Not enough readable text found on this page. Try a different article or paste the text into a .txt file.')
  }

  return { text, pageCount: null, chapters: null }
}

function looksLikeHTML(text) {
  // Must contain an actual HTML tag to count as valid HTML
  return text.length > 500 && (/<html/i.test(text) || /<body/i.test(text) || /<div/i.test(text) || /<article/i.test(text) || /<p[\s>]/i.test(text))
}

async function fetchHTML(url) {
  // 1. Try direct fetch (works for same-origin or CORS-enabled sites)
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (res.ok) {
      const html = await res.text()
      if (looksLikeHTML(html)) return html
    }
  } catch {
    // CORS or network error — expected, try proxies
  }

  // 2. Try each proxy in order
  for (const makeProxyUrl of CORS_PROXIES) {
    try {
      const proxyUrl = makeProxyUrl(url)
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) })
      if (res.ok) {
        const html = await res.text()
        if (looksLikeHTML(html)) return html
      }
    } catch {
      continue
    }
  }

  throw new Error(
    'Could not fetch this URL. The site may be blocking access or require login. Try copying the text and saving it as a .txt file instead.'
  )
}

function parseHTMLToText(html, url) {
  const cleanHTML = DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: true,
    RETURN_DOM: false,
  })

  const parser = new DOMParser()
  const doc = parser.parseFromString(cleanHTML, 'text/html')

  const base = doc.createElement('base')
  base.href = url
  doc.head.appendChild(base)

  const reader = new Readability(doc, { charThreshold: 100 })
  const article = reader.parse()

  if (!article || !article.textContent) {
    throw new Error('Could not find the main article content. This page may require login, or it might be mostly images/video.')
  }

  let text = article.textContent
  text = text.replace(/[ \t]+/g, ' ')
  text = text.replace(/\n /g, '\n')
  text = text.replace(/\n{3,}/g, '\n\n')
  text = text.trim()

  return text
}

/**
 * Read text from an uploaded file.
 * Returns { text, pageCount, chapters }
 * chapters is an array of { title, text } or null if no chapters found.
 * onProgress(percent) is called during extraction for large files.
 */
export async function extractTextFromFile(file, onProgress) {
  const name = file.name.toLowerCase()

  if (name.endsWith('.txt')) {
    const rawText = await file.text()
    if (!rawText || rawText.trim().length < 20) {
      throw new Error('This file appears to be empty or too short. Make sure the file contains readable text.')
    }
    const cleaned = cleanText(rawText.trim())
    const chapters = detectChaptersFromText(cleaned)
    return { text: cleaned, pageCount: null, chapters }
  }

  if (name.endsWith('.pdf')) {
    return await extractPDFText(file, onProgress)
  }

  const text = await file.text()
  if (text && text.trim().length > 50) {
    const cleaned = text.trim()
    const chapters = detectChaptersFromText(cleaned)
    return { text: cleaned, pageCount: null, chapters }
  }

  throw new Error('Could not read this file. Supported formats: .txt, .pdf. Try saving your content as a text file.')
}

async function extractPDFText(file, onProgress) {
  let pdfjsLib
  try {
    pdfjsLib = await loadPdfJs()
  } catch {
    throw new Error('Failed to load the PDF reader. Please check your internet connection and refresh the page.')
  }

  let pdf
  try {
    const arrayBuffer = await file.arrayBuffer()
    pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  } catch {
    throw new Error('Could not open this PDF. It may be corrupted, password-protected, or an unsupported format.')
  }

  if (pdf.numPages === 0) {
    throw new Error('This PDF has no pages.')
  }

  // Try to get the PDF outline (bookmarks/TOC)
  let outline = []
  try {
    outline = (await pdf.getOutline()) || []
  } catch {
    // No outline available
  }

  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()

    let pageText = ''
    let lastY = null
    for (const item of content.items) {
      if (!item.str) continue
      const y = Math.round(item.transform[5])
      if (lastY !== null && Math.abs(y - lastY) > 5) {
        pageText += '\n'
      } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
        pageText += ' '
      }
      pageText += item.str
      lastY = y
    }

    pages.push(pageText)

    // Report progress for large files
    if (onProgress && pdf.numPages > 20) {
      onProgress(Math.round((i / pdf.numPages) * 100))
    }
  }

  let text = pages.join('\n\n')
  text = cleanPDFText(text)
  text = cleanText(text)

  if (text.length < 30) {
    throw new Error('No readable text found in this PDF. It may be a scanned document or image-only file. Try using OCR software first.')
  }

  // Detect chapters — prefer PDF outline, fall back to text heuristics
  let chapters = null
  if (outline.length >= 2) {
    chapters = buildChaptersFromOutline(outline, text)
  }
  if (!chapters || chapters.length < 2) {
    chapters = detectChaptersFromText(text)
  }

  return { text, pageCount: pdf.numPages, chapters }
}

/**
 * Build chapters from PDF outline/bookmarks.
 * Maps outline titles to positions in the extracted text.
 */
function buildChaptersFromOutline(outline, fullText) {
  // Flatten nested outline
  const flat = []
  function flatten(items, depth = 0) {
    for (const item of items) {
      if (item.title && depth < 2) {
        flat.push(item.title.trim())
      }
      if (item.items && item.items.length > 0) {
        flatten(item.items, depth + 1)
      }
    }
  }
  flatten(outline)

  if (flat.length < 2) return null

  // Find each title in the text and split
  const chapters = []
  const lowerText = fullText.toLowerCase()

  const positions = []
  for (const title of flat) {
    const idx = lowerText.indexOf(title.toLowerCase())
    if (idx !== -1) {
      positions.push({ title, index: idx })
    }
  }

  // Sort by position in text
  positions.sort((a, b) => a.index - b.index)

  if (positions.length < 2) return null

  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].index
    const end = i < positions.length - 1 ? positions[i + 1].index : fullText.length
    const chapterText = fullText.slice(start, end).trim()
    if (chapterText.length > 20) {
      chapters.push({
        title: positions[i].title,
        text: chapterText,
      })
    }
  }

  // If there's text before the first chapter, add it as "Introduction"
  if (positions[0].index > 200) {
    const preText = fullText.slice(0, positions[0].index).trim()
    if (preText.length > 50) {
      chapters.unshift({ title: 'Introduction', text: preText })
    }
  }

  return chapters.length >= 2 ? chapters : null
}

/**
 * Detect chapters from text using regex heuristics.
 */
const CHAPTER_PATTERNS = [
  // "Chapter 1", "Chapter One", "CHAPTER 1: Title"
  /^(?:chapter|ch\.?)\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)[\s:.\-—]*.*/i,
  // "Part 1", "Part One", "PART I"
  /^part\s+(?:\d+|[ivxlc]+|one|two|three|four|five|six|seven|eight|nine|ten)[\s:.\-—]*.*/i,
  // "Section 1"
  /^section\s+\d+[\s:.\-—]*.*/i,
  // "1. Title" or "I. Title" at line start (numbered chapters)
  /^\d{1,3}\.\s+[A-Z].{2,60}$/m,
]

function detectChaptersFromText(text) {
  // Try each pattern
  for (const pattern of CHAPTER_PATTERNS) {
    const chapters = splitByPattern(text, pattern)
    if (chapters && chapters.length >= 2) return chapters
  }

  // If no chapters detected and text is very long, split into ~2000 word chunks
  const wordCount = text.split(/\s+/).length
  if (wordCount > 5000) {
    return splitIntoChunks(text, 2000)
  }

  return null
}

function splitByPattern(text, pattern) {
  const lines = text.split('\n')
  const matches = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (pattern.test(line)) {
      matches.push({ title: line.slice(0, 80), lineIndex: i })
    }
  }

  if (matches.length < 2) return null

  const chapters = []

  // Text before first chapter
  const preLines = lines.slice(0, matches[0].lineIndex).join('\n').trim()
  if (preLines.length > 100) {
    chapters.push({ title: 'Introduction', text: preLines })
  }

  for (let i = 0; i < matches.length; i++) {
    const startLine = matches[i].lineIndex
    const endLine = i < matches.length - 1 ? matches[i + 1].lineIndex : lines.length
    const chapterText = lines.slice(startLine, endLine).join('\n').trim()
    if (chapterText.length > 30) {
      chapters.push({ title: matches[i].title, text: chapterText })
    }
  }

  return chapters.length >= 2 ? chapters : null
}

/**
 * For very long texts with no chapter markers, split into ~N word chunks.
 */
function splitIntoChunks(text, wordsPerChunk) {
  const paragraphs = text.split(/\n\s*\n/)
  const chapters = []
  let current = { title: '', text: '' }
  let wordCount = 0
  let chapterNum = 1

  for (const para of paragraphs) {
    const paraWords = para.trim().split(/\s+/).length
    if (wordCount > 0 && wordCount + paraWords > wordsPerChunk) {
      current.title = `Section ${chapterNum}`
      chapters.push(current)
      chapterNum++
      current = { title: '', text: '' }
      wordCount = 0
    }
    current.text += (current.text ? '\n\n' : '') + para.trim()
    wordCount += paraWords
  }

  if (current.text.trim().length > 30) {
    current.title = `Section ${chapterNum}`
    chapters.push(current)
  }

  return chapters.length >= 2 ? chapters : null
}

function cleanPDFText(text) {
  let t = text

  t = t.replace(/^\s*\d{1,4}\s*$/gm, '')
  t = t.replace(/^[\s]*page\s+\d+(\s+of\s+\d+)?[\s]*$/gim, '')
  t = t.replace(/^[\s]*-\s*\d+\s*-[\s]*$/gm, '')

  const lines = t.split('\n')
  const lineCounts = {}
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length > 0 && trimmed.length < 60) {
      lineCounts[trimmed] = (lineCounts[trimmed] || 0) + 1
    }
  }
  const repeatedHeaders = new Set(
    Object.entries(lineCounts)
      .filter(([, count]) => count >= 3)
      .map(([line]) => line)
  )
  if (repeatedHeaders.size > 0) {
    t = lines.filter(line => !repeatedHeaders.has(line.trim())).join('\n')
  }

  t = t.replace(/(\w)-\s*\n\s*(\w)/g, '$1$2')
  t = t.replace(/[ \t]+/g, ' ')
  t = t.replace(/\n /g, '\n')
  t = t.replace(/\n{3,}/g, '\n\n')
  t = t.trim()

  return t
}

let pdfjsPromise = null
function loadPdfJs() {
  if (pdfjsPromise) return pdfjsPromise
  pdfjsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.onload = () => {
      const lib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib
      lib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      resolve(lib)
    }
    script.onerror = () => reject(new Error('Failed to load PDF parser'))
    document.head.appendChild(script)
  })
  return pdfjsPromise
}

/**
 * Convert raw text (with paragraphs) into a words array for the RSVP reader.
 * Inserts ¶ markers at paragraph boundaries.
 */
export function textToWords(text) {
  return text
    .split(/\n\s*\n/)
    .flatMap((paragraph, i, arr) => {
      const words = paragraph.trim().split(/\s+/).filter(Boolean)
      if (words.length === 0) return []
      if (i < arr.length - 1) words.push('¶')
      return words
    })
}
