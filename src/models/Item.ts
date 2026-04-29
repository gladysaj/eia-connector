// [Customization point]
// If you need additional properties in the item object, you can add them here
/**
 * Represents a single EIA electric power operational data record.
 * This is an internal representation before translation into a Graph API ExternalItem.
 */
export interface Item {
  id: string;
  period: string;             // YYYY-MM
  location: string;           // State/census region code
  stateDescription: string;
  sectorid: string;
  sectorDescription: string;
  fueltypeid: string;
  fuelTypeDescription: string;
  ashContent: string | null;      // Average ash content (percent)
  consumptionForEg: string | null; // Consumption for electricity generation (thousand short tons)
  costPerBtu: string | null;       // Average cost (dollars per million Btu)
  title: string;
  content: string;
  url: string;
  lastModified: string;           // ISO 8601 datetime derived from period
}
