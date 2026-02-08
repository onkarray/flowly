import { supabase } from '../lib/supabase'

function getBrowserInfo() {
  const ua = navigator.userAgent
  let browser = 'Unknown'
  if (ua.includes('Firefox/')) browser = 'Firefox'
  else if (ua.includes('Edg/')) browser = 'Edge'
  else if (ua.includes('Chrome/')) browser = 'Chrome'
  else if (ua.includes('Safari/')) browser = 'Safari'

  return {
    browser,
    platform: navigator.platform,
    language: navigator.language,
    screenWidth: window.screen?.width,
    screenHeight: window.screen?.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  }
}

/**
 * Log an error to the Supabase `errors` table.
 * Fails silently — never throws.
 */
export async function logError(error, context = {}) {
  const message = error?.message || String(error)
  const stack = error?.stack || null

  // Always console.error for local debugging
  console.error('[Flowly Error]', message, context, error)

  try {
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id || null

    await supabase.from('errors').insert({
      user_id: userId,
      error_message: message.slice(0, 2000),
      error_stack: stack ? stack.slice(0, 5000) : null,
      page_url: window.location.href,
      component_name: context.componentName || null,
      user_agent: navigator.userAgent.slice(0, 500),
      browser_info: getBrowserInfo(),
    })
  } catch {
    // Supabase insert failed — already console.error'd above, nothing else to do
  }
}

/**
 * Install global error handlers. Call once at app startup.
 */
export function installGlobalErrorHandlers() {
  window.addEventListener('error', (event) => {
    logError(event.error || new Error(event.message), {
      componentName: 'window.onerror',
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason))
    logError(error, { componentName: 'unhandledrejection' })
  })
}
