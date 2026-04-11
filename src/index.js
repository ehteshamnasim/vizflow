/**
 * ============================================================================
 * FLOWKIT - MAIN ENTRY POINT
 * ============================================================================
 * 
 * This is the main entry file for FlowKit - Visual Workflow Builder.
 * It exports all public APIs that consumers of this package will use.
 * 
 * USAGE EXAMPLE:
 * 
 *   import { WorkflowBuilder } from 'flowkit';
 *   
 *   const workflow = new WorkflowBuilder('#container', {
 *     theme: 'dark',
 *     nodes: ['trigger', 'http', 'condition', 'slack']
 *   });
 * 
 * ============================================================================
 */

import { WorkflowBuilder } from './core/WorkflowBuilder.js';
import { NodeRegistry } from './core/NodeRegistry.js';
import { defaultNodeTypes, icons } from './nodes/defaultNodes.js';

/**
 * Import Drawflow's base CSS first, then our custom styles
 */
import 'drawflow/dist/drawflow.min.css';
import './styles/main.css';

/**
 * Import utility functions
 */
import {
  validateWorkflow,
  getNodesFromWorkflow,
  getConnectionCount,
  findDisconnectedNodes,
  workflowToMermaid,
  cloneWorkflow,
  generateWorkflowId,
  createWorkflowMetadata,
  extractWorkflowData
} from './utils/workflowUtils.js';

/**
 * Export the main WorkflowBuilder class
 * This is the primary way to create workflow instances
 */
export { WorkflowBuilder };

/**
 * Export the NodeRegistry for advanced customization
 * Allows users to register their own custom node types
 */
export { NodeRegistry };

/**
 * Export default node types for reference or extension
 */
export { defaultNodeTypes };

/**
 * Export the SVG icons library for custom node creation
 * Contains 60+ SVG icons that can be used with any node
 */
export { icons };

/**
 * Export utility functions
 */
export {
  validateWorkflow,
  getNodesFromWorkflow,
  getConnectionCount,
  findDisconnectedNodes,
  workflowToMermaid,
  cloneWorkflow,
  generateWorkflowId,
  createWorkflowMetadata,
  extractWorkflowData
};

/**
 * Default Export
 * Provides the WorkflowBuilder as the default export for convenience
 */
export default WorkflowBuilder;
