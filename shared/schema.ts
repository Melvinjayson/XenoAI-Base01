import { z } from "zod";

// Advanced search filter options interface
export interface SearchFilterOptions {
  timeRange: string;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  sources: string[];
  contentType: string[];
  relevance: number;
  location: string;
  language?: string[];
  excludeTerms?: string[];
  includeTerms?: string[];
  fileType?: string[];
  readingLevel?: string;
  sortBy?: string;
  minLength?: number;
  maxLength?: number;
  verifiedSourcesOnly?: boolean;
}

// File Management schemas
export interface File {
  id: number;
  path: string;
  sessionId: string;
  userId: number | null;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}

export interface InsertFile {
  path: string;
  sessionId: string;
  userId: number | null;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export const insertFileSchema = z.object({
  path: z.string(),
  sessionId: z.string(),
  userId: z.number().nullable(),
  filename: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number()
});

// Canvas schemas
export interface Canvas {
  id: number;
  userId: number | null;
  sessionId: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  width: number;
  height: number;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertCanvas {
  userId: number | null;
  sessionId: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  width: number;
  height: number;
  isPublic: boolean;
}

export const insertCanvasSchema = z.object({
  userId: z.number().nullable(),
  sessionId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  width: z.number(),
  height: z.number(),
  isPublic: z.boolean()
});

export interface CanvasElement {
  id: number;
  canvasId: number;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content: string;
  style: Record<string, any>;
  layer: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertCanvasElement {
  canvasId: number;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content: string;
  style: Record<string, any>;
  layer: number;
}

export const insertCanvasElementSchema = z.object({
  canvasId: z.number(),
  type: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number(),
  content: z.string(),
  style: z.record(z.string(), z.any()),
  layer: z.number()
});

// Color palette schemas
export interface ColorPalette {
  id: number;
  userId: number | null;
  name: string;
  description: string | null;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  accent: string;
  accentLight: string;
  accentDark: string;
  background: string;
  surface: string;
  error: string;
  warning: string;
  success: string;
  info: string;
  text: string;
  textSecondary: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertColorPalette {
  userId: number | null;
  name: string;
  description: string | null;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  accent: string;
  accentLight: string;
  accentDark: string;
  background: string;
  surface: string;
  error: string;
  warning: string;
  success: string;
  info: string;
  text: string;
  textSecondary: string;
  isDefault: boolean;
}

export const insertColorPaletteSchema = z.object({
  userId: z.number().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  primary: z.string(),
  primaryLight: z.string(),
  primaryDark: z.string(),
  secondary: z.string(),
  secondaryLight: z.string(),
  secondaryDark: z.string(),
  accent: z.string(),
  accentLight: z.string(),
  accentDark: z.string(),
  background: z.string(),
  surface: z.string(),
  error: z.string(),
  warning: z.string(),
  success: z.string(),
  info: z.string(),
  text: z.string(),
  textSecondary: z.string(),
  isDefault: z.boolean()
});

// Project Management schemas
export interface Project {
  id: number;
  userId: number | null;
  sessionId: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  thumbnailUrl: string | null;
  startDate: Date | null;
  dueDate: Date | null;
  completedDate: Date | null;
  tags: string[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertProject {
  userId: number | null;
  sessionId: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  thumbnailUrl: string | null;
  startDate: Date | null;
  dueDate: Date | null;
  completedDate: Date | null;
  tags: string[];
  isPublic: boolean;
}

export const insertProjectSchema = z.object({
  userId: z.number().nullable(),
  sessionId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  priority: z.string(),
  thumbnailUrl: z.string().nullable(),
  startDate: z.date().nullable(),
  dueDate: z.date().nullable(),
  completedDate: z.date().nullable(),
  tags: z.array(z.string()),
  isPublic: z.boolean()
});

export interface Milestone {
  id: number;
  projectId: number;
  name: string;
  description: string | null;
  status: string;
  dueDate: Date | null;
  completedDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertMilestone {
  projectId: number;
  name: string;
  description: string | null;
  status: string;
  dueDate: Date | null;
  completedDate: Date | null;
}

export const insertMilestoneSchema = z.object({
  projectId: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  dueDate: z.date().nullable(),
  completedDate: z.date().nullable()
});

export interface Task {
  id: number;
  projectId: number;
  milestoneId: number | null;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  assignedTo: number | null;
  startDate: Date | null;
  dueDate: Date | null;
  completedDate: Date | null;
  estimatedHours: number | null;
  actualHours: number | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertTask {
  projectId: number;
  milestoneId: number | null;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  assignedTo: number | null;
  startDate: Date | null;
  dueDate: Date | null;
  completedDate: Date | null;
  estimatedHours: number | null;
  actualHours: number | null;
  tags: string[];
}

export const insertTaskSchema = z.object({
  projectId: z.number(),
  milestoneId: z.number().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  priority: z.string(),
  assignedTo: z.number().nullable(),
  startDate: z.date().nullable(),
  dueDate: z.date().nullable(),
  completedDate: z.date().nullable(),
  estimatedHours: z.number().nullable(),
  actualHours: z.number().nullable(),
  tags: z.array(z.string())
});

export interface ResearchInsight {
  id: number;
  projectId: number;
  title: string;
  content: string;
  source: string | null;
  confidence: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertResearchInsight {
  projectId: number;
  title: string;
  content: string;
  source: string | null;
  confidence: number;
  tags: string[];
}

export const insertResearchInsightSchema = z.object({
  projectId: z.number(),
  title: z.string(),
  content: z.string(),
  source: z.string().nullable(),
  confidence: z.number(),
  tags: z.array(z.string())
});

export interface InsightTaskRelation {
  id: number;
  insightId: number;
  taskId: number;
  relationship: string;
  createdAt: Date;
}

export interface InsertInsightTaskRelation {
  insightId: number;
  taskId: number;
  relationship: string;
}

export const insertInsightTaskRelationSchema = z.object({
  insightId: z.number(),
  taskId: z.number(),
  relationship: z.string()
});

export interface ProjectComment {
  id: number;
  projectId: number;
  userId: number | null;
  content: string;
  createdAt: Date;
}

export interface InsertProjectComment {
  projectId: number;
  userId: number | null;
  content: string;
}

export const insertProjectCommentSchema = z.object({
  projectId: z.number(),
  userId: z.number().nullable(),
  content: z.string()
});

export interface TaskComment {
  id: number;
  taskId: number;
  userId: number | null;
  content: string;
  createdAt: Date;
}

export interface InsertTaskComment {
  taskId: number;
  userId: number | null;
  content: string;
}

export const insertTaskCommentSchema = z.object({
  taskId: z.number(),
  userId: z.number().nullable(),
  content: z.string()
});

