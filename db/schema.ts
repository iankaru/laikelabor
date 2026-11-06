import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const reviews = pgTable("reviews", {
  id: serial().primaryKey(),
  name: text().notNull(),
  rating: integer().notNull(),
  message: text().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bookings = pgTable("bookings", {
  id: serial().primaryKey(),
  name: text().notNull(),
  phone: text().notNull(),
  carModel: text("car_model").notNull().default(""),
  preferredTime: text("preferred_time").notNull(),
  services: text().notNull(),
  location: text().notNull(),
  total: text().notNull(),
  notes: text().notNull().default(""),
  emailSent: boolean("email_sent").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
