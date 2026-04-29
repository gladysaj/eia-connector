import { InvocationContext } from "@azure/functions";
import { ExternalConnectors } from "@microsoft/microsoft-graph-types";

// [Customization point]
// If you need additional properties in the configuration object, you can add them here
/**
 * Represents the configuration object for the EIA Electricity connector.
 */
export interface Config {
  context: InvocationContext;
  clientId: string;
  connector: {
    id: string;
    name: string;
    description: string;
    schema: ExternalConnectors.Schema;
    template: any;
    apiKey: string;       // EIA API key from https://www.eia.gov/opendata/
    startPeriod: string;  // YYYY-MM — earliest period to ingest on full crawl (e.g. "2020-01")
  };
}
