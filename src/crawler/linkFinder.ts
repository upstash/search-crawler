import axios from 'axios';
import * as cheerio from 'cheerio';

export async function getInternalDocLinks(baseUrl: string): Promise<string[]> {
  const response = await axios.get(baseUrl);
  const $ = cheerio.load(response.data);
  const links = new Set<string>();
  
  const urlObj = new URL(baseUrl);
  const domain = urlObj.origin;
  
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
