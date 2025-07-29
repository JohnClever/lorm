import { pgTable, uuid, varchar } from "@lorm/schema/pg";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 })
});

export const schema = { users };