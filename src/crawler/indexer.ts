import { CrawledContent } from '../types';
import chalk from 'chalk';

export async function upsertToUpstash(data: CrawledContent[], index: any): Promise<void> {
  try {
    const batchSize = 100;
    let totalUpserted = 0;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const upstashBatch = batch.map((item, idx) => {
        const id = `${item.path.replace(/[^a-zA-Z0-9]/g, '_')}_${idx}`;
        const content = {
          title: item.title,
          fullContent: item.content.substring(0, 1200),
        };
        const metadata = {
          url: item.url,
          path: item.path,
          contentLength: item.content.length,
          crawledAt: new Date().toISOString()
        };
        return { id, content, metadata };
      });
      await index.upsert(upstashBatch);
      totalUpserted += batch.length;
    }
  } catch (error) {
    throw new Error(chalk.red('Error upserting to Upstash:') + ' ' + chalk.red(error));
  }
}
