import { defineSchema } from "convex/server";
import { authTables } from "./auth/tables";
import { messageTables } from "./messages/tables";
import { projectTables } from "./projects/tables";

export default defineSchema({
  ...authTables,
  ...messageTables,
  ...projectTables,
});
