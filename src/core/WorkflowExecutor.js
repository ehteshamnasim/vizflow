/**
 * WorkflowExecutor - Executes workflows step by step
 * Handles node traversal, data passing, status updates, and error handling
 */

import { NodeExecutorRegistry } from './NodeExecutors.js';

export class WorkflowExecutor {
  constructor(workflowBuilder) {
    this.builder = workflowBuilder;
    this.drawflow = workflowBuilder.drawflow;
    this.container = workflowBuilder.container;
    
    // Execution state
    this.isRunning = false;
    this.isPaused = false;
    this.currentNodeId = null;
    this.executionContext = {};  // Data passed between nodes
    this.executionHistory = [];  // Log of execution steps
    this.nodeStates = new Map(); // nodeId -> state (pending, running, success, failed, skipped)
    
    // Event callbacks
    this.onNodeStart = null;
    this.onNodeComplete = null;
    this.onNodeError = null;
    this.onExecutionStart = null;
    this.onExecutionComplete = null;
    this.onExecutionError = null;
    
    // Execution settings
    this.stepDelay = 500; // ms delay between steps for visualization
    this.abortController = null;
  }

  /**
   * Get all nodes from the workflow
   */
  getNodes() {
    const exportData = this.drawflow.export();
    const nodes = {};
    
    Object.entries(exportData.drawflow?.Home?.data || {}).forEach(([id, node]) => {
      nodes[id] = {
        id: parseInt(id),
        name: node.name,
        class: node.class,
        data: node.data || {},
        inputs: node.inputs,
        outputs: node.outputs,
        pos_x: node.pos_x,
        pos_y: node.pos_y
      };
    });
    
    return nodes;
  }

  /**
   * Find start nodes (trigger nodes with outgoing connections)
   * Only returns nodes that are actually part of a workflow
   */
  findStartNodes() {
    const nodes = this.getNodes();
    const startNodes = [];
    
    Object.values(nodes).forEach(node => {
      // Skip collapsed group placeholder nodes
      if (node.name === 'collapsed-group') return;
      
      const hasIncoming = Object.values(node.inputs || {}).some(
        input => input.connections && input.connections.length > 0
      );
      
      const hasOutgoing = Object.values(node.outputs || {}).some(
        output => output.connections && output.connections.length > 0
      );
      
      // Node is a start node if:
      // 1. It has no incoming connections AND
      // 2. It has outgoing connections (is part of a workflow) OR is a trigger type
      if (!hasIncoming && (hasOutgoing || node.name === 'trigger' || node.name === 'start')) {
        // Only include if it has outgoing connections (actually connected to something)
        if (hasOutgoing) {
          startNodes.push(node);
        }
      }
    });
    
    // Sort by position (top-left first)
    startNodes.sort((a, b) => {
      if (Math.abs(a.pos_y - b.pos_y) < 50) {
        return a.pos_x - b.pos_x;
      }
      return a.pos_y - b.pos_y;
    });
    
    return startNodes;
  }

  /**
   * Get next nodes connected to output of given node
   */
  getNextNodes(nodeId, outputKey = null) {
    const nodes = this.getNodes();
    const node = nodes[nodeId];
    if (!node) return [];
    
    const nextNodes = [];
    let outputs = node.outputs || {};
    
    // If specific output key requested, filter to just that one
    if (outputKey && outputs[outputKey]) {
      outputs = { [outputKey]: outputs[outputKey] };
    } else if (outputKey && !outputs[outputKey]) {
      // Requested output doesn't exist, return empty
      return [];
    }
    
    Object.entries(outputs).forEach(([key, output]) => {
      if (!output || !output.connections) return;
      
      output.connections.forEach(conn => {
        const nextNode = nodes[conn.node];
        // Skip collapsed group placeholder nodes during execution
        if (nextNode && nextNode.name !== 'collapsed-group') {
          nextNodes.push({
            node: nextNode,
            fromOutput: key,
            toInput: conn.output
          });
        }
      });
    });
    
    return nextNodes;
  }

  /**
   * Set node visual state
   */
  setNodeState(nodeId, state) {
    this.nodeStates.set(nodeId, state);
    
    const nodeEl = this.container.querySelector(`#node-${nodeId}`);
    if (!nodeEl) return;
    
    // Remove all state classes
    nodeEl.classList.remove(
      'exec-pending', 'exec-running', 'exec-success', 
      'exec-failed', 'exec-skipped', 'exec-paused'
    );
    
    // Add new state class
    nodeEl.classList.add(`exec-${state}`);
    
    // Add pulse animation for running state
    if (state === 'running') {
      nodeEl.classList.add('exec-pulse');
    } else {
      nodeEl.classList.remove('exec-pulse');
    }
  }

  /**
   * Clear all node states
   */
  clearAllStates() {
    this.nodeStates.clear();
    
    const nodes = this.container.querySelectorAll('.drawflow-node');
    nodes.forEach(node => {
      node.classList.remove(
        'exec-pending', 'exec-running', 'exec-success',
        'exec-failed', 'exec-skipped', 'exec-paused', 'exec-pulse'
      );
    });
  }

  /**
   * Initialize all nodes to pending state
   */
  initializeNodeStates() {
    const nodes = this.getNodes();
    Object.keys(nodes).forEach(nodeId => {
      this.setNodeState(nodeId, 'pending');
    });
  }

  /**
   * Execute a single node
   */
  async executeNode(nodeId) {
    const nodes = this.getNodes();
    const node = nodes[nodeId];
    
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }
    
    this.currentNodeId = nodeId;
    this.setNodeState(nodeId, 'running');
    
    // Fire node start event
    if (this.onNodeStart) {
      this.onNodeStart(nodeId, node);
    }
    
    const startTime = Date.now();
    
    try {
      // Get node configuration
      const config = this.builder.getNodeConfig(nodeId) || {};
      
      // Execute using the appropriate executor
      const executor = NodeExecutorRegistry.getExecutor(node.name);
      const result = await executor.execute(node, config, this.executionContext, this.abortController?.signal);
      
      // Store result in context
      this.executionContext[`node_${nodeId}`] = result;
      this.executionContext.lastResult = result;
      this.executionContext.lastNodeId = nodeId;
      
      // Log execution with FULL details
      this.executionHistory.push({
        nodeId,
        nodeName: node.name,
        status: 'success',
        duration: Date.now() - startTime,
        result,
        config,  // Store the config used
        input: this.executionContext.lastResult || null,  // What was passed in
        timestamp: new Date().toISOString()
      });
      
      this.setNodeState(nodeId, 'success');
      
      // Fire node complete event
      if (this.onNodeComplete) {
        this.onNodeComplete(nodeId, node, result);
      }
      
      return { success: true, result, output: result?.output || 'output_1' };
      
    } catch (error) {
      // Get node configuration for error log
      const config = this.builder.getNodeConfig(nodeId) || {};
      
      // Log error with details
      this.executionHistory.push({
        nodeId,
        nodeName: node.name,
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message,
        config,  // Store config even on failure
        timestamp: new Date().toISOString()
      });
      
      this.setNodeState(nodeId, 'failed');
      
      // Fire node error event
      if (this.onNodeError) {
        this.onNodeError(nodeId, node, error);
      }
      
      return { success: false, error, output: 'error' };
    }
  }

  /**
   * Execute workflow from a starting node
   */
  async executeFromNode(startNodeId) {
    const queue = [startNodeId];
    const visited = new Set();
    
    while (queue.length > 0 && this.isRunning) {
      // Check for pause
      while (this.isPaused && this.isRunning) {
        await this.delay(100);
      }
      
      if (!this.isRunning) break;
      
      const nodeId = queue.shift();
      
      // Skip if already visited (prevents infinite loops)
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      
      // Execute the node
      const result = await this.executeNode(nodeId);
      
      // Add delay for visualization
      await this.delay(this.stepDelay);
      
      if (!this.isRunning) break;
      
      // If execution failed and we don't have error handling, skip to next
      if (!result.success) {
        // Could add error path handling here
        continue;
      }
      
      // Get next nodes based on result output
      // The executor returns which output to follow (e.g., 'output_1' for true branch, 'output_2' for false)
      const outputKey = result.output || 'output_1';
      const nextNodes = this.getNextNodes(nodeId, outputKey);
      
      // Add next nodes to queue
      nextNodes.forEach(n => {
        if (!visited.has(n.node.id)) {
          queue.push(n.node.id);
        }
      });
    }
  }

  /**
   * Start workflow execution
   */
  async start(initialContext = {}) {
    if (this.isRunning) {
      console.warn('Workflow is already running');
      return;
    }
    
    this.isRunning = true;
    this.isPaused = false;
    this.executionContext = { ...initialContext };
    this.executionHistory = [];
    this.abortController = new AbortController();
    
    // Initialize all nodes to pending
    this.initializeNodeStates();
    
    // Fire execution start event
    if (this.onExecutionStart) {
      this.onExecutionStart();
    }
    
    try {
      // Find start nodes
      const startNodes = this.findStartNodes();
      
      if (startNodes.length === 0) {
        throw new Error('No start node found. Add a node without incoming connections.');
      }
      
      // Execute from each start node
      for (const startNode of startNodes) {
        if (!this.isRunning) break;
        await this.executeFromNode(startNode.id);
      }
      
      // Fire execution complete event
      if (this.onExecutionComplete) {
        this.onExecutionComplete(this.executionHistory, this.executionContext);
      }
      
    } catch (error) {
      console.error('Workflow execution error:', error);
      
      if (this.onExecutionError) {
        this.onExecutionError(error);
      }
    }
    
    this.isRunning = false;
    this.currentNodeId = null;
  }

  /**
   * Pause execution
   */
  pause() {
    if (!this.isRunning) return;
    this.isPaused = true;
    
    if (this.currentNodeId) {
      this.setNodeState(this.currentNodeId, 'paused');
    }
  }

  /**
   * Resume execution
   */
  resume() {
    if (!this.isRunning) return;
    this.isPaused = false;
    
    if (this.currentNodeId) {
      this.setNodeState(this.currentNodeId, 'running');
    }
  }

  /**
   * Stop execution
   */
  stop() {
    this.isRunning = false;
    this.isPaused = false;
    
    if (this.abortController) {
      this.abortController.abort();
    }
    
    // Mark current node as stopped
    if (this.currentNodeId) {
      this.setNodeState(this.currentNodeId, 'failed');
    }
  }

  /**
   * Reset execution state
   */
  reset() {
    this.stop();
    this.clearAllStates();
    this.executionContext = {};
    this.executionHistory = [];
  }

  /**
   * Step through execution (execute one node at a time)
   */
  async step() {
    // TODO: Implement step-by-step execution
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get execution log
   */
  getLog() {
    return this.executionHistory;
  }

  /**
   * Get current context
   */
  getContext() {
    return this.executionContext;
  }
}
