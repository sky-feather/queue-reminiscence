import { listOrganizations, type OrganizationSummary } from "$lib/api";
import type { PageLoad } from "./$types";

export const ssr = false;

export const load: PageLoad = async ({ params, fetch }) => {
  let organization: OrganizationSummary | null = null;

  try {
    const result = await listOrganizations(fetch);
    organization = result.organizations.find((o) => o.id === params.orgId) ?? null;
  } catch {
    // stays null; page shows not-found state
  }

  return { organization };
};
