import { Item } from "../models/Item";
import { ExternalConnectors } from "@microsoft/microsoft-graph-types";
import { getAclFromITem } from "./getAclFromItem";

// [Customization point]
// If there is additional logic to transform the item, you can add it here.
// See: https://learn.microsoft.com/en-us/graph/api/resources/connectors-api-overview?view=graph-rest-1.0

/**
 * Transforms an EIA data record into a Microsoft Graph ExternalItem.
 * @param item - The EIA item to transform.
 */
export function getExternalItemFromItem(item: Item): ExternalConnectors.ExternalItem {
  return {
    id: item.id,
    properties: {
      "title@odata.type": "String",
      title: item.title,
      period: item.period,
      location: item.location,
      stateDescription: item.stateDescription,
      sectorid: item.sectorid,
      sectorDescription: item.sectorDescription,
      fueltypeid: item.fueltypeid,
      fuelTypeDescription: item.fuelTypeDescription,
      ashContent: item.ashContent ?? "",
      consumptionForEg: item.consumptionForEg ?? "",
      costPerBtu: item.costPerBtu ?? "",
      url: item.url,
      lastModified: item.lastModified,
    },
    content: {
      value: item.content,
      type: "text",
    },
    acl: getAclFromITem(item),
  } as ExternalConnectors.ExternalItem;
}