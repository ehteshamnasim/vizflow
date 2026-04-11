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
      // Keep ID as string for consistent key access
      nodes[id] = {
        id: id,
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
      // Requested output doesn't exist - fall back to processing all outputs
      // This handles nodes with single output that return different output keys
    }
    
    Object.entries(outputs).forEach(([key, output]) => {
      if (!output || !output.connections) return;
      
      output.connections.forEach(conn => {
        // conn.node could be string or number - normalize to string for lookup
        const nextNodeId = String(conn.node);
        const nextNode = nodes[nextNodeId];
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
      
      // Spread result properties so isLoop, data, etc. are accessible
      return { success: true, ...result, output: result?.output || 'output_1' };
      
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
    const queue = [String(startNodeId)];
    const visited = new Set();
    const loopStates = new Map(); // Track loop iterations: nodeId -> { items, index, itemVar, indexVar }
    
    console.log('[Executor] Starting execution from node:', startNodeId);
    
    while (queue.length > 0 && this.isRunning) {
      console.log('[Executor] Queue:', [...queue], 'Visited:', [...visited], 'LoopStates:', [...loopStates.keys()]);
      // Check for pause
      while (this.isPaused && this.isRunning) {
        await this.delay(100);
      }
      
      if (!this.isRunning) break;
      
      const nodeId = String(queue.shift());
      
      // Check if this is a loop node with ongoing iteration
      const loopState = loopStates.get(nodeId);
      if (loopState) {
        // Increment to next iteration
        loopState.index++;
        
        console.log('[Loop] Iteration', loopState.index, 'of', loopState.items.length);
        
        if (loopState.index < loopState.items.length) {
          // More items to process - set context and continue loop body
          this.executionContext[loopState.itemVar] = loopState.items[loopState.index];
          this.executionContext[loopState.indexVar] = loopState.index;
          
          // Re-mark as success for visualization
          this.setNodeState(nodeId, 'success');
          
          // Notify about loop iteration for connection coloring
          if (this.onNodeComplete) {
            this.onNodeComplete(nodeId, { name: 'loop' }, { output: 'output_1' });
          }
          
          // Get next nodes via output_1 (loop body)
          const nextNodes = this.getNextNodes(nodeId, 'output_1');
          nextNodes.forEach(n => queue.push(String(n.node.id)));
          
          // Clear visited for loop body nodes so they can re-execute
          const loopBodyNodes = this.getLoopBodyNodes(nodeId);
          loopBodyNodes.forEach(id => visited.delete(String(id)));
          continue;
        } else {
          // Loop complete - go to output_2 (done)
          loopStates.delete(nodeId);
          this.setNodeState(nodeId, 'success');
          
          // Notify about loop completion for connection coloring
          if (this.onNodeComplete) {
            this.onNodeComplete(nodeId, { name: 'loop' }, { output: 'output_2' });
          }
          
          const nextNodes = this.getNextNodes(nodeId, 'output_2');
          nextNodes.forEach(n => {
            const nid = String(n.node.id);
            if (!visited.has(nid)) {
              queue.push(nid);
            }
          });
          continue;
        }
      }
      
      // Skip if already visited (prevents infinite loops for non-loop nodes)
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      
      // Execute the node
      const result = await this.executeNode(nodeId);
      
      // Add delay for visualization
      await this.delay(this.stepDelay);
      
      if (!this.isRunning) break;
      
      // If execution failed and we don't have error handling, skip to next
      if (!result.success) {
        continue;
      }
      
      // Handle loop nodes specially
      console.log('[Executor] Loop check for node', nodeId, '- isLoop:', result.isLoop, 'data type:', typeof result.data, 'isArray:', Array.isArray(result.data), 'length:', result.data?.length);
      if (result.isLoop && Array.isArray(result.data) && result.data.length > 0) {
        const itemVar = result.itemVariable || 'item';
        const indexVar = result.indexVariable || 'index';
        
        console.log('[Executor] Loop node', nodeId, 'has', result.data.length, 'items to iterate');
        
        // Initialize loop state
        loopStates.set(nodeId, {
          items: result.data,
          index: 0,
          itemVar,
          indexVar
        });
        
        // Set context for first iteration
        this.executionContext[itemVar] = result.data[0];
        this.executionContext[indexVar] = 0;
        
        // Get next nodes via output_1 (loop body)
        const nextNodes = this.getNextNodes(nodeId, 'output_1');
        nextNodes.forEach(n => queue.push(String(n.node.id)));
        continue;
      }
      
      // Handle empty loop - go directly to output_2
      if (result.isLoop && (!result.data || result.data.length === 0)) {
        const nextNodes = this.getNextNodes(nodeId, 'output_2');
        nextNodes.forEach(n => {
          const nid = String(n.node.id);
          if (!visited.has(nid)) {
            queue.push(nid);
          }
        });
        continue;
      }
      
      // Get next nodes based on result output
      const outputKey = result.output || 'output_1';
      const nextNodes = this.getNextNodes(nodeId, outputKey);
      
      console.log('[Executor] Node', nodeId, 'output:', outputKey, 'next nodes:', nextNodes.map(n => n.node.id));
      
      // Add next nodes to queue
      // Allow loop nodes with active states to be re-added even if visited
      nextNodes.forEach(n => {
        const nid = String(n.node.id);
        const willQueue = !visited.has(nid) || loopStates.has(nid);
        console.log('[Executor] Checking node', nid, '- visited:', visited.has(nid), 'loopState:', loopStates.has(nid), 'willQueue:', willQueue);
        if (willQueue) {
          queue.push(nid);
        }
      });
    }
  }
  
  /**
   * Get all nodes in the loop body (nodes reachable from output_1 that lead back to the loop)
   */
  getLoopBodyNodes(loopNodeId) {
    const loopId = String(loopNodeId);
    const bodyNodes = new Set();
    const queue = [];
    
    // Start with nodes connected to output_1
    const firstNodes = this.getNextNodes(loopId, 'output_1');
    firstNodes.forEach(n => queue.push(String(n.node.id)));
    
    while (queue.length > 0) {
      const nodeId = queue.shift();
      if (bodyNodes.has(nodeId) || nodeId === loopId) continue;
      bodyNodes.add(nodeId);
      
      // Get all outputs from this node
      const allNextNodes = this.getNextNodes(nodeId, null);
      allNextNodes.forEach(n => {
        const nid = String(n.node.id);
        if (!bodyNodes.has(nid)) {
          queue.push(nid);
        }
      });
    }
    
    return bodyNodes;
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
