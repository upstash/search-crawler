export interface CrawledContent {
  url: string;
  title: string;
  content: string;
  path: string;
}

export interface UpstashConfig {
  url: string;
  token: string;
}

export interface CrawlerOptions {
  upstashUrl: string;
  upstashToken: string;
  indexName?: string;
  docUrl: string;
}

export interface CrawlerResult {
  success: boolean;
  newRecordsCount: number;
  totalRecordsCount: number;
  error?: string;
}
