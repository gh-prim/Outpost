import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// SCIM provisioning uses PUT, PATCH and DELETE on top of GET and POST.
export const { GET, POST, PUT, PATCH, DELETE } = toNextJsHandler(auth);
