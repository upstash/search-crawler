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
        let content = '';
        // check if heading is inside a <header>
        const headerParent = $heading.parents('header').first();
        if (headerParent.length > 0) {
          let contentContainer = null;

          const contentSelectors = ['.mdx-content', '.content', '.main-content', '[class*="content"]'];
          for (const selector of contentSelectors) {
            contentContainer = headerParent.nextAll(selector).first();
            if (contentContainer.length > 0) break;
          }

          if (!contentContainer || contentContainer.length === 0) {
            headerParent.nextAll().each((i, elem) => {
              const $elem = $(elem);
              const textContent = $elem.text().trim();
              if (textContent.length > 50) {
                contentContainer = $elem;
                return false;
              }
            });
          }

          if (contentContainer && contentContainer.length > 0) {
            // get content until the first heading in the container
            let contentText = '';
            contentContainer.contents().each((i, elem) => {
              const $elem = $(elem);
              if ($elem.is('h1, h2, h3')) {
                return false;
              }
              contentText += $elem.text() + ' ';
            });
            content = contentText.trim();
          }
        } else {
          // default: get all siblings until the next heading
          content = $heading.nextUntil('h1, h2, h3').text().trim();
        }
        const cleanContent = cleanTextContent(content);
        if (cleanContent) {
          let sectionUrl, sectionPath;

          // For headings inside header, use base URL 
          if (headerParent && headerParent.length > 0) {
            sectionUrl = url;
            sectionPath = url.replace(new URL(url).origin, '');
          } else {
            sectionUrl = headingId ? `${url}#${headingId}` : url;
            sectionPath = headingId ? `${url.replace(new URL(url).origin, '')}#${headingId}` : url.replace(new URL(url).origin, '');
          }

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
