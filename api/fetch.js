export default async function handler(req, res) {
  const { url } = req.query

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' })
  }

  // Basic validation
  try {
    new URL(url)
  } catch {
    return res.status(400).json({ error: 'Invalid URL' })
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Flowly/1.0; +https://flowly.vercel.app)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Upstream returned ${response.status}`,
      })
    }

    const html = await response.text()

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.status(200).send(html)
  } catch (err) {
    res.status(502).json({
      error: err.message || 'Failed to fetch URL',
    })
  }
}
