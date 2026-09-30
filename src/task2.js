// Capture the flag: the token can't create orders, but it can write inventory.
// Restock the sold-out flag, then check out on the storefront. It's free with no shipping,
// so checkout needs no payment and Shopify sends the order confirmation email.
import { gql, storeUrl } from "./shopify.js";

const { products } = await gql(`{
  products(first: 1, query: "tag:task2-flag") {
    nodes {
      variants(first: 1) {
        nodes {
          legacyResourceId
          inventoryItem {
            id
            inventoryLevels(first: 1) {
              nodes { location { id } quantities(names: ["available"]) { quantity } }
            }
          }
        }
      }
    }
  }
}`);

const variant = products.nodes[0].variants.nodes[0];
const level = variant.inventoryItem.inventoryLevels.nodes[0];
const available = level.quantities[0].quantity;

if (available < 1) {
  const { inventoryAdjustQuantities: r } = await gql(
    `mutation ($input: InventoryAdjustQuantitiesInput!) {
      inventoryAdjustQuantities(input: $input) { userErrors { message } }
    }`,
    {
      input: {
        name: "available",
        reason: "correction",
        changes: [{ inventoryItemId: variant.inventoryItem.id, locationId: level.location.id, delta: 1 - available }],
      },
    },
  );
  if (r.userErrors.length) throw new Error(r.userErrors[0].message);
  console.log(`Restocked flag (was ${available})`);
} else {
  console.log(`Flag already has ${available} available`);
}

console.log(`Check out here (store password: shopify):\n${storeUrl}/cart/${variant.legacyResourceId}:1`);
