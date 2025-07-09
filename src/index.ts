import { Command } from "commander"
import { Search } from "@upstash/search";
import { intro, outro, text, confirm, spinner, isCancel } from '@clack/prompts';
import chalk from 'chalk';
import { getAllDocLinks } from './crawler/linkFinder';
import { crawlDocumentation } from './crawler/extractor';
import { upsertToUpstash, compareWithExistingData } from './crawler/indexer';

let upstashClient: Search;
let index: any;

async function main() {
  const program = new Command();

  program
  .option("--upstash-url <url>", "Upstash URL")
  .option("--upstash-token <token>", "Upstash Token")
  .option("--index-name <name>", "Index Name")
  .option("--doc-url <url>", "Documentation URL")
  .parse(process.argv)
  const options = program.opts()

  intro(chalk.cyan('Create a search index for your documentation'));

  try {
    // Get Upstash Search credentials
    
    const upstashUrl = options?.upstashUrl ?? (await text({
      message: 'Enter your Upstash Search URL:',
      placeholder: 'https://***.upstash.io',
      validate: (value: string) => {
        if (!value) return 'URL is required';
        if (!value.startsWith('https://')) return 'URL must start with https://';
      }
    }));
    if (isCancel(upstashUrl)) {
      outro("Crawling cancelled.")
      return;
    }
  

    const upstashToken = options?.upstashToken ?? (await text({
      message: 'Enter your Upstash Search token:',
      placeholder: 'AB4FMH...',
      validate: (value: string) => {
        if (!value) return 'Token is required';
      }
    }));
    if (isCancel(upstashToken)) {
      outro("Crawling cancelled.")
      return;
    }

    // Ask for index name
    let indexName = options?.indexName ?? 'default';
    if (!options?.indexName) {
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
    }}
    if (isCancel(indexName)) {
      outro("Crawling cancelled.")
      return;
    }

    upstashClient = new Search({
      url: upstashUrl as string,
      token: upstashToken as string,
    });
    index = upstashClient.index(indexName);

    const docUrl = options?.docUrl ?? (await text({
      message: 'Enter the documentation URL to crawl:',
      placeholder: 'https://upstash.com/docs',
      validate: (value: string) => {
        if (!value) return 'URL is required';
        if (!value.startsWith('http')) return 'URL must start with http:// or https://';
      }
    }));
    if (isCancel(docUrl)) {
      outro("Crawling cancelled.")
      return;
    }
    // Confirm before starting
    if (! (options?.docUrl && options?.indexName && options?.upstashUrl && options?.upstashToken)) {
    const shouldProceed = await confirm({
      message: `Ready to crawl ${chalk.cyan(String(docUrl))} and upsert to Upstash Search index ${chalk.green(indexName)}?`
    });
    if (isCancel(shouldProceed)) {
      outro("Crawling cancelled.")
      return;
    }
  }
    // Start crawling
    const s = spinner();
    s.start(chalk.cyan('Crawling documentation'));

    const links = await getAllDocLinks(docUrl as string);
    if (!links.includes(docUrl as string)) links.unshift(docUrl as string);
    s.message(chalk.cyan(`Found ${links.length} pages to crawl. Starting`));

    const results = [];
    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      s.message(chalk.cyan(`Crawling ${i + 1}/${links.length}: ${link}`));
      const contents = await crawlDocumentation(link);
      results.push(...contents);
    }

    s.message(chalk.cyan(`Crawled ${results.length} content sections. Fetching existing data`));
    const newContents = await compareWithExistingData(results, index, s);
    if (newContents.length > 0) {
      s.message(chalk.cyan(`Found ${newContents.length} new records. Upserting to Upstash`));
      await upsertToUpstash(newContents, index);
      s.stop(chalk.green(`✅ Successfully crawled and upserted ${newContents.length} new records!`));
      outro(chalk.green(`🎉 Check your index at ${chalk.cyan("https://console.upstash.com/search")}`));
    } else {
      outro(chalk.cyan('No new contents found. Skipping upsert.'));
    }

  } catch (error) {
    outro(chalk.red('❌ Error:') + ' ' + chalk.red(error));
    outro(chalk.red('Operation failed. Please check your credentials and try again.'));
  }
}

main();
