import axios from 'axios';
import * as cheerio from 'cheerio';

async function getInternalDocLinks(baseUrl: string): Promise<string[]> {
  const response = await axios.get(baseUrl);
  const $ = cheerio.load(response.data);
  const links = new Set<string>();

  // Find all links
  let main = $('main');
  if (main.length === 0) {
    main = $('div[role="main"], .body[role="main"]');
  }
  main.find('a[href]').each((_, element) => {
    const href = $(element).attr('href');
    if (!href) return;
    let url: string;
    try {
      url = new URL(href, baseUrl).toString();
    } catch {
      return;
    }

    if (url.startsWith(baseUrl)) {
      links.add(url);
    }
  });

  return Array.from(links);
}

export async function getAllDocLinks(baseUrl: string): Promise<string[]> {
  // try sitemap.xml at current path first, then at origin
  const sitemapUrls = [
    baseUrl.endsWith('/') ? new URL('sitemap.xml', baseUrl).toString() : new URL(`${baseUrl}/sitemap.xml`).toString(),
    new URL('sitemap.xml', new URL(baseUrl).origin).toString()
  ];

  for (const sitemapUrl of sitemapUrls) {
    try {
      const response = await axios.get(sitemapUrl, { timeout: 5000 });
      if (response.status === 200 && response.data) {
        const urls: string[] = [];
        const $ = cheerio.load(response.data, { xmlMode: true });
        $('url > loc').each((_, el) => {
          const url = $(el).text().trim();
          // Only include URLs that are within the baseUrl scope
          if (url.startsWith(baseUrl)) {
            urls.push(url);
          }
        });
        if (urls.length > 0) return urls;
      }
    } catch (e) {
      // ignore and try next sitemap URL
    }
  }
  
  return getInternalDocLinks(baseUrl);
}
