/**
 * Security & Privacy Manager
 * 
 * This module provides a comprehensive framework for data security, privacy controls,
 * and transparency. It ensures proper handling of sensitive data and provides
 * audit trails for all operations.
 * 
 * Key features:
 * - Data access control and permissions
 * - Security audit logging
 * - Privacy compliance management
 * - Data anonymization and pseudonymization
 * - Transparency reporting
 */

import * as crypto from 'crypto';
import { EventEmitter } from 'events';

// Security event types
export enum SecurityEventType {
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  CONFIGURATION_CHANGE = 'configuration_change',
  SYSTEM_ERROR = 'system_error',
  PRIVACY_CONTROL = 'privacy_control',
  EXPORT_OPERATION = 'export_operation'
}

// Security event severity levels
export enum SecurityEventSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical'
}

// Security event interface
export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: SecurityEventSeverity;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  resource?: string;
  operation?: string;
  status: 'success' | 'failure';
  details?: any;
  metadata?: Record<string, any>;
}

// Privacy level settings
export enum PrivacyLevel {
  PUBLIC = 'public',              // Can be shared publicly
  INTERNAL = 'internal',          // Can be used within the system for various purposes
  RESTRICTED = 'restricted',      // Can only be used for specific purposes
  CONFIDENTIAL = 'confidential',  // Can only be used by the user and authorized agents
  SENSITIVE = 'sensitive'         // Must be handled with extreme care, with extra safeguards
}

// Data category for classification
export enum DataCategory {
  SYSTEM = 'system',                  // System-related data
  CONVERSATION = 'conversation',      // User conversations
  KNOWLEDGE = 'knowledge',            // Knowledge base content
  PERSONAL = 'personal',              // Personal user information
  BEHAVIORAL = 'behavioral',          // User behavior and patterns
  GENERATED = 'generated',            // AI-generated content
  IMPORTED = 'imported',              // User-imported content
  CREDENTIAL = 'credential'           // Authentication/authorization data
}

// Data retention policy
export interface RetentionPolicy {
  category: DataCategory;
  duration: number; // Duration in days, -1 for indefinite
  autoDelete: boolean;
}

// Transparency record
export interface TransparencyRecord {
  id: string;
  timestamp: Date;
  operation: string;
  description: string;
  models: string[];
  dataCategories: DataCategory[];
  purpose: string;
  processingDetails?: string;
  decisionExplanation?: string;
}

// Security event store
const securityEvents: SecurityEvent[] = [];
const MAX_SECURITY_EVENTS = 10000;

// Transparency records store
const transparencyRecords: TransparencyRecord[] = [];
const MAX_TRANSPARENCY_RECORDS = 5000;

// Default retention policies
const defaultRetentionPolicies: RetentionPolicy[] = [
  { category: DataCategory.CONVERSATION, duration: 90, autoDelete: true },
  { category: DataCategory.KNOWLEDGE, duration: 365, autoDelete: false },
  { category: DataCategory.PERSONAL, duration: 365, autoDelete: true },
  { category: DataCategory.BEHAVIORAL, duration: 180, autoDelete: true },
  { category: DataCategory.GENERATED, duration: 180, autoDelete: false },
  { category: DataCategory.IMPORTED, duration: 90, autoDelete: false },
  { category: DataCategory.CREDENTIAL, duration: -1, autoDelete: false }
];

// Custom retention policies by user
const userRetentionPolicies: Map<string, RetentionPolicy[]> = new Map();

// Privacy settings by user
const userPrivacySettings: Map<string, Map<DataCategory, PrivacyLevel>> = new Map();

// Event emitter for security events
const securityEventEmitter = new EventEmitter();

/**
 * Log a security event
 */
export function logSecurityEvent(
  type: SecurityEventType,
  severity: SecurityEventSeverity,
  status: 'success' | 'failure',
  details: any = {},
  options: {
    userId?: string;
    sessionId?: string;
    resource?: string;
    operation?: string;
    metadata?: Record<string, any>;
  } = {}
): SecurityEvent {
  const event: SecurityEvent = {
    id: `sec_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    type,
    severity,
    timestamp: new Date(),
    status,
    details,
    ...options
  };
  
  // Store the event
  securityEvents.unshift(event);
  
  // Trim the array if it gets too large
  if (securityEvents.length > MAX_SECURITY_EVENTS) {
    securityEvents.pop();
  }
  
  // Emit the event
  securityEventEmitter.emit('security:event', event);
  securityEventEmitter.emit(`security:${type}`, event);
  
  // For critical events, emit a special event
  if (severity === SecurityEventSeverity.CRITICAL) {
    securityEventEmitter.emit('security:critical', event);
  }
  
  return event;
}

/**
 * Create a transparency record for an operation
 */
export function createTransparencyRecord(
  operation: string,
  description: string,
  options: {
    models: string[];
    dataCategories: DataCategory[];
    purpose: string;
    processingDetails?: string;
    decisionExplanation?: string;
  }
): TransparencyRecord {
  const record: TransparencyRecord = {
    id: `tr_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    timestamp: new Date(),
    operation,
    description,
    ...options
  };
  
  // Store the record
  transparencyRecords.unshift(record);
  
  // Trim the array if it gets too large
  if (transparencyRecords.length > MAX_TRANSPARENCY_RECORDS) {
    transparencyRecords.pop();
  }
  
  // Emit an event
  securityEventEmitter.emit('transparency:record', record);
  
  return record;
}

/**
 * Check if a user has permission to access a specific resource
 */
export function checkPermission(
  userId: string,
  resource: string,
  operation: 'read' | 'write' | 'delete'
): boolean {
  // Log the access attempt
  logSecurityEvent(
    SecurityEventType.AUTHORIZATION,
    SecurityEventSeverity.INFO,
    'success',
    { resource, operation },
    { userId, resource, operation }
  );
  
  // In a real implementation, this would check against a permissions database
  // For now, we'll assume all operations are allowed
  return true;
}

/**
 * Get user privacy settings for a specific category or all categories
 */
export function getUserPrivacySettings(
  userId: string,
  category?: DataCategory
): Map<DataCategory, PrivacyLevel> | PrivacyLevel | undefined {
  const userSettings = userPrivacySettings.get(userId);
  
  if (!userSettings) {
    return undefined;
  }
  
  if (category) {
    return userSettings.get(category);
  }
  
  return userSettings;
}

/**
 * Set user privacy settings for a specific data category
 */
export function setUserPrivacySetting(
  userId: string,
  category: DataCategory,
  level: PrivacyLevel
): void {
  let userSettings = userPrivacySettings.get(userId);
  
  if (!userSettings) {
    userSettings = new Map();
    userPrivacySettings.set(userId, userSettings);
  }
  
  userSettings.set(category, level);
  
  // Log the change
  logSecurityEvent(
    SecurityEventType.PRIVACY_CONTROL,
    SecurityEventSeverity.INFO,
    'success',
    { category, level },
    { userId, operation: 'update_privacy_setting' }
  );
}

/**
 * Get user retention policy for a specific category or all categories
 */
export function getUserRetentionPolicies(
  userId: string,
  category?: DataCategory
): RetentionPolicy[] | RetentionPolicy | undefined {
  const userPolicies = userRetentionPolicies.get(userId);
  
  if (!userPolicies) {
    // Return default policies if no custom ones exist
    if (category) {
      return defaultRetentionPolicies.find(p => p.category === category);
    }
    return defaultRetentionPolicies;
  }
  
  if (category) {
    return userPolicies.find(p => p.category === category);
  }
  
  return userPolicies;
}

/**
 * Set user retention policy for a specific data category
 */
export function setUserRetentionPolicy(
  userId: string,
  policy: RetentionPolicy
): void {
  let userPolicies = userRetentionPolicies.get(userId);
  
  if (!userPolicies) {
    userPolicies = [...defaultRetentionPolicies];
    userRetentionPolicies.set(userId, userPolicies);
  }
  
  // Find and replace or add the policy
  const existingIndex = userPolicies.findIndex(p => p.category === policy.category);
  if (existingIndex >= 0) {
    userPolicies[existingIndex] = policy;
  } else {
    userPolicies.push(policy);
  }
  
  // Log the change
  logSecurityEvent(
    SecurityEventType.CONFIGURATION_CHANGE,
    SecurityEventSeverity.INFO,
    'success',
    { policy },
    { userId, operation: 'update_retention_policy' }
  );
}

/**
 * Get recent security events, optionally filtered by type or user
 */
export function getSecurityEvents(
  options: {
    limit?: number;
    type?: SecurityEventType;
    userId?: string;
    severity?: SecurityEventSeverity;
    startDate?: Date;
    endDate?: Date;
  } = {}
): SecurityEvent[] {
  const {
    limit = 100,
    type,
    userId,
    severity,
    startDate,
    endDate
  } = options;
  
  let filteredEvents = securityEvents;
  
  // Apply filters
  if (type) {
    filteredEvents = filteredEvents.filter(e => e.type === type);
  }
  
  if (userId) {
    filteredEvents = filteredEvents.filter(e => e.userId === userId);
  }
  
  if (severity) {
    filteredEvents = filteredEvents.filter(e => e.severity === severity);
  }
  
  if (startDate) {
    filteredEvents = filteredEvents.filter(e => e.timestamp >= startDate);
  }
  
  if (endDate) {
    filteredEvents = filteredEvents.filter(e => e.timestamp <= endDate);
  }
  
  // Return limited results
  return filteredEvents.slice(0, limit);
}

/**
 * Get transparency records, optionally filtered
 */
export function getTransparencyRecords(
  options: {
    limit?: number;
    operation?: string;
    dataCategory?: DataCategory;
    startDate?: Date;
    endDate?: Date;
  } = {}
): TransparencyRecord[] {
  const {
    limit = 100,
    operation,
    dataCategory,
    startDate,
    endDate
  } = options;
  
  let filteredRecords = transparencyRecords;
  
  // Apply filters
  if (operation) {
    filteredRecords = filteredRecords.filter(r => r.operation === operation);
  }
  
  if (dataCategory) {
    filteredRecords = filteredRecords.filter(r => r.dataCategories.includes(dataCategory));
  }
  
  if (startDate) {
    filteredRecords = filteredRecords.filter(r => r.timestamp >= startDate);
  }
  
  if (endDate) {
    filteredRecords = filteredRecords.filter(r => r.timestamp <= endDate);
  }
  
  // Return limited results
  return filteredRecords.slice(0, limit);
}

/**
 * Anonymize or pseudonymize data for privacy
 */
export function anonymizeData(
  data: any,
  options: {
    userId?: string;
    preserveStructure?: boolean;
    sensitiveFields?: string[];
  } = {}
): any {
  const { preserveStructure = true, sensitiveFields = [] } = options;
  
  // Function to anonymize a single value
  function anonymizeValue(value: any, path: string): any {
    // Skip nullish values
    if (value === null || value === undefined) {
      return value;
    }
    
    // Handle different types
    if (typeof value === 'string') {
      // Check if this is a sensitive field that needs anonymization
      if (sensitiveFields.includes(path) || isSensitiveField(path)) {
        // Anonymize using a hash with a salt
        const hash = crypto.createHash('sha256');
        hash.update(value + 'anon_salt');
        return preserveStructure ? `anon_${hash.digest('hex').substring(0, 8)}` : '';
      }
      return value;
    }
    
    if (Array.isArray(value)) {
      return value.map((item, i) => anonymizeValue(item, `${path}[${i}]`));
    }
    
    if (typeof value === 'object') {
      const result: any = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = anonymizeValue(val, path ? `${path}.${key}` : key);
      }
      return result;
    }
    
    // Return primitives as is
    return value;
  }
  
  // Helper to detect sensitive fields by name
  function isSensitiveField(fieldPath: string): boolean {
    const sensitivePatterns = [
      /password/i, /secret/i, /token/i, /key/i, /credential/i,
      /ssn/i, /social.*security/i, /credit.*card/i, /card.*number/i,
      /cvv/i, /email/i, /address/i, /phone/i, /birth/i, /gender/i
    ];
    
    return sensitivePatterns.some(pattern => pattern.test(fieldPath));
  }
  
  // Log the anonymization operation
  if (options.userId) {
    logSecurityEvent(
      SecurityEventType.PRIVACY_CONTROL,
      SecurityEventSeverity.INFO,
      'success',
      { action: 'anonymize_data' },
      { userId: options.userId, operation: 'anonymize_data' }
    );
  }
  
  return anonymizeValue(data, '');
}

/**
 * Generate a user-facing transparency explanation
 */
export function generateTransparencyExplanation(
  operationId: string
): string {
  const record = transparencyRecords.find(r => r.id === operationId);
  
  if (!record) {
    return 'No information available for this operation.';
  }
  
  // Format a user-friendly explanation
  let explanation = `Operation: ${record.operation}\n`;
  explanation += `Time: ${record.timestamp.toLocaleString()}\n`;
  explanation += `Purpose: ${record.purpose}\n`;
  explanation += `Description: ${record.description}\n\n`;
  
  if (record.models && record.models.length > 0) {
    explanation += `AI Models Used: ${record.models.join(', ')}\n`;
  }
  
  if (record.dataCategories && record.dataCategories.length > 0) {
    explanation += `Data Categories Used: ${record.dataCategories.join(', ')}\n`;
  }
  
  if (record.decisionExplanation) {
    explanation += `\nExplanation of Results: ${record.decisionExplanation}`;
  }
  
  return explanation;
}

/**
 * Subscribe to security events
 */
export function subscribeToSecurityEvents(
  event: 'security:event' | 'security:critical' | `security:${SecurityEventType}` | 'transparency:record',
  callback: (data: any) => void
): () => void {
  securityEventEmitter.on(event, callback);
  return () => securityEventEmitter.off(event, callback);
}

/**
 * Initialize the security and privacy system
 */
export function initializeSecurityPrivacy(): void {
  console.log('Initializing Security & Privacy System...');
  
  // Set up default privacy levels for categories
  const defaultPrivacy = new Map<DataCategory, PrivacyLevel>([
    [DataCategory.SYSTEM, PrivacyLevel.INTERNAL],
    [DataCategory.CONVERSATION, PrivacyLevel.CONFIDENTIAL],
    [DataCategory.KNOWLEDGE, PrivacyLevel.INTERNAL],
    [DataCategory.PERSONAL, PrivacyLevel.CONFIDENTIAL],
    [DataCategory.BEHAVIORAL, PrivacyLevel.RESTRICTED],
    [DataCategory.GENERATED, PrivacyLevel.INTERNAL],
    [DataCategory.IMPORTED, PrivacyLevel.CONFIDENTIAL],
    [DataCategory.CREDENTIAL, PrivacyLevel.SENSITIVE]
  ]);
  
  // Subscribe to critical security events for handling
  subscribeToSecurityEvents('security:critical', (event) => {
    console.error(`CRITICAL SECURITY EVENT: ${event.type} - ${JSON.stringify(event.details)}`);
    // In a real implementation, this would send alerts, etc.
  });
  
  console.log('Security & Privacy System initialized');
}

// Export the system as a singleton
export const securityPrivacyManager = {
  initialize: initializeSecurityPrivacy,
  logEvent: logSecurityEvent,
  createTransparencyRecord,
  checkPermission,
  getUserPrivacySettings,
  setUserPrivacySetting,
  getUserRetentionPolicies,
  setUserRetentionPolicy,
  getSecurityEvents,
  getTransparencyRecords,
  anonymizeData,
  generateTransparencyExplanation,
  subscribeToEvents: subscribeToSecurityEvents,
  SecurityEventType,
  SecurityEventSeverity,
  PrivacyLevel,
  DataCategory
};