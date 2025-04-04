import { pgTable, text, serial, integer, json, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Canvas element types
export type CanvasElementType = 'text' | 'shape' | 'connection' | 'node' | 'image' | 'insight';

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

// Bookmarks schema - for saving important conversations
export const bookmarks = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  sessionId: text("session_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  snippet: text("snippet"), // Short preview of the conversation
  tags: json("tags").$type<string[]>(),
  isFavorite: boolean("is_favorite").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  knowledgeGraphSnapshot: json("knowledge_graph_snapshot").$type<any>(), // Snapshot of knowledge graph at time of bookmark
});

export const insertBookmarkSchema = createInsertSchema(bookmarks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBookmark = z.infer<typeof insertBookmarkSchema>;
export type Bookmark = typeof bookmarks.$inferSelect;

// File uploads schema - for storing uploaded files
export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  sessionId: text("session_id"),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  path: text("path").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  analysis: json("analysis").$type<{
    summary?: string;
    entities?: any[];
    keywords?: string[];
  }>(),
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  createdAt: true,
});

export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;

// Insights history schema - for tracking insights over time
export const insights = pgTable("insights", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  sessionId: text("session_id").notNull(),
  type: text("type").notNull(), // pattern, cluster, connection, anomaly
  description: text("description").notNull(),
  relevance: integer("relevance").notNull(),
  confidence: integer("confidence"),
  nodeIds: json("node_ids").$type<string[]>(),
  edgeIds: json("edge_ids").$type<string[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  knowledgeGraphSnapshot: json("knowledge_graph_snapshot").$type<any>(), // Optional snapshot
});

export const insertInsightSchema = createInsertSchema(insights).omit({
  id: true,
  createdAt: true,
});

export type InsertInsight = z.infer<typeof insertInsightSchema>;
export type Insight = typeof insights.$inferSelect;

// User preferences schema - for storing UI and feature preferences
export const preferences = pgTable("preferences", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  key: text("key").notNull(), // preference key (e.g., 'theme', 'language')
  value: text("value").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPreferenceSchema = createInsertSchema(preferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPreference = z.infer<typeof insertPreferenceSchema>;
export type Preference = typeof preferences.$inferSelect;

// Canvas schema - for storing interactive whiteboard data
export const canvases = pgTable("canvases", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  sessionId: text("session_id").notNull(),
  title: text("title").notNull(),
  lastModified: timestamp("last_modified").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  thumbnail: text("thumbnail"),
  isPublic: boolean("is_public").default(false),
});

export const insertCanvasSchema = createInsertSchema(canvases).omit({
  id: true,
  lastModified: true,
  createdAt: true,
});

export type InsertCanvas = z.infer<typeof insertCanvasSchema>;
export type Canvas = typeof canvases.$inferSelect;

// Canvas elements schema - for storing objects on the canvas
export const canvasElements = pgTable("canvas_elements", {
  id: serial("id").primaryKey(),
  canvasId: integer("canvas_id").notNull(),
  type: text("type").notNull(), // text, shape, connection, node, image, insight
  content: text("content"),
  x: integer("x").notNull(),
  y: integer("y").notNull(),
  width: integer("width"),
  height: integer("height"),
  zIndex: integer("z_index").notNull().default(0),
  style: json("style").$type<{
    color?: string;
    fontSize?: number;
    fontFamily?: string;
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    opacity?: number;
    rotation?: number;
  }>(),
  metadata: json("metadata").$type<{
    sourceNodeId?: string;
    sourceInsightId?: number;
    linkedEntityIds?: string[];
    aiGenerated?: boolean;
    createdFromChat?: boolean;
  }>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCanvasElementSchema = createInsertSchema(canvasElements).omit({
  id: true,
  createdAt: true,
});

export type InsertCanvasElement = z.infer<typeof insertCanvasElementSchema>;
export type CanvasElement = typeof canvasElements.$inferSelect;

// Project Management Module

// Project Status Enum
export const projectStatusEnum = pgEnum('project_status', ['not_started', 'in_progress', 'on_track', 'at_risk', 'off_track', 'completed', 'on_hold']);

// Priority Enum
export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high', 'critical']);

// Projects table
export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  status: projectStatusEnum('status').default('not_started').notNull(),
  priority: priorityEnum('priority').default('medium').notNull(),
  startDate: timestamp('start_date'),
  dueDate: timestamp('due_date'),
  completedDate: timestamp('completed_date'),
  progress: integer('progress').default(0),
  owner: text('owner').notNull(), // userId
  metadata: json('metadata').$type<{ tags?: string[]; color?: string }>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Milestones table
export const milestones = pgTable('milestones', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  dueDate: timestamp('due_date'),
  completedDate: timestamp('completed_date'),
  status: projectStatusEnum('status').default('not_started').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Task Status Enum
export const taskStatusEnum = pgEnum('task_status', ['todo', 'in_progress', 'in_review', 'done', 'blocked']);

// Tasks table
export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull(),
  milestoneId: integer('milestone_id'),
  title: text('title').notNull(),
  description: text('description'),
  status: taskStatusEnum('status').default('todo').notNull(),
  priority: priorityEnum('priority').default('medium').notNull(),
  startDate: timestamp('start_date'),
  dueDate: timestamp('due_date'),
  completedDate: timestamp('completed_date'),
  assignee: text('assignee'), // userId
  estimatedHours: integer('estimated_hours'),
  actualHours: integer('actual_hours'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Research Insights table
export const researchInsights = pgTable('research_insights', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  source: text('source'),
  confidence: integer('confidence').default(50),
  tags: json('tags').$type<string[]>().default([]),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Insight-Task Relationships table
export const insightTaskRelations = pgTable('insight_task_relations', {
  id: serial('id').primaryKey(),
  insightId: integer('insight_id').notNull(),
  taskId: integer('task_id').notNull(),
  relevanceScore: integer('relevance_score').default(50),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Project Comments
export const projectComments = pgTable('project_comments', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull(),
  userId: text('user_id').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Task Comments
export const taskComments = pgTable('task_comments', {
  id: serial('id').primaryKey(),
  taskId: integer('task_id').notNull(),
  userId: text('user_id').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Insert schemas for Project Management
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMilestoneSchema = createInsertSchema(milestones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertResearchInsightSchema = createInsertSchema(researchInsights).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInsightTaskRelationSchema = createInsertSchema(insightTaskRelations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectCommentSchema = createInsertSchema(projectComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskCommentSchema = createInsertSchema(taskComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types for Project Management
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Milestone = typeof milestones.$inferSelect;
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type ResearchInsight = typeof researchInsights.$inferSelect;
export type InsertResearchInsight = z.infer<typeof insertResearchInsightSchema>;

export type InsightTaskRelation = typeof insightTaskRelations.$inferSelect;
export type InsertInsightTaskRelation = z.infer<typeof insertInsightTaskRelationSchema>;

export type ProjectComment = typeof projectComments.$inferSelect;
export type InsertProjectComment = z.infer<typeof insertProjectCommentSchema>;

export type TaskComment = typeof taskComments.$inferSelect;
export type InsertTaskComment = z.infer<typeof insertTaskCommentSchema>;

// Color Palette management for Adaptive Color Palette Generator
export const colorPalettes = pgTable('color_palettes', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  userId: text('user_id'),
  primary: text('primary').notNull(),
  primaryLight: text('primary_light').notNull(),
  primaryDark: text('primary_dark').notNull(),
  secondary: text('secondary').notNull(),
  secondaryLight: text('secondary_light').notNull(),
  secondaryDark: text('secondary_dark').notNull(),
  accent: text('accent').notNull(),
  background: text('background').notNull(),
  surface: text('surface').notNull(),
  text: text('text').notNull(),
  textSecondary: text('text_secondary').notNull(),
  success: text('success').notNull(),
  warning: text('warning').notNull(),
  error: text('error').notNull(),
  sourceType: text('source_type').notNull(), // 'image', 'theme', 'custom'
  sourceImage: text('source_image'), // URL or path to source image if applicable
  isDefault: boolean('is_default').default(false),
  metadata: json('metadata').$type<{
    theme?: string;
    tags?: string[];
    harmony?: string;
    colorSpace?: string;
    accessibility?: {
      wcagLevel?: string;
      contrastRatio?: number;
    };
  }>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insertColorPaletteSchema = createInsertSchema(colorPalettes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ColorPalette = typeof colorPalettes.$inferSelect;
export type InsertColorPalette = z.infer<typeof insertColorPaletteSchema>;
