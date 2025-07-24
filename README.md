# @upstash/search-crawler

A CLI tool and library to crawl documentation sites and create a search index for Upstash Search.

## Features
- Crawls documentation websites and extracts content
- Creates a search index in Upstash Search
- Fast crawling for static content docs
- Available as both CLI tool and library

## Usage

### CLI Usage

You can run the CLI directly using `npx` (no installation required):

```sh
npx @upstash/search-crawler
```

Or with command-line options:

```sh
npx @upstash/search-crawler \
  --upstash-url "UPSTASH_SEARCH_REST_URL" \
  --upstash-token "UPSTASH_SEARCH_REST_TOKEN" \
  --index-name "my-index" \
  --doc-url "https://example.com/docs"
```

You will be prompted for any missing options:
- Your Upstash Search URL
- Your Upstash Search token
- (Optional) Custom index name
- The documentation URL to crawl

The tool will:
1. Discover all internal documentation links
2. Crawl each page and extract content
3. Keep track of the new or obsolete data
4. Upsert the new records into your Upstash Search index

### Library Usage

You can also use this as a library in your own code:

```typescript
import { crawlAndIndex, type CrawlerOptions, type CrawlerResult } from '@upstash/search-crawler';

const options: CrawlerOptions = {
  upstashUrl: 'UPSTASH_SEARCH_REST_URL',
  upstashToken: 'UPSTASH_SEARCH_REST_TOKEN',
  indexName: 'my-docs',
  docUrl: 'https://example.com/docs',
  silent: true // no console output
};

const result: CrawlerResult = await crawlAndIndex(options);
```


## Obtaining Upstash Credentials

1. Go to your [Upstash Console](https://console.upstash.com/).
2. Select your Search index.
3. Under the **Details** section, copy your `UPSTASH_SEARCH_REST_URL` and `UPSTASH_SEARCH_REST_TOKEN`.
