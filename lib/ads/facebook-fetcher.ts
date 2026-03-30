export interface FacebookAdInfo {
  adId: string
  title: string | null
  description: string | null
  imageUrl: string | null
  videoUrl: string | null
  pageUrl: string
  pageName: string | null
  startDate: string | null
  status: string | null
}

/**
 * Extract ad ID from various Facebook Ad Library URL formats.
 * Handles:
 *   https://www.facebook.com/ads/library/?id=1612887649882933
 *   https://www.facebook.com/ads/library/?id=1612887649882933&...
 */
export function extractAdId(url: string): string | null {
  const match = url.match(/[?&]id=(\d+)/)
  return match ? match[1] : null
}

function extractMeta(html: string, property: string): string | null {
  // Match <meta property="og:image" content="...">
  const regex = new RegExp(
    `<meta\\s+(?:property|name)=["']${property}["']\\s+content=["']([^"']+)["']`,
    "i"
  )
  const match = html.match(regex)
  if (match) return decodeHTMLEntities(match[1])

  // Also try reversed order: content before property
  const regex2 = new RegExp(
    `<meta\\s+content=["']([^"']+)["']\\s+(?:property|name)=["']${property}["']`,
    "i"
  )
  const match2 = html.match(regex2)
  return match2 ? decodeHTMLEntities(match2[1]) : null
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
}

/**
 * Fetch ad info from the Facebook Ad Library page.
 * Strategy: Fetch the page HTML and extract Open Graph meta tags.
 */
export async function fetchFacebookAdInfo(
  url: string
): Promise<FacebookAdInfo | null> {
  const adId = extractAdId(url)
  if (!adId) return null

  const emptyResult: FacebookAdInfo = {
    adId,
    title: null,
    description: null,
    imageUrl: null,
    videoUrl: null,
    pageUrl: url,
    pageName: null,
    startDate: null,
    status: null,
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) return emptyResult

    const html = await response.text()

    const ogImage = extractMeta(html, "og:image")
    const ogTitle = extractMeta(html, "og:title")
    const ogDescription = extractMeta(html, "og:description")
    const ogVideo =
      extractMeta(html, "og:video") || extractMeta(html, "og:video:url")

    return {
      adId,
      title: ogTitle,
      description: ogDescription,
      imageUrl: ogImage,
      videoUrl: ogVideo,
      pageUrl: url,
      pageName: extractMeta(html, "og:site_name"),
      startDate: null,
      status: null,
    }
  } catch (error) {
    console.error("Failed to fetch Facebook Ad:", error)
    return emptyResult
  }
}
