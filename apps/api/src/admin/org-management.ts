import type { Database, Organization } from "@queue-reminiscence/db";
import { adminMemberships, organizations, venues } from "@queue-reminiscence/db/schema";
import { and, count, eq, ne } from "drizzle-orm";

import type { OrganizationSummary } from "./board-management";
import { canManageOrganization, canManagePlatform, type AdminRbacContext } from "../auth/rbac";

export interface CreateOrgInput {
  slug: string;
  name: string;
}

export interface PatchOrgInput {
  slug?: string;
  name?: string;
}

export type CreateOrgResult =
  | { status: "created"; organization: OrganizationSummary }
  | { status: "forbidden" }
  | { status: "conflict" };

export type UpdateOrgResult =
  | { status: "updated"; organization: OrganizationSummary }
  | { status: "not_found" }
  | { status: "forbidden" }
  | { status: "conflict" };

export type DeleteOrgResult =
  | { status: "deleted" }
  | { status: "not_found" }
  | { status: "forbidden" }
  | { status: "not_empty" };

export interface OrgManagementService {
  createOrganization(rbac: AdminRbacContext, input: CreateOrgInput): Promise<CreateOrgResult>;
  updateOrganization(
    rbac: AdminRbacContext,
    orgId: string,
    patch: PatchOrgInput,
  ): Promise<UpdateOrgResult>;
  deleteOrganization(rbac: AdminRbacContext, orgId: string): Promise<DeleteOrgResult>;
}

function toOrganizationSummary(org: Organization): OrganizationSummary {
  return {
    id: org.id,
    slug: org.slug,
    name: org.name,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
  };
}

export function createDbOrgManagementService(db: Database): OrgManagementService {
  return {
    async createOrganization(rbac, input): Promise<CreateOrgResult> {
      if (!canManagePlatform(rbac)) {
        return { status: "forbidden" };
      }

      const [existing] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.slug, input.slug))
        .limit(1);

      if (existing) {
        return { status: "conflict" };
      }

      const [created] = await db
        .insert(organizations)
        .values({ slug: input.slug, name: input.name })
        .returning();

      return { status: "created", organization: toOrganizationSummary(created) };
    },

    async updateOrganization(rbac, orgId, patch): Promise<UpdateOrgResult> {
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);

      if (!org) {
        return { status: "not_found" };
      }

      if (!canManageOrganization(rbac, orgId)) {
        return { status: "forbidden" };
      }

      if (patch.slug !== undefined) {
        const [existing] = await db
          .select({ id: organizations.id })
          .from(organizations)
          .where(and(eq(organizations.slug, patch.slug), ne(organizations.id, orgId)))
          .limit(1);

        if (existing) {
          return { status: "conflict" };
        }
      }

      const [updated] = await db
        .update(organizations)
        .set(patch)
        .where(eq(organizations.id, orgId))
        .returning();

      return { status: "updated", organization: toOrganizationSummary(updated) };
    },

    async deleteOrganization(rbac, orgId): Promise<DeleteOrgResult> {
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);

      if (!org) {
        return { status: "not_found" };
      }

      if (!canManagePlatform(rbac)) {
        return { status: "forbidden" };
      }

      const [venueCount] = await db
        .select({ count: count() })
        .from(venues)
        .where(eq(venues.organizationId, orgId));

      if ((venueCount?.count ?? 0) > 0) {
        return { status: "not_empty" };
      }

      await db.transaction(async (tx) => {
        await tx.delete(adminMemberships).where(eq(adminMemberships.organizationId, orgId));
        await tx.delete(organizations).where(eq(organizations.id, orgId));
      });

      return { status: "deleted" };
    },
  };
}
