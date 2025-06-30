import { Search } from "@upstash/search";
import { intro, outro, text, confirm, spinner, isCancel } from '@clack/prompts';
import chalk from 'chalk';
import { getInternalDocLinks } from './crawler/linkFinder';
import { crawlDocumentation } from './crawler/extractor';
import { upsertToUpstash } from './crawler/indexer';

let upstashClient: Search;
let index: any;

async function main() {
  intro(chalk.cyan('Create a search index for your documentation'));

  try {
    // Get Upstash Search credentials
    const upstashUrl = await text({
      message: 'Enter your Upstash Search URL:',
      placeholder: 'https://***.upstash.io',
      validate: (value: string) => {
        if (!value) return 'URL is required';
        if (!value.startsWith('https://')) return 'URL must start with https://';
      }
    });
    if (isCancel(upstashUrl)) {
      outro("Crawling cancelled.")
      return;
    }

    const upstashToken = await text({
      message: 'Enter your Upstash Search token:',
      placeholder: 'AB4FMH...',
      validate: (value: string) => {
        if (!value) return 'Token is required';
      }
    });
    if (isCancel(upstashToken)) {
      outro("Crawling cancelled.")
      return;
    }

    // Ask for index name
    let indexName = 'default';
    const useDefaultIndex = await confirm({
      message: `Use the default index name (${chalk.green('default')})?`
    });
    if (!useDefaultIndex) {
      const customIndex = await text({
        message: 'Enter your custom index name:',
        placeholder: 'my-index',
        validate: (value: string) => {
          if (!value) return 'Index name is required';
        }
      });
      indexName = customIndex as string;
    }
    if (isCancel(indexName)) {
      outro("Crawling cancelled.")
      return;
    }

    upstashClient = new Search({
      url: upstashUrl as string,
      token: upstashToken as string,
    });
    index = upstashClient.index(indexName);

    const docUrl = await text({
      message: 'Enter the documentation URL to crawl:',
      placeholder: 'https://upstash.com/docs',
      validate: (value: string) => {
        if (!value) return 'URL is required';
        if (!value.startsWith('http')) return 'URL must start with http:// or https://';
      }
    });
    if (isCancel(docUrl)) {
      outro("Crawling cancelled.")
      return;
    }
    // Confirm before starting
    const shouldProceed = await confirm({
      message: `Ready to crawl ${chalk.cyan(String(docUrl))} and upsert to Upstash Search index ${chalk.green(indexName)}?`
    });
    if (isCancel(shouldProceed)) {
      outro("Crawling cancelled.")
      return;
    }   

    // Start crawling
    const s = spinner();
    s.start(chalk.cyan('Crawling documentation'));

    const links = await getInternalDocLinks(docUrl as string);
    if (!links.includes(docUrl as string)) links.unshift(docUrl as string);
    s.message(chalk.cyan(`Found ${links.length} pages to crawl. Starting...`));

    const results = [];
    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      s.message(chalk.cyan(`Crawling ${i + 1}/${links.length}: ${link}`));
      const contents = await crawlDocumentation(link);
      results.push(...contents);
    }

    s.message(chalk.cyan(`Crawled ${results.length} content sections. Upserting to Upstash`));
    await upsertToUpstash(results, index);
    s.stop(chalk.green(`✅ Successfully crawled and upserted ${results.length} records!`));
    outro(chalk.green(`🎉 Success! Check your index at ${chalk.cyan("https://console.upstash.com/search")}`));
  } catch (error) {
    outro(chalk.red('❌ Error:') + ' ' + chalk.red(error));
    outro(chalk.red('Operation failed. Please check your credentials and try again.'));
  }
}

main();
