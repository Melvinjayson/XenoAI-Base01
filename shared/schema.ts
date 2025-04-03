import { pgTable, text, serial, integer, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Chat message schema
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(), // user or assistant
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  sources: json("sources").$type<{name: string, value: string}[]>(),
  userId: text("user_id"),
  sessionId: text("session_id").notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  timestamp: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Chat session schema
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastActive: timestamp("last_active").notNull().defaultNow(),
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
  lastActive: true,
});

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

// User schema (for future authentication)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
