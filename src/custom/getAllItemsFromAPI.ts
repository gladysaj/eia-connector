import { Config } from "../models/Config";
import { Item } from "../models/Item";

const EIA_DATA_URL =
  "https://api.eia.gov/v2/electricity/electric-power-operational-data/data";

// Limit for demo purposes — set to a larger value or remove for production use
const DEMO_MAX_RECORDS = 2000;
const PAGE_SIZE = DEMO_MAX_RECORDS;

interface EiaRecord {
  period: string;
  location: string;
  stateDescription: string;
  sectorid: string;
  sectorDescription: string;
  fueltypeid: string;
  fuelTypeDescription: string;
  "ash-content": string | null;
  "ash-content-units": string;
  "consumption-for-eg": string | null;
  "consumption-for-eg-units": string;
  "cost-per-btu": string | null;
  "cost-per-btu-units": string;
}

interface EiaResponse {
  response: {
    total: number;
    data: EiaRecord[];
  };
}

function buildPageUrl(apiKey: string, startPeriod: string, offset: number): string {
  return (
    `${EIA_DATA_URL}?frequency=monthly` +
    `&data[]=ash-content&data[]=consumption-for-eg&data[]=cost-per-btu` +
    `&sort[0][column]=period&sort[0][direction]=desc` +
    `&start=${startPeriod}` +
    `&offset=${offset}&length=${PAGE_SIZE}` +
    `&api_key=${apiKey}`
  );
}

function periodToIso(period: string): string {
  return `${period}-01T00:00:00Z`;
}

function buildItemUrl(record: EiaRecord): string {
  return (
    `https://www.eia.gov/opendata/browser/electricity/electric-power-operational-data` +
    `?frequency=monthly&data=ash-content;consumption-for-eg;cost-per-btu;` +
    `&facets=location;sectorid;fueltypeid;` +
    `&location=${record.location}&sectorid=${record.sectorid}&fueltypeid=${record.fueltypeid}` +
    `&start=${record.period}&end=${record.period}` +
    `&sortColumn=period;&sortDirection=desc;`
  );
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatPeriod(period: string): string {
  const parts = period.split("-");
  const monthIndex = parseInt(parts[1], 10) - 1;
  return `${MONTH_NAMES[monthIndex]} ${parts[0]}`;
}

function buildNaturalLanguageContent(record: EiaRecord): string {
  const periodLabel = formatPeriod(record.period);
  const sentences: string[] = [];

  // Opening: who, when, where, what fuel
  if (record["consumption-for-eg"] != null && record["consumption-for-eg"] !== "0") {
    sentences.push(
      `In ${periodLabel}, the ${record.stateDescription} region's ${record.sectorDescription} sector ` +
      `consumed ${record["consumption-for-eg"]} ${record["consumption-for-eg-units"]} of ` +
      `${record.fuelTypeDescription} for electricity generation.`
    );
  } else {
    sentences.push(
      `In ${periodLabel}, the ${record.stateDescription} region's ${record.sectorDescription} sector ` +
      `reported electricity generation data for ${record.fuelTypeDescription}.`
    );
  }

  // Ash content quality metric
  if (record["ash-content"] != null) {
    sentences.push(
      `The average ash content of the consumed ${record.fuelTypeDescription} was ` +
      `${record["ash-content"]} ${record["ash-content-units"]}, ` +
      `indicating the mineral impurity level of the fuel.`
    );
  }

  // Cost metric
  if (record["cost-per-btu"] != null) {
    sentences.push(
      `The average cost of fuel delivered to this sector was ` +
      `${record["cost-per-btu"]} ${record["cost-per-btu-units"]}.`
    );
  }

  // Source context for Copilot grounding
  sentences.push(
    `This data is reported monthly by the U.S. Energy Information Administration (EIA) ` +
    `via Form EIA-923, covering electric power operations across all U.S. states and census regions.`
  );

  return sentences.join(" ");
}

function mapRecord(record: EiaRecord): Item {
  const id = `eia_${record.period}_${record.location}_${record.sectorid}_${record.fueltypeid}`;
  const title = `${record.fuelTypeDescription} - ${record.stateDescription} (${record.period})`;

  return {
    id,
    period: record.period,
    location: record.location,
    stateDescription: record.stateDescription,
    sectorid: record.sectorid,
    sectorDescription: record.sectorDescription,
    fueltypeid: record.fueltypeid,
    fuelTypeDescription: record.fuelTypeDescription,
    ashContent: record["ash-content"],
    consumptionForEg: record["consumption-for-eg"],
    costPerBtu: record["cost-per-btu"],
    title,
    content: buildNaturalLanguageContent(record),
    url: buildItemUrl(record),
    lastModified: periodToIso(record.period),
  };
}

// [Customization point]
// Add facet filters (location, sectorid, fueltypeid) to buildPageUrl to narrow results.
// See: https://www.eia.gov/opendata/documentation.php
/**
 * Yields all EIA electric power operational data records page by page.
 * @param config - Connector configuration (apiKey, startPeriod).
 * @param since  - Optional date; if provided, only fetches periods on or after this date.
 */
export async function* getAllItemsFromAPI(
  config: Config,
  since?: Date
) {
  const m = since ? since.getMonth() + 1 : 0;
  const startPeriod = since
    ? `${since.getFullYear()}-${m < 10 ? "0" + m : m}`
    : config.connector.startPeriod;

  let offset = 0;
  let total: number | null = null;
  let yielded = 0;

  while (total === null || offset < total) {
    const url = buildPageUrl(config.connector.apiKey, startPeriod, offset);
    config.context.log(
      `Fetching EIA data: startPeriod=${startPeriod}, offset=${offset}, yielded=${yielded}`
    );

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch EIA data (offset=${offset}): ${response.status} ${response.statusText}`
      );
    }

    const body: EiaResponse = await response.json();

    if (total === null) {
      total = Math.min(body.response.total, DEMO_MAX_RECORDS);
      config.context.log(`EIA dataset total: ${body.response.total}. Capped at ${DEMO_MAX_RECORDS} for this demo.`);
    }

    const records = body.response.data;
    if (records.length === 0) break;

    for (const record of records) {
      yield mapRecord(record);
      yielded++;
      if (yielded >= DEMO_MAX_RECORDS) return;
    }

    offset += records.length;
  }
}