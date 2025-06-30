import axios from 'axios';
import * as cheerio from 'cheerio';
import { CrawledContent } from '../types';
import { cleanTextContent } from '../utils/cleanText';
import chalk from 'chalk';

export async function crawlDocumentation(url: string): Promise<CrawledContent[]> {
  try {
    const response = await axios.get(url);
    if (response.status !== 200) {
      throw new Error(chalk.red(`Failed to crawl: ${url} - Status: ${response.status}`));
    }
    const $ = cheerio.load(response.data);
    const results: CrawledContent[] = [];

    // Remove non-content elements
    $('script, style, nav, footer, .nav, .sidebar, .menu, .footer, .sidebar-group, a').remove();

    let main = $('main');
    if (main.length === 0) {
      main = $('div[role="main"], .body[role="main"]');
    }
    const baseTitle = main.find('h1, h2').first().text().trim();

    // Find all heading elements up to h3
    const headings = main.find('h1, h2, h3');
    if (headings.length > 0) {
      headings.each((index, element) => {
        const $heading = $(element);
        const headingText = $heading.text().trim();
        const headingId = $heading.attr('id');
        const content = $heading.nextUntil('h1, h2, h3').text().trim();
        const cleanContent = cleanTextContent(content);
        if (cleanContent) {
          const sectionUrl = headingId ? `${url}#${headingId}` : url;
          const sectionPath = headingId ? `${url.replace(new URL(url).origin, '')}#${headingId}` : url.replace(new URL(url).origin, '');
          results.push({
            url: sectionUrl,
            title: headingText || baseTitle,
            content: cleanContent,
            path: sectionPath
          });
        }
      });
    }
    return results;
  } catch (error) {
    throw new Error(chalk.red(`Error crawling: ${url} - ${error}`));
  }
}
