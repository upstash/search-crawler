import { crawlAndIndex } from './dist/index.js';

console.log('Testing library import...');
console.log('process.argv[1]:', process.argv[1]);

// This should NOT run the CLI
const result = await crawlAndIndex({
  upstashUrl: 'https://test.upstash.io',
  upstashToken: 'test-token',
  docUrl: 'https://example.com',
  silent: true
});

console.log('Library import successful:', result); 