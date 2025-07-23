import { CrawledContent } from "../types";
import chalk from "chalk";
import crypto from "crypto";

export async function upsertToUpstash(
  data: CrawledContent[],
  index: any
): Promise<void> {
  try {
    const batchSize = 100;
    let totalUpserted = 0;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const upstashBatch = batch.map((item, idx) => {
        const id = crypto
          .createHash("md5")
          .update(item.url + item.title + item.content)
          .digest("hex");
        const content = {
          title: item.title,
          fullContent: item.content.substring(0, 1200),
        };
        const metadata = {
          url: item.url,
          path: item.path,
          contentLength: item.content.length,
          crawledAt: new Date().toISOString(),
        };
        return { id, content, metadata };
      });
      await index.upsert(upstashBatch);
      totalUpserted += batch.length;
    }
  } catch (error) {
    throw new Error(
      chalk.red("Error upserting to Upstash:") + " " + chalk.red(error)
    );
  }
}

export async function compareWithExistingData(
  currentData: CrawledContent[],
  index: any,
  s: any
): Promise<CrawledContent[]> {
  try {
    let cursor = 0;
    const limit = 100;
    let allDocIds: string[] = [];
    while (true) {
      const { nextCursor, documents } = await index.range({
        cursor,
        limit,
        prefix: "",
      });
      allDocIds = allDocIds.concat(documents.map((doc: any) => doc.id));
      if (!nextCursor) break;
      cursor = nextCursor;
    }

    const currentLookupKeys = new Set(
      currentData.map((item) =>
        crypto
          .createHash("md5")
          .update(item.url + item.title + item.content)
          .digest("hex")
      )
    );
    // remove obsolete items
    const obsoleteIds: string[] = [];
    for (const docId of allDocIds) {
      if (!currentLookupKeys.has(docId)) {
        obsoleteIds.push(docId);
      }
    }
    if (obsoleteIds.length > 0) {
      await batchDelete(obsoleteIds, index, s);
    }
    // return only new or changed items
    const allDocIdSet = new Set(allDocIds);
    const newOrChangedItems = currentData.filter((item) => {
      const hash = crypto
        .createHash("md5")
        .update(item.url + item.title + item.content)
        .digest("hex");
      return !allDocIdSet.has(hash);
    });
    return newOrChangedItems;
  } catch (error) {
    throw new Error(error as string);
  }
}

async function batchDelete(ids: string[], index: any, s: any): Promise<void> {
  const batchSize = 100;
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    await index.delete({ ids: batch });
  }
}
