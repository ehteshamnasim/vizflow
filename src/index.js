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
import { WorkflowExecutor } from './core/WorkflowExecutor.js';
import { NodeRegistry } from './core/NodeRegistry.js';
import { 
  NodeExecutorRegistry, 
  BaseNodeExecutor,
  TriggerExecutor,
  ActionExecutor,
  ConditionExecutor,
  LoopExecutor,
  TransformExecutor,
  EndExecutor,
  GenericExecutor,
  ApiDataExecutor
} from './core/NodeExecutors.js';
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
 * Export the WorkflowExecutor for standalone execution
 */
export { WorkflowExecutor };

/**
 * Export the NodeRegistry for advanced customization
 * Allows users to register their own custom node types
 */
export { NodeRegistry };

/**
 * Export the NodeExecutorRegistry for custom executor registration
 */
export { NodeExecutorRegistry };

/**
 * Export base executor class for creating custom executors
 */
export { 
  BaseNodeExecutor,
  TriggerExecutor,
  ActionExecutor,
  ConditionExecutor,
  LoopExecutor,
  TransformExecutor,
  EndExecutor,
  GenericExecutor,
  ApiDataExecutor
};

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
 * Export security utilities
 */
export { escapeHtml, sanitizeAttribute, safeJsonParse } from './utils/sanitizer.js';

/**
 * Helper function to create a node definition
 * 
 * @param {Object} config - Node configuration
 * @returns {Object} Complete node definition
 * 
 * EXAMPLE:
 *   const myNode = createNodeDefinition({
 *     label: 'My Node',
 *     icon: icons.code,
 *     color: '#4CAF50',
 *     inputs: 1,
 *     outputs: 2,
 *     fields: [
 *       { name: 'config', label: 'Config', type: 'text' }
 *     ]
 *   });
 */
export function createNodeDefinition(config) {
  return {
    label: config.label || 'Custom Node',
    icon: config.icon || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>',
    color: config.color || '#6B7280',
    description: config.description || '',
    inputs: config.inputs ?? 1,
    outputs: config.outputs ?? 1,
    fields: config.fields || []
  };
}

/**
 * Helper function to create a custom executor
 * 
 * @param {Function} executeFn - The execute function (node, config, context, signal) => result
 * @param {Array} configSchema - Optional config schema for the executor
 * @returns {Class} Executor class that can be registered
 * 
 * EXAMPLE:
 *   const MyExecutor = createCustomExecutor(
 *     async (node, config, context) => {
 *       return { output: 'output_1', data: { result: 'done' } };
 *     },
 *     [{ key: 'param', label: 'Parameter', type: 'text' }]
 *   );
 *   NodeExecutorRegistry.register('myNode', MyExecutor);
 */
export function createCustomExecutor(executeFn, configSchema = []) {
  return class CustomExecutor extends BaseNodeExecutor {
    static getConfigSchema() {
      return configSchema;
    }
    
    static async execute(node, config, context, signal) {
      return executeFn(node, config, context, signal);
    }
  };
}

/**
 * Default Export
 * Provides the WorkflowBuilder as the default export for convenience
 */
export default WorkflowBuilder;
