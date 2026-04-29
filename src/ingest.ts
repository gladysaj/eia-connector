import { ExternalConnectors } from "@microsoft/microsoft-graph-types";
import { getClient } from "./graphClient";
import { Config } from "./models/Config";
import { getAllItems } from "./services/itemsService";
import { getExternalItemFromItem } from "./custom/getExternalItemFromItem";
import { delay } from "./utils";

const client = getClient();

const PUT_DELAY_MS = 1_000;    // 1 request/sec baseline — Graph connector API is strict
const RETRY_BASE_MS = 60_000;  // base wait on 429; doubles each retry (exponential backoff)
const MAX_RETRIES = 5;

/**
 * Loads a single item into the Graph connector, retrying on 429 rate-limit responses.
 */
async function loadContent(config: Config, item: ExternalConnectors.ExternalItem): Promise<void> {
  const itemId = item.id;
  delete item.id;

  const url = `/external/connections/${config.connector.id}/items/${itemId}`;
  config.context.log(`PUT ${url}`);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await client.api(url).header("content-type", "application/json").put(item);
      return;
    } catch (e) {
      if (e.statusCode === 429 && attempt < MAX_RETRIES) {
        const retryAfterSec = e.headers?.["retry-after"];
        const waitMs = retryAfterSec
          ? parseInt(retryAfterSec, 10) * 1000
          : RETRY_BASE_MS * Math.pow(2, attempt - 1); // 60s, 120s, 240s...
        config.context.warn(
          `Rate limited on ${itemId} — waiting ${waitMs / 1000}s before retry ${attempt} of ${MAX_RETRIES - 1}...`
        );
        await delay(waitMs);
        continue;
      }
      config.context.error(`Failed to load ${itemId}: ${e.message}`);
      if (e.body) {
        config.context.error(`${JSON.parse(e.body, null)?.innerError?.message ?? ""}`);
      }
      return;
    }
  }
}

/**
 * Ingests all items from the API into the Graph connector, one at a time with throttling.
 */
export async function ingestContent(config: Config, since?: Date): Promise<void> {
  let count = 0;
  for await (const item of getAllItems(config, since)) {
    const transformedItem = getExternalItemFromItem(item);
    await loadContent(config, transformedItem);
    count++;
    await delay(PUT_DELAY_MS);
    if (count % 100 === 0) {
      config.context.log(`Ingested ${count} items so far...`);
    }
  }
  config.context.log(`Ingestion complete. Total items ingested: ${count}`);
}