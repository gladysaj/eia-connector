# EIA Electricity Copilot Connector

A Microsoft 365 Copilot connector that ingests U.S. electric power operational data from the [EIA Open Data API](https://www.eia.gov/opendata/) into Microsoft Graph, making it searchable in Microsoft 365 Copilot.

## What it indexes

Monthly data from **EIA Form EIA-923** covering:

- **Fuel consumption for electricity generation** (thousand short tons)
- **Average ash content of consumed fuel** (percent)
- **Average fuel cost** (dollars per million Btu)

Broken down by U.S. state/census region, sector (Electric Utility, Independent Power Producers, Combined Heat and Power), and fuel type (coal, natural gas, petroleum, renewables, and more). Data starts from January 2020 by default.

## Sample Copilot prompts

- *"What was the average cost of coal for electric utilities in the Pacific region in 2023?"*
- *"How much natural gas did Independent Power Producers consume in 2024?"*
- *"Which region had the highest coal ash content in 2022?"*
- *"Compare fuel costs between Electric Utilities and Independent Power Producers in 2023."*

## Prerequisites

- [Microsoft 365 Agents Toolkit for VS Code](https://marketplace.visualstudio.com/items?itemName=TeamsDevApp.ms-teams-vscode-extension)
- [Azure Functions VS Code extension](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-azurefunctions)
- [Node.js](https://nodejs.org/) 18, 20, or 22
- A Microsoft 365 tenant with admin access (for Entra app consent)
- A free EIA API key — register at [eia.gov/opendata](https://www.eia.gov/opendata/)

## Local setup (F5 debug)

### 1. Add your EIA API key

Create `env/.env.local.user` (gitignored) and add:

```
SECRET_EIA_API_KEY=your_eia_api_key_here
```

### 2. Optional — adjust start period

In `env/.env.local`, change `EIA_START_PERIOD` to control how far back data is ingested (default: `2020-01`). Format is `YYYY-MM`.

> **Demo tip:** The connector indexes 2,000 records by default. To change this, update `DEMO_MAX_RECORDS` in `src/custom/getAllItemsFromAPI.ts`.

### 3. Press F5

The Toolkit will:
1. Create an Entra ID app registration in your tenant
2. Prompt for admin consent — click the link in the terminal
3. Start Azurite (local storage emulator)
4. Deploy the Graph external connection and schema (~10 minutes)
5. Run the first full crawl (~20 minutes for 2,000 records)

### 4. Enable connector results in Microsoft Search

Go to [Microsoft Search admin center](https://admin.microsoft.com/#/MicrosoftSearch/connectors), find **EIA Electricity Connector**, and select **Include Connector Results**.

### 5. Test in Copilot

Open [Microsoft 365 Copilot](https://m365.cloud.microsoft/chat) and ask about electricity fuel data.

## Azure deployment

### 1. Add your EIA API key for the dev environment

Create `env/.env.dev.user` (gitignored) and add:

```
SECRET_EIA_API_KEY=your_eia_api_key_here
```

### 2. Provision Azure resources

In the M365 Agents Toolkit panel, select the `dev` environment and click **Provision**. This creates:
- Azure Function App (Consumption plan)
- Azure Storage Account
- Azure Key Vault (stores the EIA API key securely)
- Application Insights

### 3. Deploy

Click **Deploy** in the Toolkit panel.

### 4. Grant admin consent

Find the deployed Function App in the Azure portal, locate the `AZURE_CLIENT_ID` app setting, and grant tenant-wide admin consent for that app in [Entra admin center](https://entra.microsoft.com).

## Crawl schedule

| Function | Schedule | Purpose |
|---|---|---|
| `deployConnection` | Once on startup | Creates connection, schema, and runs first crawl |
| `fullCrawl` | Every 3 days at midnight | Re-ingests all records from `EIA_START_PERIOD` |
| `incrementalCrawl` | Every 3 days at noon | Ingests only records published since last crawl |

EIA publishes monthly data so a 3-day check interval is sufficient.

## Project structure

```
src/
├── custom/
│   ├── getAllItemsFromAPI.ts      ← EIA API pagination and data mapping
│   ├── getExternalItemFromItem.ts ← transforms EIA records to Graph ExternalItem
│   └── getAclFromItem.ts          ← access control (everyone by default)
├── references/
│   ├── schema.json                ← Graph connector schema (13 properties)
│   └── template.json              ← Adaptive Card result template
├── models/
│   ├── Item.ts                    ← EIA data record model
│   └── Config.ts                  ← connector configuration model
infra/
├── azure.bicep                    ← Azure infrastructure definition
└── azure.parameters.json          ← deployment parameters
env/
├── .env.local                     ← local dev variables (committed, no secrets)
├── .env.local.user                ← local secrets — gitignored, create manually
├── .env.dev                       ← Azure dev variables (committed, no secrets)
└── .env.dev.user                  ← Azure dev secrets — gitignored, create manually
```

## Customization

All customization points are marked with `[Customization point]` comments in the code.

- **Different date range:** Change `EIA_START_PERIOD` in the env file
- **Fewer/more records:** Change `DEMO_MAX_RECORDS` in `getAllItemsFromAPI.ts`
- **Add facet filters** (state, sector, fuel type): Update `buildPageUrl()` in `getAllItemsFromAPI.ts`
- **Different EIA dataset:** Update the `EIA_DATA_URL` and field mappings in `getAllItemsFromAPI.ts`

## Data source

Data is provided by the **U.S. Energy Information Administration (EIA)** via the [EIA Open Data API](https://www.eia.gov/opendata/). Usage must comply with the [EIA API Terms of Service](https://www.eia.gov/opendata/terms-of-service.php) and [Copyrights and Reuse Policy](https://www.eia.gov/about/copyrights_reuse.php). Attribution to EIA is required.