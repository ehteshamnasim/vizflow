/**
 * ============================================================================
 * WORKFLOW UTILITIES
 * ============================================================================
 * 
 * Helper functions for working with workflow data.
 * These utilities can be used to:
 *   - Validate workflow data
 *   - Convert between formats
 *   - Analyze workflow structure
 *   - Generate workflow metadata
 * 
 * ============================================================================
 */


/**
 * ----------------------------------------------------------------------------
 * VALIDATE WORKFLOW
 * ----------------------------------------------------------------------------
 * 
 * Validates a workflow data structure to ensure it's complete and correct.
 * 
 * @param {Object} workflowData - The workflow data to validate
 * @returns {Object} Validation result with isValid flag and any errors
 * 
 * EXAMPLE:
 *   const result = validateWorkflow(data);
 *   if (!result.isValid) {
 *     console.error(result.errors);
 *   }
 * 
 * ----------------------------------------------------------------------------
 */
export function validateWorkflow(workflowData) {
  const errors = [];
  const warnings = [];

  /**
   * Check basic structure
   */
  if (!workflowData || typeof workflowData !== 'object') {
    errors.push('Workflow data must be an object');
    return { isValid: false, errors, warnings };
  }

  if (!workflowData.drawflow) {
    errors.push('Missing "drawflow" property');
    return { isValid: false, errors, warnings };
  }

  /**
   * Get nodes from the workflow
   */
  const nodes = getNodesFromWorkflow(workflowData);

  /**
   * Check for at least one node
   */
  if (nodes.length === 0) {
    warnings.push('Workflow has no nodes');
  }

  /**
   * Check for trigger node (start point)
   */
  const triggerNodes = nodes.filter(n => n.name === 'trigger');
  if (triggerNodes.length === 0) {
    warnings.push('Workflow has no trigger node (starting point)');
  }

  /**
   * Check for end node
   */
  const endNodes = nodes.filter(n => n.name === 'end');
  if (endNodes.length === 0) {
    warnings.push('Workflow has no end node');
  }

  /**
   * Check for disconnected nodes
   */
  const disconnectedNodes = findDisconnectedNodes(workflowData);
  if (disconnectedNodes.length > 0) {
    warnings.push(`${disconnectedNodes.length} node(s) are not connected`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    stats: {
      nodeCount: nodes.length,
      connectionCount: getConnectionCount(workflowData),
      hasTrigger: triggerNodes.length > 0,
      hasEnd: endNodes.length > 0
    }
  };
}


/**
 * ----------------------------------------------------------------------------
 * GET NODES FROM WORKFLOW
 * ----------------------------------------------------------------------------
 * 
 * Extracts all nodes from a workflow data structure as an array.
 * 
 * @param {Object} workflowData - The workflow data
 * @returns {Array} Array of node objects with their IDs
 * 
 * ----------------------------------------------------------------------------
 */
export function getNodesFromWorkflow(workflowData) {
  try {
    const moduleData = workflowData.drawflow.Home.data;
    return Object.entries(moduleData).map(([id, node]) => ({
      id: parseInt(id),
      ...node
    }));
  } catch (error) {
    return [];
  }
}


/**
 * ----------------------------------------------------------------------------
 * GET CONNECTION COUNT
 * ----------------------------------------------------------------------------
 * 
 * Counts the total number of connections in a workflow.
 * 
 * @param {Object} workflowData - The workflow data
 * @returns {number} Total connection count
 * 
 * ----------------------------------------------------------------------------
 */
export function getConnectionCount(workflowData) {
  const nodes = getNodesFromWorkflow(workflowData);
  let count = 0;

  nodes.forEach(node => {
    Object.values(node.outputs || {}).forEach(output => {
      count += (output.connections || []).length;
    });
  });

  return count;
}


/**
 * ----------------------------------------------------------------------------
 * FIND DISCONNECTED NODES
 * ----------------------------------------------------------------------------
 * 
 * Finds nodes that have no connections (neither inputs nor outputs connected).
 * 
 * @param {Object} workflowData - The workflow data
 * @returns {Array} Array of disconnected node IDs
 * 
 * ----------------------------------------------------------------------------
 */
export function findDisconnectedNodes(workflowData) {
  const nodes = getNodesFromWorkflow(workflowData);
  const disconnected = [];

  nodes.forEach(node => {
    /**
     * Check if node has any input connections
     */
    let hasInputs = false;
    Object.values(node.inputs || {}).forEach(input => {
      if ((input.connections || []).length > 0) {
        hasInputs = true;
      }
    });

    /**
     * Check if node has any output connections
     */
    let hasOutputs = false;
    Object.values(node.outputs || {}).forEach(output => {
      if ((output.connections || []).length > 0) {
        hasOutputs = true;
      }
    });

    /**
     * Trigger nodes don't need inputs
     * End nodes don't need outputs
     */
    const isTrigger = node.name === 'trigger';
    const isEnd = node.name === 'end';

    if (!isTrigger && !hasInputs && !isEnd && !hasOutputs) {
      disconnected.push(node.id);
    }
  });

  return disconnected;
}


/**
 * ----------------------------------------------------------------------------
 * WORKFLOW TO MERMAID
 * ----------------------------------------------------------------------------
 * 
 * Converts a workflow to Mermaid diagram syntax for documentation.
 * 
 * @param {Object} workflowData - The workflow data
 * @returns {string} Mermaid diagram syntax
 * 
 * EXAMPLE OUTPUT:
 *   flowchart TD
 *     node1[Trigger] --> node2[Condition]
 *     node2 --> node3[Email]
 *     node2 --> node4[Action]
 * 
 * ----------------------------------------------------------------------------
 */
export function workflowToMermaid(workflowData) {
  const nodes = getNodesFromWorkflow(workflowData);
  const lines = ['flowchart TD'];

  /**
   * Create node definitions
   */
  nodes.forEach(node => {
    const label = node.data?.name || node.name || `Node ${node.id}`;
    const shape = getNodeShape(node.name);
    lines.push(`    node${node.id}${shape[0]}${label}${shape[1]}`);
  });

  /**
   * Create connections
   */
  nodes.forEach(node => {
    Object.values(node.outputs || {}).forEach(output => {
      (output.connections || []).forEach(conn => {
        lines.push(`    node${node.id} --> node${conn.node}`);
      });
    });
  });

  return lines.join('\n');
}


/**
 * ----------------------------------------------------------------------------
 * GET NODE SHAPE (Helper)
 * ----------------------------------------------------------------------------
 * 
 * Returns Mermaid shape characters based on node type.
 * 
 * @param {string} nodeType - The type of node
 * @returns {Array} Opening and closing shape characters
 * 
 * ----------------------------------------------------------------------------
 */
function getNodeShape(nodeType) {
  const shapes = {
    trigger: ['([', '])'],     // Stadium shape
    condition: ['{', '}'],     // Diamond
    end: ['((', '))'],         // Circle
    default: ['[', ']']        // Rectangle
  };

  return shapes[nodeType] || shapes.default;
}


/**
 * ----------------------------------------------------------------------------
 * CLONE WORKFLOW
 * ----------------------------------------------------------------------------
 * 
 * Creates a deep copy of workflow data.
 * 
 * @param {Object} workflowData - The workflow data to clone
 * @returns {Object} Cloned workflow data
 * 
 * ----------------------------------------------------------------------------
 */
export function cloneWorkflow(workflowData) {
  return JSON.parse(JSON.stringify(workflowData));
}


/**
 * ----------------------------------------------------------------------------
 * GENERATE WORKFLOW ID
 * ----------------------------------------------------------------------------
 * 
 * Generates a unique ID for a workflow.
 * 
 * @returns {string} Unique workflow ID
 * 
 * ----------------------------------------------------------------------------
 */
export function generateWorkflowId() {
  return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}


/**
 * ----------------------------------------------------------------------------
 * CREATE WORKFLOW METADATA
 * ----------------------------------------------------------------------------
 * 
 * Creates metadata wrapper for a workflow (for saving/loading).
 * 
 * @param {Object} workflowData - The raw workflow data from Drawflow
 * @param {Object} options - Additional metadata options
 * @returns {Object} Workflow with metadata wrapper
 * 
 * EXAMPLE:
 *   const saved = createWorkflowMetadata(workflow.export(), {
 *     name: 'My Workflow',
 *     description: 'Handles user signups'
 *   });
 * 
 * ----------------------------------------------------------------------------
 */
export function createWorkflowMetadata(workflowData, options = {}) {
  return {
    id: options.id || generateWorkflowId(),
    name: options.name || 'Untitled Workflow',
    description: options.description || '',
    version: options.version || '1.0.0',
    created: options.created || new Date().toISOString(),
    modified: new Date().toISOString(),
    author: options.author || 'Unknown',
    tags: options.tags || [],
    workflow: workflowData
  };
}


/**
 * ----------------------------------------------------------------------------
 * EXTRACT WORKFLOW DATA
 * ----------------------------------------------------------------------------
 * 
 * Extracts the raw workflow data from a metadata wrapper.
 * 
 * @param {Object} savedWorkflow - Workflow with metadata
 * @returns {Object} Raw workflow data for importing into Drawflow
 * 
 * ----------------------------------------------------------------------------
 */
export function extractWorkflowData(savedWorkflow) {
  if (savedWorkflow.workflow) {
    return savedWorkflow.workflow;
  }
  return savedWorkflow;
}
