const { SHOPIFY_STORE_DOMAIN: domain, SHOPIFY_ADMIN_TOKEN: token } = process.env;

export const storeUrl = `https://${domain}`;

export async function gql(query, variables = {}) {
  const res = await fetch(`${storeUrl}/admin/api/2025-01/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });
  const { data, errors } = await res.json();
  if (errors) throw new Error(errors.map((e) => e.message).join("; "));
  return data;
}
