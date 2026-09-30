// Top 50 spenders tagged task1 + level:3, as CSV.
//
// There's no "amount spent" sort key and ~28k matching customers (a full scan takes ~100s),
// so we let search filter instead: find a `total_spent:>=T` whose results hold at least 50
// customers but fit in one page. Each round probes 20 thresholds in parallel and narrows the range.
import { writeFileSync } from "node:fs";
import { gql } from "./shopify.js";

const LIMIT = 50;

const probe = async (min) => {
  const { customers } = await gql(
    `query ($q: String!) {
      customers(first: 250, query: $q) {
        pageInfo { hasNextPage }
        nodes { displayName email amountSpent { amount } }
      }
    }`,
    { q: `tag:task1 AND tag:"level:3" AND total_spent:>=${min}` },
  );
  return { min, tooMany: customers.pageInfo.hasNextPage, customers: customers.nodes };
};

const start = performance.now();
let lo = 0; // gives more than one page
let hi = 1_000_000; // assumed to give fewer than LIMIT
let found;

while (!found) {
  const step = (hi - lo) / 20;
  const probes = await Promise.all(Array.from({ length: 20 }, (_, i) => probe(Math.round(lo + step * i))));
  found = probes.find((p) => !p.tooMany && p.customers.length >= LIMIT);
  lo = Math.max(...probes.filter((p) => p.tooMany).map((p) => p.min), lo);
  hi = Math.min(...probes.filter((p) => !p.tooMany).map((p) => p.min), hi);
}

const rows = found.customers
  .map((c) => ({ customer: `${c.displayName} (${c.email})`, spend: Number(c.amountSpent.amount) }))
  .sort((a, b) => b.spend - a.spend)
  .slice(0, LIMIT)
  .map((r) => `"${r.customer.replace(/"/g, '""')}",${r.spend.toFixed(2)}`);

writeFileSync("data/top_50_spenders.csv", ["Customer,Spend", ...rows].join("\n") + "\n");
console.log(`Wrote ${rows.length} rows in ${((performance.now() - start) / 1000).toFixed(2)}s`);
