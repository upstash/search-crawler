import { Search } from "@upstash/search";
import { spinner } from '@clack/prompts';
import chalk from 'chalk';
import { getAllDocLinks } from './crawler/linkFinder';
import { crawlDocumentation } from './crawler/extractor';
import { upsertToUpstash, compareWithExistingData } from './crawler/indexer';
import { CrawlerOptions, CrawlerResult } from './types';

export type { CrawlerOptions, CrawlerResult } from './types';

let upstashClient: Search;
let index: any;

// main library function
export async function crawlAndIndex(options: CrawlerOptions): Promise<CrawlerResult> {
  try {
    const { upstashUrl, upstashToken, indexName = 'default', docUrl, silent = true } = options;

    upstashClient = new Search({
      url: upstashUrl,
      token: upstashToken,
    });
    index = upstashClient.index(indexName);

    // Start crawling
    const s = silent ? null : spinner();
    if (s) s.start(chalk.cyan('Crawling documentation'));

    const links = await getAllDocLinks(docUrl);
    if (!links.includes(docUrl)) links.unshift(docUrl);
    
    if (s) s.message(chalk.cyan(`Found ${links.length} pages to crawl. Starting`));

    const results = [];
    if (s) {
      // With progress messages
      for (let i = 0; i < links.length; i++) {
        const link = links[i];
        s.message(chalk.cyan(`Crawling ${i + 1}/${links.length}: ${link}`));
        const contents = await crawlDocumentation(link);
        results.push(...contents);
      }
    } else {
      // Silent mode
      for (let i = 0; i < links.length; i++) {
        const link = links[i];
        const contents = await crawlDocumentation(link);
        results.push(...contents);
      }
    }

    if (s) s.message(chalk.cyan(`Crawled ${results.length} content sections. Fetching existing data`));
    const newContents = await compareWithExistingData(results, index, s);
    
    if (newContents.length > 0) {
      if (s) s.message(chalk.cyan(`Found ${newContents.length} new records. Upserting to Upstash`));
      await upsertToUpstash(newContents, index);
      if (s) s.stop(chalk.green(`✅ Successfully crawled and upserted ${newContents.length} new records!`));
      
      return {
        success: true,
        newRecordsCount: newContents.length,
        totalRecordsCount: results.length
      };
    } else {
      return {
        success: true,
        newRecordsCount: 0,
        totalRecordsCount: results.length
      };
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      success: false,
      newRecordsCount: 0,
      totalRecordsCount: 0,
      error: errorMessage
    };
  }
}

