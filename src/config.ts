import { InvocationContext } from "@azure/functions";
import schema from "./references/schema.json";
import template from "./references/template.json";
import { Config } from "./models/Config";
import { ExternalConnectors } from "@microsoft/microsoft-graph-types";

const disallowedConnectorIds = [
  "Microsoft",
  "None",
  "Directory",
  "Exchange",
  "ExchangeArchive",
  "LinkedIn",
  "Mailbox",
  "OneDriveBusiness",
  "SharePoint",
  "Teams",
  "Yammer",
  "Connectors",
  "TaskFabric",
  "PowerBI",
  "Assistant",
  "TopicEngine",
  "MSFT_All_Connectors",
];

// [Customization point]
// If you need additional logic to initialize configuration or validation, you can add them here
/**
 * Builds the configuration object based on environment variables.
 */
export function initConfig(context: InvocationContext): Config {
  const config = {
    context: context,
    clientId: process.env.AZURE_CLIENT_ID,
    connector: {
      id: `${process.env.CONNECTOR_ID}`,
      name: process.env.CONNECTOR_NAME,
      description: process.env.CONNECTOR_DESCRIPTION,
      schema: schema as ExternalConnectors.Schema,
      template: template,
      apiKey: process.env.EIA_API_KEY,
      startPeriod: process.env.EIA_START_PERIOD ?? "2020-01",
    },
  };
  validateConfig(config);
  context.log("Configuration object initialized");

  return config;
}

// [Customization point]
// If you need additional validation logic, you can add it here
/**
 * Validates the configuration object.
 * @param {Config} config - The configuration object to validate.
 */
export function validateConfig(config: Config): void {
  if (!config.clientId) {
    throw new Error("Invalid configuration: Missing clientId");
  }
  if (!config.connector.id) {
    throw new Error("Invalid configuration: Missing connector id");
  }
  if (!config.connector.name) {
    throw new Error("Invalid configuration: Missing connector name");
  }
  if (!config.connector.description) {
    throw new Error("Invalid configuration: Missing connector description");
  }
  if (!config.connector.schema) {
    throw new Error("Invalid configuration: Missing connector schema");
  }
  if (!config.connector.template) {
    throw new Error("Invalid configuration: Missing connector template");
  }
  if (!config.connector.apiKey) {
    throw new Error("Invalid configuration: Missing EIA_API_KEY. Register at https://www.eia.gov/opendata/");
  }
  if (!/^\d{4}-\d{2}$/.test(config.connector.startPeriod)) {
    throw new Error("Invalid configuration: EIA_START_PERIOD must be in YYYY-MM format (e.g. 2020-01)");
  }
  validateConnectorId(config.connector.id);
}

/**
 * Validates the connector ID.
 * @param {string} id - The connector ID to validate.
 * @throws {Error} If the connector ID is invalid.
 */
export function validateConnectorId(id: string): void {
  if (!id) throw new Error("Connector ID is required.");
  if (id.length < 3 || id.length > 32) {
    throw new Error("Connector ID must be between 3 and 32 characters long.");
  }
  if (!/^[a-zA-Z0-9]+$/.test(id)) {
    throw new Error("Connector ID must contain only alphanumeric characters.");
  }
  if (disallowedConnectorIds.some((item) => id.toLowerCase().startsWith(item.toLowerCase()))) {
    throw new Error(`Connector ID cannot start with: ${disallowedConnectorIds.join(", ")}.`);
  }
}
