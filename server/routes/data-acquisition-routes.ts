/**
 * Data Acquisition Routes
 * 
 * API routes for autonomous data acquisition:
 * - Managing data sources
 * - Triggering data acquisition
 * - Retrieving acquired data
 */

import { Router, Request, Response } from 'express';
import { 
  autonomousDataAcquisition,
  DataSource,
  TaskStatus
} from '../autonomous-data-acquisition';
import { errorRecoverySystem } from '../error-recovery-system';

const router = Router();

// Get all data sources
router.get('/sources', async (req: Request, res: Response) => {
  try {
    const sources = autonomousDataAcquisition.getAllDataSources();
    
    res.status(200).json({
      sources,
      count: sources.length
    });
  } catch (error) {
    console.error('Error getting data sources:', error);
    
    // Log the error
    errorRecoverySystem.logError({
      id: `get_sources_error_${Date.now()}`,
      type: 'data_acquisition_api_error',
      message: `Error getting data sources: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date(),
      severity: 'error'
    });
    
    res.status(500).json({
      error: 'An error occurred while retrieving data sources',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get a specific data source
router.get('/sources/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const source = autonomousDataAcquisition.getDataSource(id);
    
    if (!source) {
      return res.status(404).json({
        error: 'Data source not found',
        sourceId: id
      });
    }
    
    res.status(200).json(source);
  } catch (error) {
    console.error(`Error getting data source ${req.params.id}:`, error);
    
    // Log the error
    errorRecoverySystem.logError({
      id: `get_source_error_${Date.now()}`,
      type: 'data_acquisition_api_error',
      message: `Error getting data source: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      context: { sourceId: req.params.id },
      timestamp: new Date(),
      severity: 'error'
    });
    
    res.status(500).json({
      error: 'An error occurred while retrieving the data source',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Create a new data source
router.post('/sources', async (req: Request, res: Response) => {
  try {
    const sourceData = req.body;
    
    // Basic validation
    if (!sourceData.name || !sourceData.url || !sourceData.type) {
      return res.status(400).json({
        error: 'Invalid data source definition',
        message: 'Name, URL, and type are required'
      });
    }
    
    // Register the data source
    const source = await autonomousDataAcquisition.registerDataSource(sourceData);
    
    res.status(201).json({
      message: 'Data source registered successfully',
      source
    });
  } catch (error) {
    console.error('Error registering data source:', error);
    
    // Log the error
    errorRecoverySystem.logError({
      id: `create_source_error_${Date.now()}`,
      type: 'data_acquisition_api_error',
      message: `Error registering data source: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      context: { sourceData: req.body },
      timestamp: new Date(),
      severity: 'error'
    });
    
    res.status(500).json({
      error: 'An error occurred while registering the data source',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Update a data source
router.patch('/sources/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Get existing data source
    const existingSource = autonomousDataAcquisition.getDataSource(id);
    if (!existingSource) {
      return res.status(404).json({
        error: 'Data source not found',
        sourceId: id
      });
    }
    
    // Update the data source
    const updatedSource = autonomousDataAcquisition.updateDataSource(id, updateData);
    
    res.status(200).json({
      message: 'Data source updated successfully',
      source: updatedSource
    });
  } catch (error) {
    console.error(`Error updating data source ${req.params.id}:`, error);
    
    // Log the error
    errorRecoverySystem.logError({
      id: `update_source_error_${Date.now()}`,
      type: 'data_acquisition_api_error',
      message: `Error updating data source: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      context: { sourceId: req.params.id, updateData: req.body },
      timestamp: new Date(),
      severity: 'error'
    });
    
    res.status(500).json({
      error: 'An error occurred while updating the data source',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Enable a data source
router.post('/sources/:id/enable', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Enable the data source
    const updatedSource = await autonomousDataAcquisition.enableDataSource(id);
    
    if (!updatedSource) {
      return res.status(404).json({
        error: 'Data source not found',
        sourceId: id
      });
    }
    
    res.status(200).json({
      message: 'Data source enabled successfully',
      source: updatedSource
    });
  } catch (error) {
    console.error(`Error enabling data source ${req.params.id}:`, error);
    
    // Log the error
    errorRecoverySystem.logError({
      id: `enable_source_error_${Date.now()}`,
      type: 'data_acquisition_api_error',
      message: `Error enabling data source: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      context: { sourceId: req.params.id },
      timestamp: new Date(),
      severity: 'error'
    });
    
    res.status(500).json({
      error: 'An error occurred while enabling the data source',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Disable a data source
router.post('/sources/:id/disable', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Disable the data source
    const updatedSource = autonomousDataAcquisition.disableDataSource(id);
    
    if (!updatedSource) {
      return res.status(404).json({
        error: 'Data source not found',
        sourceId: id
      });
    }
    
    res.status(200).json({
      message: 'Data source disabled successfully',
      source: updatedSource
    });
  } catch (error) {
    console.error(`Error disabling data source ${req.params.id}:`, error);
    
    // Log the error
    errorRecoverySystem.logError({
      id: `disable_source_error_${Date.now()}`,
      type: 'data_acquisition_api_error',
      message: `Error disabling data source: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      context: { sourceId: req.params.id },
      timestamp: new Date(),
      severity: 'error'
    });
    
    res.status(500).json({
      error: 'An error occurred while disabling the data source',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Delete a data source
router.delete('/sources/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Delete the data source
    const success = autonomousDataAcquisition.deleteDataSource(id);
    
    if (!success) {
      return res.status(404).json({
        error: 'Data source not found',
        sourceId: id
      });
    }
    
    res.status(200).json({
      message: 'Data source deleted successfully',
      sourceId: id
    });
  } catch (error) {
    console.error(`Error deleting data source ${req.params.id}:`, error);
    
    // Log the error
    errorRecoverySystem.logError({
      id: `delete_source_error_${Date.now()}`,
      type: 'data_acquisition_api_error',
      message: `Error deleting data source: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      context: { sourceId: req.params.id },
      timestamp: new Date(),
      severity: 'error'
    });
    
    res.status(500).json({
      error: 'An error occurred while deleting the data source',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Trigger data acquisition for a source
router.post('/sources/:id/acquire', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Trigger acquisition
    const task = await autonomousDataAcquisition.triggerAcquisition(id);
    
    res.status(200).json({
      message: 'Data acquisition triggered successfully',
      task
    });
  } catch (error) {
    console.error(`Error triggering acquisition for source ${req.params.id}:`, error);
    
    // Log the error
    errorRecoverySystem.logError({
      id: `trigger_acquisition_error_${Date.now()}`,
      type: 'data_acquisition_api_error',
      message: `Error triggering acquisition: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      context: { sourceId: req.params.id },
      timestamp: new Date(),
      severity: 'error'
    });
    
    res.status(500).json({
      error: 'An error occurred while triggering data acquisition',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get tasks for a data source
router.get('/sources/:id/tasks', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get tasks for the source
    const tasks = autonomousDataAcquisition.getTasksForDataSource(id);
    
    res.status(200).json({
      tasks,
      count: tasks.length
    });
  } catch (error) {
    console.error(`Error getting tasks for source ${req.params.id}:`, error);
    
    // Log the error
    errorRecoverySystem.logError({
      id: `get_tasks_error_${Date.now()}`,
      type: 'data_acquisition_api_error',
      message: `Error getting tasks: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      context: { sourceId: req.params.id },
      timestamp: new Date(),
      severity: 'error'
    });
    
    res.status(500).json({
      error: 'An error occurred while retrieving tasks',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get extracted data for a source
router.get('/sources/:id/data', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get extracted data for the source
    const data = autonomousDataAcquisition.getExtractedDataForSource(id);
    
    res.status(200).json({
      data,
      count: data.length
    });
  } catch (error) {
    console.error(`Error getting extracted data for source ${req.params.id}:`, error);
    
    // Log the error
    errorRecoverySystem.logError({
      id: `get_extracted_data_error_${Date.now()}`,
      type: 'data_acquisition_api_error',
      message: `Error getting extracted data: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      context: { sourceId: req.params.id },
      timestamp: new Date(),
      severity: 'error'
    });
    
    res.status(500).json({
      error: 'An error occurred while retrieving extracted data',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;