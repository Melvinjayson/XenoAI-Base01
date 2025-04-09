/**
 * Cross-Domain Integration Routes
 * 
 * This module defines API routes for the cross-domain integration system,
 * enabling data source management, extraction, transformation, and synthesis.
 */

import express, { Request, Response } from 'express';
import * as crossDomainIntegration from '../cross-domain-integration';
import { DataSourceType } from '../cross-domain-integration';

const router = express.Router();

// List data sources
router.get('/sources', (req: Request, res: Response) => {
  try {
    const tags = req.query.tags ? (req.query.tags as string).split(',') : undefined;
    const sources = crossDomainIntegration.listDataSources(tags);
    
    // Filter sensitive auth information
    const sanitizedSources = sources.map(source => {
      const { authConfig, ...rest } = source;
      return {
        ...rest,
        hasAuth: !!authConfig,
        authType: authConfig ? source.authType : 'none'
      };
    });
    
    res.status(200).json(sanitizedSources);
  } catch (error) {
    console.error('Error listing data sources:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Get data source details
router.get('/sources/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const source = crossDomainIntegration.getDataSource(id);
    
    if (!source) {
      return res.status(404).json({ error: `Data source with ID ${id} not found` });
    }
    
    // Filter sensitive auth information
    const { authConfig, ...rest } = source;
    const sanitizedSource = {
      ...rest,
      hasAuth: !!authConfig,
      authType: authConfig ? source.authType : 'none'
    };
    
    res.status(200).json(sanitizedSource);
  } catch (error) {
    console.error('Error getting data source:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Register a new data source
router.post('/sources', (req: Request, res: Response) => {
  try {
    const source = req.body;
    
    // Validate required fields
    if (!source.name || !source.type || !source.url) {
      return res.status(400).json({ 
        error: 'Data source must have name, type, and url properties' 
      });
    }
    
    // Ensure type is valid
    if (!Object.values(DataSourceType).includes(source.type)) {
      return res.status(400).json({ 
        error: `Invalid data source type. Must be one of: ${Object.values(DataSourceType).join(', ')}` 
      });
    }
    
    // Register the source
    const registeredSource = crossDomainIntegration.registerDataSource(source);
    
    // Filter sensitive auth information in response
    const { authConfig, ...rest } = registeredSource;
    const sanitizedSource = {
      ...rest,
      hasAuth: !!authConfig,
      authType: authConfig ? registeredSource.authType : 'none'
    };
    
    res.status(201).json(sanitizedSource);
  } catch (error) {
    console.error('Error registering data source:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Update a data source
router.put('/sources/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sourceUpdate = req.body;
    
    // Check if source exists
    const existingSource = crossDomainIntegration.getDataSource(id);
    if (!existingSource) {
      return res.status(404).json({ error: `Data source with ID ${id} not found` });
    }
    
    // Merge updated values with existing source
    const updatedSource = {
      ...existingSource,
      ...sourceUpdate,
      id // Ensure ID doesn't change
    };
    
    // Re-register the updated source
    const result = crossDomainIntegration.registerDataSource(updatedSource);
    
    // Filter sensitive auth information in response
    const { authConfig, ...rest } = result;
    const sanitizedSource = {
      ...rest,
      hasAuth: !!authConfig,
      authType: authConfig ? result.authType : 'none'
    };
    
    res.status(200).json(sanitizedSource);
  } catch (error) {
    console.error('Error updating data source:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Delete a data source
router.delete('/sources/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if source exists
    const existingSource = crossDomainIntegration.getDataSource(id);
    if (!existingSource) {
      return res.status(404).json({ error: `Data source with ID ${id} not found` });
    }
    
    // Remove the source
    const removed = crossDomainIntegration.removeDataSource(id);
    
    if (removed) {
      res.status(200).json({ success: true, message: `Data source ${id} removed` });
    } else {
      res.status(500).json({ error: `Failed to remove data source ${id}` });
    }
  } catch (error) {
    console.error('Error removing data source:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Extract data from a source
router.post('/sources/:id/extract', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if source exists
    const existingSource = crossDomainIntegration.getDataSource(id);
    if (!existingSource) {
      return res.status(404).json({ error: `Data source with ID ${id} not found` });
    }
    
    // Extract data
    const result = await crossDomainIntegration.extractData(id);
    
    // Limit data size in response
    const { data, ...resultMeta } = result;
    const response = {
      ...resultMeta,
      dataPreview: getDataPreview(data)
    };
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Error extracting data:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Get extraction results for a source
router.get('/sources/:id/extractions', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let limit = 10; // Default limit
    
    // Parse limit from query
    if (req.query.limit && !isNaN(Number(req.query.limit))) {
      limit = Number(req.query.limit);
    }
    
    // Get extraction results
    const results = crossDomainIntegration.getExtractionResults(id, limit);
    
    // Remove full data from response to reduce size
    const sanitizedResults = results.map(({ data, ...rest }) => ({
      ...rest,
      dataPreview: getDataPreview(data)
    }));
    
    res.status(200).json(sanitizedResults);
  } catch (error) {
    console.error('Error getting extraction results:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// List transformation pipelines
router.get('/pipelines', (req: Request, res: Response) => {
  try {
    // This is a stub as pipeline listing functionality is not fully implemented
    // In a complete implementation, we would:
    // 1. Maintain a registry of pipeline metadata
    // 2. Return that metadata here
    
    res.status(200).json({
      pipelines: [
        {
          id: 'basic_cleaning',
          name: 'Basic Data Cleaning',
          stepCount: 2
        }
      ]
    });
  } catch (error) {
    console.error('Error listing transformation pipelines:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Get a transformation pipeline
router.get('/pipelines/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pipeline = crossDomainIntegration.getTransformationPipeline(id);
    
    if (!pipeline) {
      return res.status(404).json({ error: `Pipeline with ID ${id} not found` });
    }
    
    res.status(200).json({
      id,
      steps: pipeline
    });
  } catch (error) {
    console.error('Error getting transformation pipeline:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Create a transformation pipeline
router.post('/pipelines', (req: Request, res: Response) => {
  try {
    const { id, steps } = req.body;
    
    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ error: 'Pipeline must have at least one step' });
    }
    
    // Create the pipeline
    const pipelineId = crossDomainIntegration.createTransformationPipeline(id, steps);
    
    res.status(201).json({
      id: pipelineId,
      steps,
      message: 'Pipeline created successfully'
    });
  } catch (error) {
    console.error('Error creating transformation pipeline:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Apply a transformation pipeline to data
router.post('/transform', async (req: Request, res: Response) => {
  try {
    const { pipelineId, pipeline, data } = req.body;
    
    if (!pipelineId && !pipeline) {
      return res.status(400).json({ error: 'Either pipelineId or pipeline is required' });
    }
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Data must be an array' });
    }
    
    // Apply the transformation
    let result;
    if (pipeline) {
      // Apply an inline pipeline
      result = crossDomainIntegration.applyTransformation(null, data, pipeline);
    } else if (pipelineId) {
      // Apply a stored pipeline
      result = crossDomainIntegration.applyTransformation(pipelineId, data);
    } else {
      return res.status(400).json({ error: 'Either pipelineId or pipeline must be provided' });
    }
    
    res.status(200).json({
      pipelineId,
      originalCount: data.length,
      transformedCount: result.length,
      result
    });
  } catch (error) {
    console.error('Error applying transformation:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Synthesize insights from sources
router.post('/synthesize', async (req: Request, res: Response) => {
  try {
    const { sourceIds, options } = req.body;
    
    if (!sourceIds || !Array.isArray(sourceIds) || sourceIds.length === 0) {
      return res.status(400).json({ error: 'At least one source ID is required' });
    }
    
    // Synthesize insights
    const result = await crossDomainIntegration.synthesizeInsights(sourceIds, options);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error synthesizing insights:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Get all synthesis results
router.get('/synthesis-results', (req: Request, res: Response) => {
  try {
    const results = crossDomainIntegration.getSynthesisResults();
    res.status(200).json(results);
  } catch (error) {
    console.error('Error getting synthesis results:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Helper function to create a preview of data
function getDataPreview(data: any): any {
  if (!data) return null;
  
  if (Array.isArray(data)) {
    // Return first few items and count
    return {
      type: 'array',
      totalCount: data.length,
      sample: data.slice(0, 3)
    };
  } else if (typeof data === 'object') {
    // For web content, return a summary
    if (data.title && data.paragraphs) {
      return {
        type: 'web_content',
        title: data.title,
        description: data.description,
        paragraphCount: data.paragraphs.length,
        sample: data.paragraphs.slice(0, 2)
      };
    }
    
    // For other objects, return the keys and a subset of values
    const keys = Object.keys(data);
    const preview: any = { type: 'object', keys };
    
    // Include a few key values as a sample
    if (keys.length > 0) {
      const sampleKeys = keys.slice(0, 3);
      preview.sample = {};
      
      sampleKeys.forEach(key => {
        preview.sample[key] = data[key];
      });
    }
    
    return preview;
  }
  
  // For primitive values, return as is
  return data;
}

export default router;