import "server-only";

import { headers } from "next/headers";
import { auth } from "./auth";
import { DomainError } from "@/domain/errors";

export async function requireUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new DomainError(401, "UNAUTHORIZED", "Log in to continue.");
  return session.user.id;
}

export async function jsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new DomainError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
}
