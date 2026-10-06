// Like task2, but the store resets the flag's stock within seconds of a restock, so a single
// restock is gone before checkout loads. This keeps topping it back up (to 1, or the number you pass) for a couple of
// minutes while you check out. Stop it with Ctrl+C once the order is placed.
import { gql, storeUrl } from "./shopify.js";

const DURATION_MS = 120_000;
const INTERVAL_MS = 500;
const TARGET = Number(process.argv[2] ?? 1); // e.g. `npm run task2:hold -- 300`

const read = async () => {
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
  return {
    variantId: variant.legacyResourceId,
    inventoryItemId: variant.inventoryItem.id,
    locationId: level.location.id,
    available: level.quantities[0].quantity,
  };
};

const restock = async ({ inventoryItemId, locationId, available }) => {
  const { inventoryAdjustQuantities: r } = await gql(
    `mutation ($input: InventoryAdjustQuantitiesInput!) {
      inventoryAdjustQuantities(input: $input) { userErrors { message } }
    }`,
    { input: { name: "available", reason: "correction", changes: [{ inventoryItemId, locationId, delta: TARGET - available }] } },
  );
  if (r.userErrors.length) throw new Error(r.userErrors[0].message);
};

const first = await read();
console.log(`Check out here now (store password: shopify):\n${storeUrl}/cart/${first.variantId}:1`);
console.log(`Holding stock at ${TARGET} for ${DURATION_MS / 1000}s. Press Ctrl+C after the order is placed.\n`);

const start = performance.now();
let restocks = 0;
while (performance.now() - start < DURATION_MS) {
  const flag = await read();
  if (flag.available < Math.max(1, TARGET / 2)) { // top up before it reaches 0
    await restock(flag);
    restocks++;
    console.log(`${((performance.now() - start) / 1000).toFixed(1)}s  restocked to ${TARGET} (was ${flag.available})`);
  }
  await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
}
console.log(`\nDone. Restocked ${restocks} times.`);
