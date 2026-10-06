# Sultans – Backend Case Study

Plain Node 22 with no dependencies. It uses only the Shopify Admin GraphQL API, version 2025-01.

```sh
cp .env.example .env   # fill in SHOPIFY_ADMIN_TOKEN
npm run task1          # -> data/top_50_spenders.csv
npm run task2
npm run task2:hold -- 300
```

## Task 1 – Leaderboard

About 28.7k customers are tagged `task1` + `level:3`. Shopify has no sort key for amount spent, so
paging through all of them to sort locally takes around 100 seconds.

Instead, the script narrows the search on Shopify's side with `total_spent:>=T`. It looks for a value of
`T` whose results include at least 50 customers and still fit in one page of 250. Each round tries 20
values of `T` in parallel and narrows the range between them. On this store it finishes in about 2 seconds.

## Task 2 – Capture the Flag

The API token can't create orders, but it can write inventory. The script restocks the sold-out flag with
`inventoryAdjustQuantities` and prints a link that goes straight to checkout. The product is free and
needs no shipping, so checkout asks for no payment, and completing it sends the order confirmation email.
