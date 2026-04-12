/**
 * ============================================================================
 * WORKFLOW BUILDER - CORE CLASS
 * ============================================================================
 * 
 * The WorkflowBuilder class is the heart of this package. It wraps Drawflow
 * with an intuitive API, custom theming, and pre-built node types.
 * 
 * FEATURES:
 *   - Drag and drop node placement
 *   - Visual connection drawing between nodes
 *   - Custom node types with configurable fields
 *   - Dark/Light theme support
 *   - Save and load workflow data
 *   - Zoom and pan controls
 *   - Undo/Redo support
 *   - Event system for workflow changes
 * 
 * ARCHITECTURE:
 * 
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │                      WorkflowBuilder                            │
 *   ├─────────────────────────────────────────────────────────────────┤
 *   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
 *   │  │   Sidebar   │  │   Canvas    │  │      Properties Panel   │ │
 *   │  │  (Nodes)    │  │  (Drawflow) │  │   (Node Configuration)  │ │
 *   │  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
 *   └─────────────────────────────────────────────────────────────────┘
 * 
 * ============================================================================
 */

import Drawflow from 'drawflow';
import { NodeRegistry } from './NodeRegistry.js';
import { defaultNodeTypes } from '../nodes/defaultNodes.js';
import { WorkflowExecutor } from './WorkflowExecutor.js';
import { NodeExecutorRegistry } from './NodeExecutors.js';

export class WorkflowBuilder {
  
  /**
   * --------------------------------------------------------------------------
   * CONSTRUCTOR
   * --------------------------------------------------------------------------
   * 
   * Creates a new WorkflowBuilder instance and initializes all components.
   * 
   * @param {string|HTMLElement} container - CSS selector or DOM element
   * @param {Object} options - Configuration options
   * @param {string} options.theme - 'light' or 'dark' (default: 'light')
   * @param {Array} options.nodes - Array of node type names to enable
   * @param {Function} options.onSave - Callback when workflow is saved
   * @param {Function} options.onChange - Callback when workflow changes
   * @param {Object} options.customNodes - Custom node type definitions
   * 
   * EXAMPLE:
   *   const workflow = new WorkflowBuilder('#app', {
   *     theme: 'dark',
   *     nodes: ['trigger', 'email', 'condition', 'api'],
   *     onChange: (data) => console.log('Workflow changed:', data)
   *   });
   * 
   * --------------------------------------------------------------------------
   */
  constructor(container, options = {}) {
    /**
     * Store configuration with defaults
     */
    this.options = {
      theme: 'light',
      mode: 'edit',  // 'edit' or 'view'
      nodes: ['trigger', 'action', 'condition', 'email', 'api', 'delay', 'end'],
      onSave: null,
      onChange: null,
      customNodes: {},
      // New options
      background: 'dots',      // 'none' | 'dots' | 'lines' | 'grid'
      edgeType: 'bezier',      // 'bezier' | 'straight' | 'step'
      minimap: true,           // Show minimap navigation
      snapToGrid: false,       // Snap nodes to grid
      gridSize: 20,            // Grid size for snapping
      animatedEdges: false,    // Animate edges with flowing dots
      showArrows: true,        // Show arrow markers on edges
      ...options
    };

    /**
     * Initialize internal state
     */
    this.container = null;
    this.drawflow = null;
    this.nodeRegistry = new NodeRegistry();
    this.history = [];
    this.historyIndex = -1;
    this.maxHistoryLength = 50;
    this.mode = this.options.mode;  // Store current mode
    
    /**
     * Clipboard for copy/paste
     */
    this.clipboard = null;
    
    /**
     * Toggle states
     */
    this.minimapVisible = this.options.minimap;
    this.snapEnabled = this.options.snapToGrid;
    this.animateEnabled = this.options.animatedEdges;
    
    /**
     * Multi-select state
     */
    this.selectedNodes = new Set();
    this.isSelecting = false;
    this.selectionStart = { x: 0, y: 0 };
    
    /**
     * Node groups state
     */
    this.groups = new Map();  // groupId -> { nodeIds: Set, label: string, color: string, collapsed: boolean, savedConnections: [] }
    this.nextGroupId = 1;
    this.collapsedGroupNodes = new Map(); // groupId -> nodeId of collapsed placeholder
    
    /**
     * Node configurations for execution
     */
    this.nodeConfigs = new Map(); // nodeId -> configuration object
    
    /**
     * Workflow executor instance
     */
    this.executor = null; // Initialized after Drawflow is ready
    
    /**
     * Search filter state
     */
    this.searchFilter = '';

    /**
     * Bootstrap the workflow builder
     */
    this._initializeContainer(container);
    this._registerDefaultNodes();
    this._registerCustomNodes();
    this._buildUserInterface();
    this._initializeDrawflow();
    this._setupEventListeners();
    this._applyTheme();
  }


  /**
   * --------------------------------------------------------------------------
   * PRIVATE: INITIALIZE CONTAINER
   * --------------------------------------------------------------------------
   * 
   * Resolves the container element and prepares it for the workflow builder.
   * Handles both CSS selector strings and direct DOM element references.
   * 
   * @param {string|HTMLElement} container - Container reference
   * @throws {Error} If container cannot be found
   * 
   * --------------------------------------------------------------------------
   */
  _initializeContainer(container) {
    if (typeof container === 'string') {
      this.container = document.querySelector(container);
    } else if (container instanceof HTMLElement) {
      this.container = container;
    }

    if (!this.container) {
      throw new Error(
        `WorkflowBuilder: Container not found. ` +
        `Please provide a valid CSS selector or DOM element.`
      );
    }

    /**
     * Add base class for styling
     */
    this.container.classList.add('workflow-builder');
    this.container.classList.add(`theme-${this.options.theme}`);
    this.container.classList.add(`mode-${this.options.mode}`);
    this.container.classList.add(`bg-${this.options.background}`);
  }


  /**
   * --------------------------------------------------------------------------
   * PRIVATE: REGISTER DEFAULT NODES
   * --------------------------------------------------------------------------
   * 
   * Registers all built-in node types with the NodeRegistry.
   * Only nodes specified in options.nodes will be available.
   * 
   * --------------------------------------------------------------------------
   */
  _registerDefaultNodes() {
    Object.entries(defaultNodeTypes).forEach(([name, definition]) => {
      if (this.options.nodes.includes(name)) {
        this.nodeRegistry.register(name, definition);
      }
    });
  }


  /**
   * --------------------------------------------------------------------------
   * PRIVATE: REGISTER CUSTOM NODES
   * --------------------------------------------------------------------------
   * 
   * Registers any custom node types provided in options.
   * Custom nodes extend or override the default node types.
   * 
   * --------------------------------------------------------------------------
   */
  _registerCustomNodes() {
    Object.entries(this.options.customNodes).forEach(([name, definition]) => {
      this.nodeRegistry.register(name, definition);
    });
  }


  /**
   * --------------------------------------------------------------------------
   * PUBLIC: REGISTER NODE
   * --------------------------------------------------------------------------
   * 
   * Registers a custom node type at runtime.
   * The node will appear in the sidebar and can be dragged onto the canvas.
   * 
   * @param {string} name - Unique identifier for the node type
   * @param {Object} definition - Node configuration
   * @param {string} definition.label - Display name
   * @param {string} definition.icon - Text icon (single letter or short text)
   * @param {string} definition.description - Short description
   * @param {number} definition.inputs - Number of input connections
   * @param {number} definition.outputs - Number of output connections
   * @param {Array} definition.fields - Form fields for the node
   * 
   * EXAMPLE:
   *   workflow.registerNode('slack', {
   *     label: 'Slack',
   *     icon: 'S',
   *     description: 'Send a Slack message',
   *     inputs: 1,
   *     outputs: 1,
   *     fields: [
   *       { name: 'channel', label: 'Channel', type: 'text', placeholder: '#general' },
   *       { name: 'message', label: 'Message', type: 'textarea', placeholder: 'Your message...' }
   *     ]
   *   });
   * 
   * --------------------------------------------------------------------------
   */
  registerNode(name, definition) {
    // Register with the node registry
    this.nodeRegistry.register(name, definition);
    
    // Add to the sidebar palette
    const palette = this.container.querySelector('.node-palette');
    if (palette) {
      const itemHtml = `
        <div class="node-item" draggable="true" data-node-type="${name}">
          <div class="node-item-icon">${definition.icon}</div>
          <div class="node-item-info">
            <span class="node-item-name">${definition.label}</span>
            <span class="node-item-desc">${definition.description || ''}</span>
          </div>
        </div>
      `;
      palette.insertAdjacentHTML('beforeend', itemHtml);
      
      // Setup drag for the new node
      const newItem = palette.querySelector(`[data-node-type="${name}"]`);
      if (newItem) {
        this._setupNodeItemDrag(newItem);
      }
    }
    
    return this;
  }


  /**
   * --------------------------------------------------------------------------
   * PRIVATE: BUILD USER INTERFACE
   * --------------------------------------------------------------------------
   * 
   * Constructs the complete UI structure:
   * 
   *   ┌──────────┬────────────────────────┬──────────────┐
   *   │          │                        │              │
   *   │ SIDEBAR  │       CANVAS           │  PROPERTIES  │
   *   │ (Nodes)  │     (Drawflow)         │    PANEL     │
   *   │          │                        │              │
   *   └──────────┴────────────────────────┴──────────────┘
   *   │                 TOOLBAR                          │
   *   └──────────────────────────────────────────────────┘
   * 
   * --------------------------------------------------------------------------
   */
  _buildUserInterface() {
    if (this.mode === 'view') {
      this._buildViewModeUI();
    } else {
      this._buildEditModeUI();
    }
  }

  /**
   * --------------------------------------------------------------------------
   * PRIVATE: BUILD VIEW MODE UI
   * --------------------------------------------------------------------------
   * 
   * Constructs a simplified read-only UI for viewing workflows.
   * No sidebar, properties panel, or edit controls.
   * 
   * --------------------------------------------------------------------------
   */
  _buildViewModeUI() {
    this.container.innerHTML = `
      <div class="workflow-wrapper">
        
        <!-- VIEW MODE HEADER - Minimal -->
        <header class="workflow-header view-header">
          <div class="workflow-title">
            <span class="workflow-icon">W</span>
            <h1>Workflow Viewer</h1>
          </div>
          <div class="workflow-actions">
            <button class="btn btn-secondary" data-action="zoom-in" title="Zoom In">+</button>
            <button class="btn btn-secondary" data-action="zoom-out" title="Zoom Out">−</button>
            <button class="btn btn-secondary" data-action="fit-screen" title="Fit to Screen">⊡</button>
          </div>
        </header>

        <!-- VIEW MODE MAIN - Full canvas only -->
        <main class="workflow-main view-main">
          <section class="workflow-canvas-container view-canvas-container">
            <div id="drawflow-canvas" class="workflow-canvas"></div>
          </section>
        </main>

        <!-- VIEW MODE FOOTER -->
        <footer class="workflow-footer">
          <div class="status-left">
            <span class="node-count">Nodes: 0</span>
            <span class="connection-count">Connections: 0</span>
          </div>
          <div class="status-right">
            <span class="status-message">View Only</span>
          </div>
        </footer>

      </div>
    `;
  }

  /**
   * --------------------------------------------------------------------------
   * PRIVATE: BUILD EDIT MODE UI
   * --------------------------------------------------------------------------
   * 
   * Constructs the full editing UI with sidebar, canvas, and properties panel.
   * 
   * --------------------------------------------------------------------------
   */
  _buildEditModeUI() {
    this.container.innerHTML = `
      <div class="workflow-wrapper">
        
        <!-- 
          HEADER SECTION
          Contains title and main action buttons 
        -->
        <header class="workflow-header">
          <div class="workflow-title">
            <a href="/docs.html" target="_blank" class="workflow-title-link">
              <span class="workflow-icon">FK</span>
              <h1>FlowKit</h1>
            </a>
          </div>
          <div class="workflow-actions">
            <div class="dropdown" id="examples-dropdown">
              <button class="btn btn-secondary dropdown-toggle" data-action="toggle-examples">
                Examples
                <span class="dropdown-arrow">▼</span>
              </button>
              <div class="dropdown-menu" id="examples-menu">
                <div class="dropdown-item" data-example="api-test">API Request Test</div>
                <div class="dropdown-item" data-example="data-pipeline">Data Pipeline</div>
                <div class="dropdown-item" data-example="condition-flow">Conditional Flow</div>
                <div class="dropdown-item" data-example="loop-example">Loop Through Data</div>
                <div class="dropdown-item" data-example="notification-flow">Notification Flow</div>
                <div class="dropdown-item" data-example="error-handling">Error Handling</div>
                <div class="dropdown-divider"></div>
                <div class="dropdown-item" data-example="full-api-workflow">Full API Workflow</div>
                <div class="dropdown-item" data-example="data-enrichment">Data Enrichment</div>
                <div class="dropdown-item" data-example="multi-channel-notify">Multi-Channel Alert</div>
                <div class="dropdown-item" data-example="etl-pipeline">ETL Pipeline</div>
              </div>
            </div>
            <button class="btn btn-secondary" data-action="validate" data-tooltip="Validate Workflow">Validate</button>
            <button class="btn btn-secondary" data-action="clear" data-tooltip="Clear Canvas">Clear</button>
            <button class="btn btn-secondary" data-action="import" data-tooltip="Import JSON">Import</button>
            <button class="btn btn-secondary" data-action="export-image" data-tooltip="Export as PNG">Image</button>
            <button class="btn btn-primary" data-action="export" data-tooltip="Export as JSON">Export</button>
            <a href="/docs.html" target="_blank" class="btn btn-primary" data-tooltip="API Documentation">Docs</a>
          </div>
        </header>

        <!-- 
          MAIN CONTENT AREA
          Three-column layout: Sidebar | Canvas | Properties 
        -->
        <main class="workflow-main">
          
          <!-- 
            SIDEBAR: Node Palette
            Draggable nodes that can be dropped onto the canvas 
          -->
          <aside class="workflow-sidebar">
            <div class="sidebar-header">
              <div class="sidebar-header-top">
                <h2>Nodes</h2>
                <button class="btn-create-node" data-action="create-node" title="Create Custom Node">+</button>
              </div>
              <span class="sidebar-hint">Drag to canvas</span>
            </div>
            <div class="sidebar-search">
              <input type="text" id="node-search" placeholder="Search nodes..." />
            </div>
            <div class="node-palette">
              ${this._buildNodePalette()}
            </div>
          </aside>

          <!-- 
            CANVAS: Main Drawflow Area
            This is where the workflow diagram is rendered 
          -->
          <section class="workflow-canvas-container">
            <div class="canvas-toolbar">
              <div class="zoom-controls">
                <button class="toolbar-btn" data-action="zoom-in" data-tooltip="Zoom In">
                  <span>+</span>
                </button>
                <span class="zoom-level">100%</span>
                <button class="toolbar-btn" data-action="zoom-out" data-tooltip="Zoom Out">
                  <span>−</span>
                </button>
                <button class="toolbar-btn" data-action="zoom-reset" data-tooltip="Reset Zoom">
                  <span>⟲</span>
                </button>
                <button class="toolbar-btn" data-action="fit-view" data-tooltip="Fit View">
                  <span>⊡</span>
                </button>
              </div>
              <div class="toggle-controls">
                <button class="toolbar-btn toggle-btn" data-action="toggle-minimap" data-tooltip="Minimap">
                  <span>M</span>
                </button>
                <button class="toolbar-btn toggle-btn" data-action="toggle-snap" data-tooltip="Snap to Grid">
                  <span>⊞</span>
                </button>
                <button class="toolbar-btn toggle-btn" data-action="toggle-animate" data-tooltip="Animated Edges">
                  <span>⟿</span>
                </button>
              </div>
              <div class="history-controls">
                <button class="toolbar-btn" data-action="undo" data-tooltip="Undo (Ctrl+Z)" disabled>
                  <span>↶</span>
                </button>
                <button class="toolbar-btn" data-action="redo" data-tooltip="Redo (Ctrl+Y)" disabled>
                  <span>↷</span>
                </button>
              </div>
              <div class="execution-controls">
                <button class="toolbar-btn exec-btn" data-action="exec-run" data-tooltip="Run Workflow">
                  <span>▶</span>
                </button>
                <button class="toolbar-btn exec-btn" data-action="exec-pause" data-tooltip="Pause" disabled>
                  <span>⏸</span>
                </button>
                <button class="toolbar-btn exec-btn" data-action="exec-stop" data-tooltip="Stop" disabled>
                  <span>⏹</span>
                </button>
                <button class="toolbar-btn exec-btn" data-action="exec-reset" data-tooltip="Reset">
                  <span>↺</span>
                </button>
                <button class="toolbar-btn exec-btn" data-action="exec-log" data-tooltip="Execution Log">
                  <span>L</span>
                </button>
              </div>
            </div>
            <div id="drawflow-canvas" class="workflow-canvas">
              <!-- SVG Markers for Arrow Heads -->
              <svg style="position:absolute;width:0;height:0;">
                <defs>
                  <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#5A8DEE"/>
                  </marker>
                  <marker id="arrowhead-hover" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#3B7DDD"/>
                  </marker>
                </defs>
              </svg>
            </div>
            <!-- Selection Box for Multi-select (outside canvas precanvas) -->
            <div class="selection-box" id="selection-box"></div>
            
            <!-- Minimap for navigation -->
            <div class="workflow-minimap" id="workflow-minimap">
              <div class="minimap-header">
                <span>Minimap</span>
                <button class="minimap-close" data-action="toggle-minimap">×</button>
              </div>
              <div class="minimap-content"></div>
              <div class="minimap-viewport"></div>
            </div>
          </section>

          <!-- 
            PROPERTIES PANEL: Node Configuration
            Shows editable fields when a node is selected 
          -->
          <aside class="workflow-properties">
            <div class="properties-header">
              <h2>Properties</h2>
            </div>
            <div class="properties-content">
              <div class="properties-empty">
                <span class="empty-icon">^</span>
                <p>Select a node to edit its properties</p>
              </div>
            </div>
          </aside>

        </main>

        <!-- 
          FOOTER: Status Bar
          Shows workflow statistics and status messages 
        -->
        <footer class="workflow-footer">
          <div class="status-left">
            <span class="node-count">Nodes: 0</span>
            <span class="connection-count">Connections: 0</span>
          </div>
          <div class="status-right">
            <span class="status-message">Ready</span>
          </div>
        </footer>

      </div>

      <!-- 
        HIDDEN FILE INPUT
        Used for importing workflow JSON files 
      -->
      <input type="file" id="import-file" accept=".json" style="display: none;">
      
      <!-- 
        CREATE NODE MODAL
        Dialog for creating custom node types 
      -->
      <div class="modal-overlay" id="create-node-modal">
        <div class="modal">
          <div class="modal-header">
            <h3>Create Custom Node</h3>
            <button class="modal-close" data-action="close-modal">&times;</button>
          </div>
          <div class="modal-body">
            <div class="modal-field">
              <label>Node Name *</label>
              <input type="text" id="new-node-name" placeholder="e.g., MyNode" />
            </div>
            <div class="modal-field">
              <label>Icon (1-3 characters)</label>
              <input type="text" id="new-node-icon" placeholder="e.g., MN" maxlength="3" />
            </div>
            <div class="modal-field">
              <label>Description</label>
              <input type="text" id="new-node-description" placeholder="What does this node do?" />
            </div>
            <div class="modal-row">
              <div class="modal-field">
                <label>Inputs</label>
                <input type="number" id="new-node-inputs" value="1" min="0" max="5" />
              </div>
              <div class="modal-field">
                <label>Outputs</label>
                <input type="number" id="new-node-outputs" value="1" min="0" max="5" />
              </div>
            </div>
            <div class="modal-field">
              <label>Fields (one per line: name:type)</label>
              <textarea id="new-node-fields" placeholder="fieldName:text&#10;dropdown:select&#10;message:textarea"></textarea>
              <span class="modal-hint">Types: text, number, select, textarea, checkbox</span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-action="close-modal">Cancel</button>
            <button class="btn btn-primary" data-action="save-custom-node">Create Node</button>
          </div>
        </div>
      </div>
      
      <!-- CONFIRMATION MODAL -->
      <div class="modal-overlay" id="confirm-modal">
        <div class="modal" style="max-width: 400px;">
          <div class="modal-header">
            <h3 id="confirm-modal-title">Confirm</h3>
            <button class="modal-close" data-action="close-confirm">&times;</button>
          </div>
          <div class="modal-body">
            <p id="confirm-modal-message" style="color: var(--text-dark); margin: 0;"></p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-action="confirm-cancel">Cancel</button>
            <button class="btn btn-primary" data-action="confirm-ok">Confirm</button>
          </div>
        </div>
      </div>
      
      <!-- 
        NODE CONFIG PANEL
        Panel for configuring node execution settings 
      -->
      <div class="config-panel-backdrop" id="config-panel-backdrop"></div>
      <div class="node-config-panel" id="node-config-panel">
        <div class="config-panel-header">
          <h3>Node Configuration</h3>
          <button class="config-panel-close" data-action="close-config">&times;</button>
        </div>
        <div class="config-panel-body">
          <div class="config-panel-loading">Loading configuration...</div>
        </div>
        <div class="config-panel-footer">
          <button class="btn btn-secondary" data-action="close-config">Cancel</button>
          <button class="btn btn-primary" data-action="save-config">Save Configuration</button>
        </div>
      </div>
      
      <!-- 
        EXECUTION LOG PANEL
        Shows execution history and results 
      -->
      <div class="execution-log-panel" id="execution-log-panel">
        <div class="log-panel-header">
          <h3>Execution Log</h3>
          <button class="log-panel-close" data-action="close-log">&times;</button>
        </div>
        <div class="log-panel-body">
          <div class="log-empty">No execution history yet. Run your workflow to see logs.</div>
        </div>
      </div>
      
      <!-- 
        NODE CONFIG TOOLTIP
        Shows config summary on hover 
      -->
      <div class="node-config-tooltip" id="node-config-tooltip"></div>
    `;
  }


  /**
   * --------------------------------------------------------------------------
   * PRIVATE: BUILD NODE PALETTE
   * --------------------------------------------------------------------------
   * 
   * Generates the HTML for draggable node items in the sidebar.
   * Each node type gets a card that can be dragged onto the canvas.
   * 
   * @returns {string} HTML string for node palette items
   * 
   * --------------------------------------------------------------------------
   */
  _buildNodePalette() {
    const nodes = this.nodeRegistry.getAll();
    
    return nodes.map(([name, definition]) => `
      <div class="node-item" 
           draggable="true" 
           data-node-type="${name}">
        <div class="node-item-icon">${definition.icon}</div>
        <div class="node-item-info">
          <span class="node-item-name">${definition.label}</span>
          <span class="node-item-desc">${definition.description}</span>
        </div>
      </div>
    `).join('');
  }


  /**
   * --------------------------------------------------------------------------
   * PRIVATE: INITIALIZE DRAWFLOW
   * --------------------------------------------------------------------------
   * 
   * Creates and configures the Drawflow instance.
   * Drawflow handles all the canvas rendering and connection logic.
   * 
   * --------------------------------------------------------------------------
   */
  _initializeDrawflow() {
    const canvasElement = this.container.querySelector('#drawflow-canvas');
    
    /**
     * Create Drawflow instance
     */
    this.drawflow = new Drawflow(canvasElement);

    /**
     * Configure Drawflow options based on edgeType
     */
    this.drawflow.reroute = false;
    
    // Set curvature based on edge type
    switch (this.options.edgeType) {
      case 'straight':
        this.drawflow.curvature = 0;
        this.drawflow.reroute_curvature_start_end = 0;
        this.drawflow.reroute_curvature = 0;
        break;
      case 'step':
        this.drawflow.curvature = 0;
        this.drawflow.reroute = true;
        this.drawflow.reroute_curvature_start_end = 0;
        this.drawflow.reroute_curvature = 0;
        break;
      case 'bezier':
      default:
        this.drawflow.curvature = 0.5;
        this.drawflow.reroute_curvature_start_end = 0.5;
        this.drawflow.reroute_curvature = 0.5;
        break;
    }
    
    /**
     * In view mode, disable all editing capabilities
     */
    if (this.mode === 'view') {
      this.drawflow.editor_mode = 'view';
    }

    /**
     * Start Drawflow
     */
    this.drawflow.start();
    
    /**
     * Initialize Workflow Executor
     */
    this.executor = new WorkflowExecutor(this);
    this._setupExecutorCallbacks();
    
    /**
     * Set max zoom to allow up to 200%
     */
    this.drawflow.zoom_max = 2;
  }


  /**
   * --------------------------------------------------------------------------
   * PRIVATE: CREATE NODE TEMPLATE
   * --------------------------------------------------------------------------
   * 
   * Generates the HTML template for a specific node type.
   * Nodes are kept compact - only showing icon and label.
   * All configuration fields are edited via the Properties panel.
   * 
   * @param {string} name - Node type name
   * @param {Object} definition - Node type definition
   * @returns {string} HTML template string
   * 
   * NODE STRUCTURE (Compact):
   *   ┌────────────────────────────┐
   *   |  T  Node Title            |
   *   └────────────────────────────┘
   * 
   * --------------------------------------------------------------------------
   */
  _createNodeTemplate(name, definition) {
    // If no definition, create a basic fallback node
    if (!definition) {
      console.warn(`[FlowKit] No definition found for node type: ${name}`);
      return `
        <div class="workflow-node">
          <div class="node-header">
            <span class="node-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg></span>
            <span class="node-label">${name}</span>
          </div>
        </div>
      `;
    }
    
    // Icon-only mode: just show a large icon (for shape nodes like circle, star, etc.)
    if (definition.iconOnly) {
      return `
        <div class="workflow-node icon-only" title="${definition.label}">
          <div class="node-icon-large">${definition.icon}</div>
        </div>
      `;
    }
    
    // Standard node: icon + label (no inline fields - edit in properties panel)
    return `
      <div class="workflow-node">
        <div class="node-header">
          <span class="node-icon">${definition.icon}</span>
          <span class="node-label">${definition.label}</span>
        </div>
      </div>
    `;
  }


  /**
   * --------------------------------------------------------------------------
   * PRIVATE: CREATE FIELD HTML
   * --------------------------------------------------------------------------
   * 
   * Generates HTML for a single form field inside a node.
   * Supports multiple field types: text, select, number, textarea, checkbox.
   * 
   * @param {Object} field - Field definition
   * @param {string} field.name - Field identifier
   * @param {string} field.label - Display label
   * @param {string} field.type - Input type
   * @param {Array} field.options - Options for select fields
   * @param {*} field.default - Default value
   * @returns {string} HTML string for the field
   * 
   * --------------------------------------------------------------------------
   */
  _createFieldHtml(field) {
    const { name, label, type, options, default: defaultValue, placeholder } = field;

    /**
     * Build input element based on field type
     */
    let inputHtml = '';

    switch (type) {
      case 'select':
        const optionsHtml = options.map(opt => 
          `<option value="${opt.value}" ${opt.value === defaultValue ? 'selected' : ''}>
            ${opt.label}
          </option>`
        ).join('');
        inputHtml = `<select df-${name}>${optionsHtml}</select>`;
        break;

      case 'textarea':
        inputHtml = `<textarea df-${name} placeholder="${placeholder || ''}">${defaultValue || ''}</textarea>`;
        break;

      case 'checkbox':
        inputHtml = `<input type="checkbox" df-${name} ${defaultValue ? 'checked' : ''}>`;
        break;

      case 'number':
        inputHtml = `<input type="number" df-${name} value="${defaultValue || ''}" placeholder="${placeholder || ''}">`;
        break;

      default:
        inputHtml = `<input type="text" df-${name} value="${defaultValue || ''}" placeholder="${placeholder || ''}">`;
    }

    return `
      <div class="node-field">
        <label>${label}</label>
        ${inputHtml}
      </div>
    `;
  }


  /**
   * --------------------------------------------------------------------------
   * PRIVATE: SETUP EVENT LISTENERS
   * --------------------------------------------------------------------------
   * 
   * Attaches all event listeners for user interactions:
   *   - Drag and drop from sidebar
   *   - Toolbar button clicks
   *   - Keyboard shortcuts
   *   - Drawflow events
   *   - Node selection
   * 
   * --------------------------------------------------------------------------
   */
  _setupEventListeners() {
    /**
     * DRAG AND DROP EVENTS
     * Handle dragging nodes from sidebar to canvas
     */
    // In view mode, only setup minimal zoom/pan interactions
    if (this.mode === 'view') {
      this._setupViewModeEvents();
      this._setupDrawflowEvents();
      return;
    }
    
    /**
     * DRAG AND DROP EVENTS
     * Handle dragging nodes from sidebar to canvas
     */
    this._setupDragAndDrop();

    /**
     * TOOLBAR BUTTON EVENTS
     * Handle clicks on toolbar buttons
     */
    this._setupToolbarEvents();

    /**
     * KEYBOARD SHORTCUTS
     * Handle keyboard shortcuts for common actions
     */
    this._setupKeyboardShortcuts();

    /**
     * DRAWFLOW EVENTS
     * Handle events from Drawflow (node added, removed, connected, etc.)
     */
    this._setupDrawflowEvents();
    
    /**
     * CONTEXT MENU EVENTS
     * Handle right-click context menu
     */
    this._setupContextMenu();
    
    /**
     * SEARCH FILTER EVENTS
     * Handle node search in sidebar
     */
    this._setupSearchFilter();
    
    /**
     * MODAL EVENTS
     * Handle modal close on overlay click
     */
    this._setupModalEvents();
    
    /**
     * MINIMAP
     * Initialize minimap if enabled
     */
    this._setupMinimap();
    
    /**
     * ADVANCED FEATURES
     * Multi-select and snap-to-grid
     */
    this._setupAdvancedFeatures();
    
    /**
     * AUTO-SAVE
     * Save workflow to localStorage periodically
     */
    this._setupAutoSave();
    
    /**
     * KEYBOARD SHORTCUTS
     * Navigation and quick actions
     */
    this._setupKeyboardShortcuts();
    
    /**
     * LOAD SAVED WORKFLOW
     * Restore last session if available
     */
    this._loadFromStorage();
  }

  /**
   * --------------------------------------------------------------------------
   * PRIVATE: SETUP VIEW MODE EVENTS
   * --------------------------------------------------------------------------
   * 
   * Sets up minimal events for view mode (zoom only).
   * 
   * --------------------------------------------------------------------------
   */
  _setupViewModeEvents() {
    this.container.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;

      const action = button.dataset.action;

      switch (action) {
        case 'zoom-in':
          this.zoomIn();
          break;
        case 'zoom-out':
          this.zoomOut();
          break;
        case 'fit-screen':
          this.fitToScreen();
          break;
      }
    });
  }


  /**
   * --------------------------------------------------------------------------
   * PRIVATE: SETUP DRAG AND DROP
   * --------------------------------------------------------------------------
   * 
   * Configures drag and drop functionality for adding nodes to the canvas.
   * 
   * FLOW:
   *   1. User drags node from sidebar
   *   2. Node type is stored in dataTransfer
   *   3. User drops on canvas
   *   4. New node is created at drop position
   * 
   * --------------------------------------------------------------------------
   */
  _setupDragAndDrop() {
    const nodeItems = this.container.querySelectorAll('.node-item');
    const canvas = this.container.querySelector('#drawflow-canvas');

    /**
     * Handle drag start on sidebar nodes
     */
    nodeItems.forEach(item => {
      item.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('nodeType', item.dataset.nodeType);
        event.dataTransfer.effectAllowed = 'copy';
        item.classList.add('dragging');
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
      });
    });

    /**
     * Handle drag over canvas (allow drop)
     * Listen on both the wrapper and the inner drawflow element
     */
    canvas.addEventListener('dragover', (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    });

    /**
     * Handle drop on canvas
     */
    canvas.addEventListener('drop', (event) => {
      event.preventDefault();
      
      const nodeType = event.dataTransfer.getData('nodeType');
      if (!nodeType) return;

      /**
       * Calculate drop position relative to canvas
       * Account for canvas pan/zoom transformations
       */
      const drawflowEl = this.container.querySelector('#drawflow-canvas .drawflow');
      const rect = drawflowEl ? drawflowEl.getBoundingClientRect() : canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) / this.drawflow.zoom;
      const y = (event.clientY - rect.top) / this.drawflow.zoom;

      /**
       * Add the node to the workflow
       */
      this.addNode(nodeType, x, y);
    });
    
    /**
     * Also attach events to inner drawflow element once it's created
     */
    setTimeout(() => {
      const drawflowEl = this.container.querySelector('#drawflow-canvas .drawflow');
      if (drawflowEl) {
        drawflowEl.addEventListener('dragover', (event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        });
        
        drawflowEl.addEventListener('drop', (event) => {
          event.preventDefault();
          
          const nodeType = event.dataTransfer.getData('nodeType');
          if (!nodeType) return;

          const rect = drawflowEl.getBoundingClientRect();
          const x = (event.clientX - rect.left) / this.drawflow.zoom;
          const y = (event.clientY - rect.top) / this.drawflow.zoom;

          this.addNode(nodeType, x, y);
        });
      }
    }, 100);
  }


  /**
   * --------------------------------------------------------------------------
   * PRIVATE: SETUP NODE ITEM DRAG
   * --------------------------------------------------------------------------
   * 
   * Sets up drag events for a single node item in the palette.
   * Used when dynamically adding nodes via registerNode().
   * 
   * @param {HTMLElement} item - The node item element
   * 
   * --------------------------------------------------------------------------
   */
  _setupNodeItemDrag(item) {
    item.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('nodeType', item.dataset.nodeType);
      event.dataTransfer.effectAllowed = 'copy';
      item.classList.add('dragging');
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
    });
  }


  /**
   * --------------------------------------------------------------------------
   * PRIVATE: SETUP TOOLBAR EVENTS
   * --------------------------------------------------------------------------
   * 
   * Attaches click handlers to all toolbar buttons.
   * 
   * --------------------------------------------------------------------------
   */
  _setupToolbarEvents() {
    /**
     * Handle all button clicks using event delegation
     */
    this.container.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;

      const action = button.dataset.action;

      switch (action) {
        case 'zoom-in':
          this.zoomIn();
          break;
        case 'zoom-out':
          this.zoomOut();
          break;
        case 'zoom-reset':
          this.zoomReset();
          break;
        case 'fit-screen':
        case 'fit-view':
          this.fitView();
          break;
        case 'toggle-minimap':
          this.toggleMinimap();
          break;
        case 'toggle-snap':
          this.toggleSnap();
          break;
        case 'toggle-animate':
          this.toggleAnimate();
          break;
        case 'toggle-examples':
          this._toggleExamplesDropdown();
          break;
        case 'undo':
          this.undo();
          break;
        case 'redo':
          this.redo();
          break;
        case 'clear':
          this.clear();
          break;
        case 'export':
          this.exportWorkflow();
          break;
        case 'validate':
          this.validate();
          break;
        case 'export-image':
          this.exportAsImage();
          break;
        case 'import':
          this.container.querySelector('#import-file').click();
          break;
        case 'create-node':
          this._showCreateNodeModal();
          break;
        case 'close-modal':
          this._hideCreateNodeModal();
          break;
        case 'save-custom-node':
          this._saveCustomNode();
          break;
        case 'exec-run':
          this.runWorkflow();
          break;
        case 'exec-pause':
          this.pauseWorkflow();
          break;
        case 'exec-stop':
          this.stopWorkflow();
          break;
        case 'exec-reset':
          this.resetWorkflow();
          break;
        case 'exec-log':
          this.toggleExecutionLog();
          break;
      }
    });
    
    /**
     * Handle examples dropdown clicks
     */
    const examplesMenu = this.container.querySelector('#examples-menu');
    if (examplesMenu) {
      examplesMenu.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent document click from closing dropdown
        const item = e.target.closest('[data-example]');
        if (item) {
          const exampleId = item.dataset.example;
          this._toggleExamplesDropdown(true);
          // Small delay to ensure dropdown closes before loading
          setTimeout(() => {
            this._loadExample(exampleId);
          }, 50);
        }
      });
      
      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        const dropdown = this.container.querySelector('#examples-dropdown');
        if (dropdown && !dropdown.contains(e.target)) {
          this._toggleExamplesDropdown(true);
        }
      });
    }

    /**
     * Handle file import
     */
    this.container.querySelector('#import-file').addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
        this.importWorkflow(file);
      }
      event.target.value = '';
    });
  }


  /**
   * --------------------------------------------------------------------------
   * PRIVATE: SETUP KEYBOARD SHORTCUTS
   * --------------------------------------------------------------------------
   * 
   * Registers keyboard shortcuts for common operations:
   *   - Ctrl+Z: Undo
   *   - Ctrl+Y / Ctrl+Shift+Z: Redo
   *   - Delete/Backspace: Delete selected node
   *   - Ctrl+S: Save/Export
   * 
   * --------------------------------------------------------------------------
   */
  _setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      /**
       * Only handle shortcuts when workflow builder is focused
       */
      if (!this.container.contains(document.activeElement) && 
          document.activeElement !== document.body) {
        return;
      }
      
      // Skip shortcuts when typing in inputs
      const isTyping = document.activeElement.tagName === 'INPUT' || 
                       document.activeElement.tagName === 'TEXTAREA';

      const isCtrl = event.ctrlKey || event.metaKey;

      /**
       * Ctrl+Z: Undo
       */
      if (isCtrl && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        this.undo();
      }

      /**
       * Ctrl+Y or Ctrl+Shift+Z: Redo
       */
      if ((isCtrl && event.key === 'y') || (isCtrl && event.shiftKey && event.key === 'z')) {
        event.preventDefault();
        this.redo();
      }

      /**
       * Delete or Backspace: Delete selected node
       */
      if ((event.key === 'Delete' || event.key === 'Backspace') && !isTyping) {
        event.preventDefault();
        this.deleteSelected();
      }

      /**
       * Ctrl+S: Export workflow
       */
      if (isCtrl && event.key === 's') {
        event.preventDefault();
        this.exportWorkflow();
      }
      
      /**
       * Ctrl+C: Copy selected node
       */
      if (isCtrl && event.key === 'c' && !isTyping) {
        event.preventDefault();
        this.copySelected();
      }
      
      /**
       * Ctrl+V: Paste node
       */
      if (isCtrl && event.key === 'v' && !isTyping) {
        event.preventDefault();
        this.paste();
      }
      
      /**
       * Ctrl+D: Duplicate selected node
       */
      if (isCtrl && event.key === 'd' && !isTyping) {
        event.preventDefault();
        this.duplicateSelected();
      }
      
      /**
       * Ctrl+A: Select all nodes
       */
      if (isCtrl && event.key === 'a' && !isTyping) {
        event.preventDefault();
        this.selectAllNodes();
      }
      
      /**
       * Ctrl+G: Toggle group (group if not grouped, ungroup if grouped)
       */
      if (isCtrl && event.key === 'g' && !isTyping) {
        event.preventDefault();
        if (event.shiftKey) {
          this.collapseSelectedGroup();
        } else {
          this.toggleGroup();
        }
      }
      
      /**
       * Escape: Deselect all
       */
      if (event.key === 'Escape') {
        this.deselectAll();
        this.clearSelection();
        this._hideContextMenu();
      }
      
      /**
       * Arrow keys: Move selected node
       */
      if (!isTyping && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        const distance = event.shiftKey ? 20 : 5;
        let dx = 0, dy = 0;
        
        switch (event.key) {
          case 'ArrowUp': dy = -distance; break;
          case 'ArrowDown': dy = distance; break;
          case 'ArrowLeft': dx = -distance; break;
          case 'ArrowRight': dx = distance; break;
        }
        
        this.moveSelected(dx, dy);
      }
    });
  }


  /**
   * --------------------------------------------------------------------------
   * PRIVATE: SETUP DRAWFLOW EVENTS
   * --------------------------------------------------------------------------
   * 
   * Listens to Drawflow events and responds appropriately:
   *   - nodeCreated: Update stats, save history
   *   - nodeRemoved: Update stats, save history
   *   - connectionCreated: Update stats, save history
   *   - connectionRemoved: Update stats, save history
   *   - nodeSelected: Show properties panel
   *   - nodeUnselected: Hide properties panel
   * 
   * --------------------------------------------------------------------------
   */
  _setupDrawflowEvents() {
    /**
     * Node created event
     */
    this.drawflow.on('nodeCreated', (nodeId) => {
      // Set data-type attribute for CSS selectors
      const nodeEl = this.container.querySelector(`#node-${nodeId}`);
      if (nodeEl) {
        const nodeData = this.drawflow.getNodeFromId(nodeId);
        if (nodeData && nodeData.class) {
          nodeEl.setAttribute('data-type', nodeData.class);
        }
      }
      
      this._updateStats();
      this._saveToHistory();
      this._triggerChange();
      this._setStatus('Node added');
    });

    /**
     * Node removed event
     */
    this.drawflow.on('nodeRemoved', (nodeId) => {
      this._updateStats();
      this._saveToHistory();
      this._triggerChange();
      this._hideProperties();
      this._setStatus('Node removed');
    });

    /**
     * Connection created event
     */
    this.drawflow.on('connectionCreated', (connection) => {
      this._updateStats();
      this._saveToHistory();
      this._triggerChange();
      this._setStatus('Connection created');
      
      // Color connections from condition/if/decision nodes (with delay for DOM update)
      setTimeout(() => this._colorConditionConnections(), 10);
    });

    /**
     * Connection removed event
     */
    this.drawflow.on('connectionRemoved', (connection) => {
      this._updateStats();
      this._saveToHistory();
      this._triggerChange();
      this._setStatus('Connection removed');
    });

    /**
     * Node selected event - sync single selection to selectedNodes
     * Note: Clicking nodes accumulates selection. Click canvas to clear.
     */
    this.drawflow.on('nodeSelected', (nodeId) => {
      this._showProperties(nodeId);
      
      // Add this node to selectedNodes (accumulative selection)
      const nodeEl = this.container.querySelector(`#node-${nodeId}`);
      if (nodeEl && !this.selectedNodes.has(nodeId)) {
        nodeEl.classList.add('multi-selected');
        this.selectedNodes.add(nodeId);
        
        if (this.selectedNodes.size > 1) {
          this._setStatus(`${this.selectedNodes.size} nodes selected`);
        }
      }
    });

    /**
     * Click on canvas (deselect)
     */
    this.drawflow.on('click', (event) => {
      if (event.target.classList.contains('drawflow')) {
        this._hideProperties();
      }
    });

    /**
     * Zoom event
     */
    this.drawflow.on('zoom', (zoom) => {
      this._updateZoomDisplay(zoom);
    });
    
    /**
     * Double-click on node to open config panel
     */
    const canvas = this.container.querySelector('#drawflow-canvas');
    canvas.addEventListener('dblclick', (event) => {
      const nodeEl = event.target.closest('.drawflow-node');
      if (nodeEl) {
        const nodeId = nodeEl.id.replace('node-', '');
        this.showNodeConfigPanel(nodeId);
      }
    });
    
    /**
     * Hover on node to show config tooltip
     */
    let tooltipTimeout = null;
    let currentHoveredNode = null;
    
    canvas.addEventListener('mouseover', (event) => {
      const nodeEl = event.target.closest('.drawflow-node');
      
      // If we're already hovering this node, skip
      if (nodeEl === currentHoveredNode) return;
      
      // Clear any pending tooltip
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
      }
      this._hideConfigTooltip();
      
      if (nodeEl && !nodeEl.classList.contains('comment-node-wrapper')) {
        currentHoveredNode = nodeEl;
        const nodeId = nodeEl.id.replace('node-', '');
        tooltipTimeout = setTimeout(() => {
          this._showConfigTooltip(nodeId, nodeEl);
        }, 600); // Show after 600ms hover
      } else {
        currentHoveredNode = null;
      }
    });
    
    canvas.addEventListener('mouseout', (event) => {
      const nodeEl = event.target.closest('.drawflow-node');
      const relatedTarget = event.relatedTarget?.closest('.drawflow-node');
      
      // Only hide if we're leaving the node entirely (not just moving between children)
      if (nodeEl && nodeEl !== relatedTarget) {
        if (tooltipTimeout) {
          clearTimeout(tooltipTimeout);
          tooltipTimeout = null;
        }
        currentHoveredNode = null;
        this._hideConfigTooltip();
      }
    });
    
    /**
     * Config panel buttons and backdrop click
     */
    this.container.addEventListener('click', (event) => {
      // Close panel when clicking backdrop
      if (event.target.id === 'config-panel-backdrop') {
        this.hideNodeConfigPanel();
        return;
      }
      
      // Add custom field button
      if (event.target.classList.contains('btn-add-field')) {
        const row = event.target.closest('.new-field-row');
        const keyInput = row.querySelector('.new-field-key');
        const valueInput = row.querySelector('.new-field-value');
        const key = keyInput.value.trim();
        const value = valueInput.value;
        
        if (key) {
          const fieldsList = this.container.querySelector('.custom-fields-list');
          const newRow = document.createElement('div');
          newRow.className = 'custom-field-row';
          newRow.dataset.key = key;
          newRow.innerHTML = `
            <input type="text" value="${this._escapeHtml(key)}" placeholder="Key" class="custom-field-key" readonly>
            <input type="text" value="${this._escapeHtml(value)}" placeholder="Value" class="custom-field-value" name="custom_${key}">
            <button type="button" class="remove-custom-field" title="Remove">×</button>
          `;
          fieldsList.appendChild(newRow);
          keyInput.value = '';
          valueInput.value = '';
        }
        return;
      }
      
      // Remove custom field button
      if (event.target.classList.contains('remove-custom-field')) {
        event.target.closest('.custom-field-row').remove();
        return;
      }
      
      const action = event.target.closest('[data-action]')?.dataset?.action;
      
      if (action === 'close-config') {
        this.hideNodeConfigPanel();
      } else if (action === 'save-config') {
        this.saveNodeConfig();
      } else if (action === 'close-log') {
        const logPanel = this.container.querySelector('#execution-log-panel');
        if (logPanel) logPanel.classList.remove('visible');
      }
    });
  }


  /**
   * --------------------------------------------------------------------------
   * PRIVATE: APPLY THEME
   * --------------------------------------------------------------------------
   * 
   * Applies the configured theme (light/dark) to the workflow builder.
   * 
   * --------------------------------------------------------------------------
   */
  _applyTheme() {
    this.container.classList.remove('theme-light', 'theme-dark');
    this.container.classList.add(`theme-${this.options.theme}`);
  }


  /**
   * --------------------------------------------------------------------------
   * PRIVATE: UPDATE STATS
   * --------------------------------------------------------------------------
   * 
   * Updates the node and connection counts in the footer.
   * 
   * --------------------------------------------------------------------------
   */
  _updateStats() {
    const data = this.drawflow.export();
    const moduleData = data.drawflow.Home.data;
    
    const nodeCount = Object.keys(moduleData).length;
    let connectionCount = 0;

    Object.values(moduleData).forEach(node => {
      Object.values(node.outputs).forEach(output => {
        connectionCount += output.connections.length;
      });
    });

    const nodeCountEl = this.container.querySelector('.node-count');
    const connCountEl = this.container.querySelector('.connection-count');
    if (nodeCountEl) nodeCountEl.textContent = `Nodes: ${nodeCount}`;
    if (connCountEl) connCountEl.textContent = `Connections: ${connectionCount}`;
  }


  /**
   * --------------------------------------------------------------------------
   * PRIVATE: COLOR CONDITION CONNECTIONS
   * --------------------------------------------------------------------------
   * 
   * Colors connections from condition/if/decision nodes:
   * - output_1 (true branch): Green
   * - output_2 (false branch): Red
   * 
   * --------------------------------------------------------------------------
   */
  _colorConditionConnections() {
    const conditionTypes = ['condition', 'if', 'decision'];
    const connections = this.container.querySelectorAll('.drawflow .connection');
    
    const trueColor = this.conditionTrueColor || '#22C55E';
    const falseColor = this.conditionFalseColor || '#EF4444';
    
    connections.forEach(conn => {
      const classList = conn.getAttribute('class') || '';
      const outMatch = classList.match(/node_out_node-(\d+)/);
      
      if (outMatch) {
        const sourceNodeId = outMatch[1];
        const nodeEl = this.container.querySelector(`#node-${sourceNodeId}`);
        
        if (nodeEl) {
          const nodeType = nodeEl.getAttribute('data-type');
          
          if (conditionTypes.includes(nodeType)) {
            const path = conn.querySelector('.main-path');
            if (path) {
              if (classList.includes('output_1')) {
                path.style.setProperty('stroke', trueColor, 'important');
                conn.classList.add('condition-true');
              } else if (classList.includes('output_2')) {
                path.style.setProperty('stroke', falseColor, 'important');
                conn.classList.add('condition-false');
              }
            }
          }
        }
      }
    });
  }


  /**
   * --------------------------------------------------------------------------
   * PRIVATE: UPDATE ZOOM DISPLAY
   * --------------------------------------------------------------------------
   * 
   * Updates the zoom percentage shown in the toolbar.
   * 
   * @param {number} zoom - Current zoom level
   * 
   * --------------------------------------------------------------------------
   */
  _updateZoomDisplay(zoom) {
    const percentage = Math.round(zoom * 100);
    const zoomEl = this.container.querySelector('.zoom-level');
    if (zoomEl) zoomEl.textContent = `${percentage}%`;
  }


  /**
   * --------------------------------------------------------------------------
   * PRIVATE: SET STATUS
   * --------------------------------------------------------------------------
   * 
   * Updates the status message in the footer.
   * 
   * @param {string} message - Status message to display
   * 
   * --------------------------------------------------------------------------
   */
  _setStatus(message) {
    const statusEl = this.container.querySelector('.status-message');
    if (statusEl) statusEl.textContent = message;
  }


  /**
   * --------------------------------------------------------------------------
   * PRIVATE: SHOW PROPERTIES
   * --------------------------------------------------------------------------
   * 
   * Displays the properties panel for a selected node.
   * 
   * @param {number} nodeId - ID of the selected node
   * 
   * --------------------------------------------------------------------------
   */
  _showProperties(nodeId) {
    const propertiesContent = this.container.querySelector('.properties-content');
    if (!propertiesContent) return;  // Not present in view mode
    
    const nodeData = this.drawflow.getNodeFromId(nodeId);
    const nodeType = nodeData.name;
    const definition = this.nodeRegistry.get(nodeType);

    if (!definition) return;

    /**
     * Build the properties form
     */
    const fieldsHtml = definition.fields.map(field => {
      const value = nodeData.data[field.name] || field.default || '';
      return this._createPropertyFieldHtml(field, value, nodeId);
    }).join('');

    /**
     * Build execution config summary
     */
    const execConfig = this.getNodeConfig(nodeId);
    const configEntries = Object.entries(execConfig || {});
    const configSummaryHtml = configEntries.length > 0 
      ? configEntries.map(([key, value]) => {
          let displayValue = value;
          if (typeof value === 'object') {
            displayValue = JSON.stringify(value).substring(0, 50);
          } else if (typeof value === 'string' && value.length > 50) {
            displayValue = value.substring(0, 50) + '...';
          }
          return `<div class="config-summary-row"><span class="config-key">${key}:</span> <span class="config-val">${this._escapeHtml(String(displayValue))}</span></div>`;
        }).join('')
      : '<div class="config-empty-msg">No execution config set</div>';

    propertiesContent.innerHTML = `
      <div class="properties-node-info">
        <span class="properties-icon">${definition.icon}</span>
        <span class="properties-name">${definition.label}</span>
      </div>
      <div class="properties-fields">
        ${fieldsHtml || '<p class="no-properties">No visual properties</p>'}
      </div>
      <div class="properties-section">
        <h4>Execution Config</h4>
        <div class="config-summary">
          ${configSummaryHtml}
        </div>
        <button class="btn btn-primary btn-small" data-action="edit-config" data-node-id="${nodeId}">
          Edit Config
        </button>
      </div>
      <div class="properties-section">
        <h4>Run Options</h4>
        <button class="btn btn-success btn-small" data-action="run-node" data-node-id="${nodeId}">
          ▶ Test This Node
        </button>
      </div>
      <div class="properties-actions">
        <button class="btn btn-danger btn-small" data-action="delete-node" data-node-id="${nodeId}">
          Delete Node
        </button>
      </div>
    `;

    /**
     * Setup field change listeners
     */
    this._setupPropertyFieldListeners(nodeId);

    /**
     * Setup action buttons
     */
    const editConfigBtn = propertiesContent.querySelector('[data-action="edit-config"]');
    if (editConfigBtn) {
      editConfigBtn.addEventListener('click', () => {
        this.showNodeConfigPanel(nodeId);
      });
    }
    
    const runNodeBtn = propertiesContent.querySelector('[data-action="run-node"]');
    if (runNodeBtn) {
      runNodeBtn.addEventListener('click', () => {
        this.runSingleNode(nodeId);
      });
    }

    propertiesContent.querySelector('[data-action="delete-node"]').addEventListener('click', () => {
      this.drawflow.removeNodeId(`node-${nodeId}`);
    });
  }


  /**
   * --------------------------------------------------------------------------
   * PRIVATE: CREATE PROPERTY FIELD HTML
   * --------------------------------------------------------------------------
   * 
   * Creates HTML for a property field in the properties panel.
   * Similar to _createFieldHtml but with property panel styling.
   * 
   * @param {Object} field - Field definition
   * @param {*} value - Current field value
   * @param {number} nodeId - Node ID for data binding
   * @returns {string} HTML string
   * 
   * --------------------------------------------------------------------------
   */
  _createPropertyFieldHtml(field, value, nodeId) {
    const { name, label, type, options, placeholder } = field;
    let inputHtml = '';

    switch (type) {
      case 'select':
        const optionsHtml = options.map(opt => 
          `<option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>
            ${opt.label}
          </option>`
        ).join('');
        inputHtml = `<select data-field="${name}" data-node-id="${nodeId}">${optionsHtml}</select>`;
        break;

      case 'textarea':
        inputHtml = `<textarea data-field="${name}" data-node-id="${nodeId}" placeholder="${placeholder || ''}">${value}</textarea>`;
        break;

      case 'checkbox':
        inputHtml = `<input type="checkbox" data-field="${name}" data-node-id="${nodeId}" ${value ? 'checked' : ''}>`;
        break;

      case 'number':
        inputHtml = `<input type="number" data-field="${name}" data-node-id="${nodeId}" value="${value}" placeholder="${placeholder || ''}">`;
        break;

      default:
        inputHtml = `<input type="text" data-field="${name}" data-node-id="${nodeId}" value="${value}" placeholder="${placeholder || ''}">`;
    }

    return `
      <div class="property-field">
        <label>${label}</label>
        ${inputHtml}
      </div>
    `;
  }


  /**
   * --------------------------------------------------------------------------
   * PRIVATE: SETUP PROPERTY FIELD LISTENERS
   * --------------------------------------------------------------------------
   * 
   * Attaches change listeners to property fields.
   * Updates node data when fields change.
   * 
   * @param {number} nodeId - Node ID to update
   * 
   * --------------------------------------------------------------------------
   */
  _setupPropertyFieldListeners(nodeId) {
    const fields = this.container.querySelectorAll('.properties-fields [data-field]');

    fields.forEach(field => {
      const eventType = field.type === 'checkbox' ? 'change' : 'input';
      
      field.addEventListener(eventType, (event) => {
        const fieldName = field.dataset.field;
        const value = field.type === 'checkbox' ? field.checked : field.value;

        /**
         * Update node data in Drawflow
         */
        const nodeData = this.drawflow.getNodeFromId(nodeId);
        nodeData.data[fieldName] = value;
        
        /**
         * Also update the visual node on canvas
         */
        const nodeElement = this.container.querySelector(`#node-${nodeId} [df-${fieldName}]`);
        if (nodeElement) {
          if (nodeElement.type === 'checkbox') {
            nodeElement.checked = value;
          } else {
            nodeElement.value = value;
          }
        }

        this._triggerChange();
      });
    });
  }


  /**
   * --------------------------------------------------------------------------
   * PRIVATE: HIDE PROPERTIES
   * --------------------------------------------------------------------------
   * 
   * Hides the properties panel and shows the empty state.
   * 
   * --------------------------------------------------------------------------
   */
  _hideProperties() {
    const propertiesContent = this.container.querySelector('.properties-content');
    if (!propertiesContent) return;  // Not present in view mode
    propertiesContent.innerHTML = `
      <div class="properties-empty">
        <span class="empty-icon">^</span>
        <p>Select a node to edit its properties</p>
      </div>
    `;
  }


  /**
   * --------------------------------------------------------------------------
   * PRIVATE: SAVE TO HISTORY
   * --------------------------------------------------------------------------
   * 
   * Saves the current workflow state to history for undo/redo.
   * 
   * --------------------------------------------------------------------------
   */
  _saveToHistory() {
    /**
     * Remove any future history if we're not at the end
     */
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    /**
     * Add current state to history
     */
    const state = JSON.stringify(this.drawflow.export());
    this.history.push(state);

    /**
     * Limit history length
     */
    if (this.history.length > this.maxHistoryLength) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }

    /**
     * Update undo/redo button states
     */
    this._updateHistoryButtons();
  }


  /**
   * --------------------------------------------------------------------------
   * PRIVATE: UPDATE HISTORY BUTTONS
   * --------------------------------------------------------------------------
   * 
   * Enables/disables undo and redo buttons based on history state.
   * 
   * --------------------------------------------------------------------------
   */
  _updateHistoryButtons() {
    const undoBtn = this.container.querySelector('[data-action="undo"]');
    const redoBtn = this.container.querySelector('[data-action="redo"]');

    if (undoBtn) undoBtn.disabled = this.historyIndex <= 0;
    if (redoBtn) redoBtn.disabled = this.historyIndex >= this.history.length - 1;
  }


  /**
   * --------------------------------------------------------------------------
   * PRIVATE: TRIGGER CHANGE
   * --------------------------------------------------------------------------
   * 
   * Calls the onChange callback if provided.
   * 
   * --------------------------------------------------------------------------
   */
  _triggerChange() {
    if (this.options.onChange) {
      this.options.onChange(this.export());
    }
  }


  /**
   * ==========================================================================
   * PUBLIC API METHODS
   * ==========================================================================
   * 
   * The following methods are the public API for the WorkflowBuilder.
   * These can be called by consumers of this package.
   * 
   * ==========================================================================
   */


  /**
   * --------------------------------------------------------------------------
   * PUBLIC: ADD NODE
   * --------------------------------------------------------------------------
   * 
   * Adds a new node to the workflow at the specified position.
   * 
   * @param {string} type - Node type name (e.g., 'trigger', 'email')
   * @param {number} x - X position on canvas
   * @param {number} y - Y position on canvas
   * @param {Object} data - Initial data for the node
   * @returns {number} ID of the created node
   * 
   * EXAMPLE:
   *   const nodeId = workflow.addNode('email', 300, 200, {
   *     to: 'user@example.com',
   *     subject: 'Welcome!'
   *   });
   * 
   * --------------------------------------------------------------------------
   */
  addNode(type, x = 100, y = 100, data = {}) {
    const definition = this.nodeRegistry.get(type);
    
    if (!definition) {
      console.error(`WorkflowBuilder: Unknown node type "${type}"`);
      return null;
    }

    /**
     * Merge default values with provided data
     */
    const nodeData = {};
    definition.fields.forEach(field => {
      nodeData[field.name] = data[field.name] ?? field.default ?? '';
    });

    /**
     * Create HTML for the node
     */
    const html = this._createNodeTemplate(type, definition);

    /**
     * Add node to Drawflow
     */
    const nodeId = this.drawflow.addNode(
      type,
      definition.inputs,
      definition.outputs,
      x,
      y,
      type,
      nodeData,
      html
    );

    return nodeId;
  }

  /**
   * --------------------------------------------------------------------------
   * PUBLIC: CREATE NODE (Alias for addNode)
   * --------------------------------------------------------------------------
   * 
   * Alias for addNode() - creates a new node at the specified position.
   * 
   * @param {string} type - Node type name
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {Object} data - Initial node data
   * @returns {number} Node ID
   * 
   * --------------------------------------------------------------------------
   */
  createNode(type, x = 100, y = 100, data = {}) {
    return this.addNode(type, x, y, data);
  }

  /**
   * --------------------------------------------------------------------------
   * PUBLIC: REMOVE NODE
   * --------------------------------------------------------------------------
   * 
   * Removes a node from the workflow by ID.
   * 
   * @param {number} nodeId - ID of the node to remove
   * 
   * --------------------------------------------------------------------------
   */
  removeNode(nodeId) {
    this.drawflow.removeNodeId(`node-${nodeId}`);
  }

  /**
   * --------------------------------------------------------------------------
   * PUBLIC: GET NODE
   * --------------------------------------------------------------------------
   * 
   * Gets a node's data by ID.
   * 
   * @param {number} nodeId - ID of the node
   * @returns {Object} Node data or null
   * 
   * --------------------------------------------------------------------------
   */
  getNode(nodeId) {
    try {
      return this.drawflow.getNodeFromId(nodeId);
    } catch (e) {
      return null;
    }
  }

  /**
   * --------------------------------------------------------------------------
   * PUBLIC: GET ALL NODES
   * --------------------------------------------------------------------------
   * 
   * Gets all nodes in the workflow.
   * 
   * @returns {Object} Map of node ID to node data
   * 
   * --------------------------------------------------------------------------
   */
  getNodes() {
    const data = this.drawflow.export();
    return data.drawflow?.Home?.data || {};
  }

  /**
   * --------------------------------------------------------------------------
   * PUBLIC: UPDATE NODE DATA
   * --------------------------------------------------------------------------
   * 
   * Updates a node's data.
   * 
   * @param {number} nodeId - ID of the node
   * @param {Object} data - New data to merge
   * 
   * --------------------------------------------------------------------------
   */
  updateNodeData(nodeId, data) {
    const node = this.getNode(nodeId);
    if (node) {
      this.drawflow.updateNodeDataFromId(nodeId, { ...node.data, ...data });
    }
  }


  /**
   * --------------------------------------------------------------------------
   * PUBLIC: CONNECT
   * --------------------------------------------------------------------------
   * 
   * Creates a connection between two nodes.
   * 
   * @param {number} fromNodeId - ID of the source node
   * @param {number} toNodeId - ID of the target node
   * @param {number} outputIndex - Which output to connect from (1-based, default 1)
   * @param {number} inputIndex - Which input to connect to (1-based, default 1)
   * 
   * EXAMPLE:
   *   workflow.connect(1, 2);           // Connect node 1's output to node 2's input
   *   workflow.connect(3, 4, 2, 1);     // Connect node 3's 2nd output to node 4's 1st input
   * 
   * --------------------------------------------------------------------------
   */
  connect(fromNodeId, toNodeId, outputIndex = 1, inputIndex = 1) {
    this.drawflow.addConnection(
      fromNodeId,
      toNodeId,
      `output_${outputIndex}`,
      `input_${inputIndex}`
    );
  }


  /**
   * --------------------------------------------------------------------------
   * PUBLIC: ZOOM IN
   * --------------------------------------------------------------------------
   * 
   * Increases the canvas zoom level.
   * 
   * --------------------------------------------------------------------------
   */
  zoomIn() {
    this.drawflow.zoom_in();
  }


  /**
   * --------------------------------------------------------------------------
   * PUBLIC: ZOOM OUT
   * --------------------------------------------------------------------------
   * 
   * Decreases the canvas zoom level.
   * 
   * --------------------------------------------------------------------------
   */
  zoomOut() {
    this.drawflow.zoom_out();
  }


  /**
   * --------------------------------------------------------------------------
   * PUBLIC: ZOOM RESET
   * --------------------------------------------------------------------------
   * 
   * Resets the canvas zoom to 100%.
   * 
   * --------------------------------------------------------------------------
   */
  zoomReset() {
    this.drawflow.zoom_reset();
  }


  /**
   * --------------------------------------------------------------------------
   * PUBLIC: UNDO
   * --------------------------------------------------------------------------
   * 
   * Undoes the last action.
   * 
   * --------------------------------------------------------------------------
   */
  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const state = JSON.parse(this.history[this.historyIndex]);
      this.drawflow.import(state);
      this._updateStats();
      this._updateHistoryButtons();
      this._setStatus('Undo');
    }
  }


  /**
   * --------------------------------------------------------------------------
   * PUBLIC: REDO
   * --------------------------------------------------------------------------
   * 
   * Redoes the last undone action.
   * 
   * --------------------------------------------------------------------------
   */
  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const state = JSON.parse(this.history[this.historyIndex]);
      this.drawflow.import(state);
      this._updateStats();
      this._updateHistoryButtons();
      this._setStatus('Redo');
    }
  }


  /**
   * --------------------------------------------------------------------------
   * PUBLIC: CLEAR
   * --------------------------------------------------------------------------
   * 
   * Clears all nodes and connections from the workflow.
   * Asks for confirmation before clearing unless skipConfirm is true.
   * 
   * --------------------------------------------------------------------------
   */
  clear(skipConfirm = false) {
    const doClear = () => {
      // Clear all groups first
      this.groups.forEach((group, groupId) => this._dissolveGroup(groupId));
      this.groups.clear();
      this.nextGroupId = 1;
      
      this.drawflow.clear();
      this._updateStats();
      this._saveToHistory();
      this._hideProperties();
      this._setStatus('Workflow cleared');
    };
    
    if (skipConfirm) {
      doClear();
    } else {
      this._showConfirmModal('Clear Workflow', 'Are you sure you want to clear the entire workflow? This cannot be undone.', doClear);
    }
  }
  
  /**
   * --------------------------------------------------------------------------
   * PRIVATE: SHOW CONFIRMATION MODAL
   * --------------------------------------------------------------------------
   */
  _showConfirmModal(title, message, onConfirm) {
    const modal = this.container.querySelector('#confirm-modal');
    if (!modal) {
      console.error('[FlowKit] Confirm modal not found! Calling callback directly.');
      if (onConfirm) onConfirm();
      return;
    }
    
    const titleEl = modal.querySelector('#confirm-modal-title');
    const messageEl = modal.querySelector('#confirm-modal-message');
    const cancelBtn = modal.querySelector('[data-action="confirm-cancel"]');
    const okBtn = modal.querySelector('[data-action="confirm-ok"]');
    const closeBtn = modal.querySelector('[data-action="close-confirm"]');
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    modal.classList.add('visible');
    
    const cleanup = () => {
      modal.classList.remove('visible');
      cancelBtn.removeEventListener('click', handleCancel);
      okBtn.removeEventListener('click', handleOk);
      closeBtn.removeEventListener('click', handleCancel);
    };
    
    const handleCancel = () => cleanup();
    const handleOk = () => {
      cleanup();
      if (onConfirm) onConfirm();
    };
    
    cancelBtn.addEventListener('click', handleCancel);
    okBtn.addEventListener('click', handleOk);
    closeBtn.addEventListener('click', handleCancel);
  }


  /**
   * --------------------------------------------------------------------------
   * PUBLIC: DELETE SELECTED
   * --------------------------------------------------------------------------
   * 
   * Deletes the currently selected node.
   * Note: The main deleteSelected() is defined with multi-select support below.
   * 
   * --------------------------------------------------------------------------
   */
  // deleteSelected is defined below with multi-select support


  /**
   * --------------------------------------------------------------------------
   * PUBLIC: EXPORT
   * --------------------------------------------------------------------------
   * 
   * Returns the workflow data as a JavaScript object.
   * 
   * @returns {Object} Workflow data
   * 
   * --------------------------------------------------------------------------
   */
  export() {
    const data = this.drawflow.export();
    
    // Add groups data
    if (this.groups && this.groups.size > 0) {
      data._groups = [];
      this.groups.forEach((group, groupId) => {
        data._groups.push({
          id: groupId,
          nodeIds: Array.from(group.nodeIds),
          label: group.label,
          color: group.color
        });
      });
      data._nextGroupId = this.nextGroupId;
    }
    
    // Add node configurations for execution
    if (this.nodeConfigs && this.nodeConfigs.size > 0) {
      data._nodeConfigs = {};
      this.nodeConfigs.forEach((config, nodeId) => {
        data._nodeConfigs[nodeId] = config;
      });
    }
    
    return data;
  }


  /**
   * --------------------------------------------------------------------------
   * PUBLIC: IMPORT
   * --------------------------------------------------------------------------
   * 
   * Imports workflow data into the builder.
   * 
   * @param {Object} data - Workflow data to import
   * 
   * --------------------------------------------------------------------------
   */
  import(data) {
    // Clear existing groups
    this.groups.forEach((group, groupId) => this._dissolveGroup(groupId));
    this.groups.clear();
    
    // Clear existing node configs
    this.nodeConfigs.clear();
    
    this.drawflow.import(data);
    this._updateStats();
    this._saveToHistory();
    
    // Restore visual styles after import
    this._restoreImportedStyles(data);
    
    // Restore groups after import
    this._restoreImportedGroups(data);
    
    // Restore node configs after import
    this._restoreImportedNodeConfigs(data);
    
    // Color condition connections
    setTimeout(() => this._colorConditionConnections(), 50);
    
    this._setStatus('Workflow imported');
  }

  /**
   * Restore visual styles after importing workflow data
   */
  _restoreImportedStyles(data) {
    if (!data?.drawflow?.Home?.data) {
      return;
    }
    
    const nodes = data.drawflow.Home.data;
    
    // Wait for DOM to fully update
    setTimeout(() => {
      Object.entries(nodes).forEach(([nodeId, nodeData]) => {
        const nodeEl = this.container.querySelector(`#node-${nodeId}`);
        
        // Set data-type attribute for proper styling
        if (nodeEl && nodeData.class) {
          nodeEl.setAttribute('data-type', nodeData.class);
        }
        
        // Restore node colors
        if (nodeData.data?._nodeColor) {
          if (nodeEl) {
            nodeEl.style.setProperty('--node-color', nodeData.data._nodeColor);
            nodeEl.classList.add('custom-color');
          }
        }
        
        // Restore comment functionality
        if (nodeData.data?._isComment) {
          this._setupRestoredComment(nodeId, nodeData.data._text);
        }
      });
      
      // Re-color condition connections after data-type is set
      this._colorConditionConnections();
    }, 100);
  }

  /**
   * Setup restored comment node functionality
   */
  _setupRestoredComment(nodeId, text) {
    const node = this.container.querySelector(`#node-${nodeId}`);
    if (!node) return;
    
    const textarea = node.querySelector('.comment-text');
    const deleteBtn = node.querySelector('.comment-delete');
    
    if (textarea) {
      // Restore text content
      if (text) textarea.value = text;
      
      textarea.addEventListener('input', (e) => {
        // Update internal data directly (getNodeFromId returns a copy)
        try {
          const internalData = this.drawflow.drawflow.drawflow.Home.data[nodeId];
          if (internalData) {
            internalData.data._text = e.target.value;
          }
        } catch (err) {
          console.warn('[VizFlow] Could not save comment text:', err);
        }
        this._triggerChange();
      });
      
      textarea.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });
    }
    
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.drawflow.removeNodeId(`node-${nodeId}`);
      });
    }
    
    this._setupCommentResize(nodeId);
  }

  /**
   * Restore groups after importing workflow data
   */
  _restoreImportedGroups(data) {
    if (!data?._groups || !Array.isArray(data._groups)) {
      return;
    }
    
    // Set next group ID
    if (data._nextGroupId) {
      this.nextGroupId = data._nextGroupId;
    }
    
    // Wait for DOM to fully update
    setTimeout(() => {
      data._groups.forEach(groupData => {
        const nodeIds = new Set(groupData.nodeIds.map(id => String(id)));
        
        // Verify nodes exist
        const validNodeIds = new Set();
        nodeIds.forEach(nodeId => {
          const nodeEl = this.container.querySelector(`#node-${nodeId}`);
          if (nodeEl) {
            validNodeIds.add(nodeId);
          }
        });
        
        if (validNodeIds.size >= 2) {
          const groupId = groupData.id;
          
          this.groups.set(groupId, {
            nodeIds: validNodeIds,
            label: groupData.label || `Group ${groupId}`,
            color: groupData.color || this._getGroupColor(groupId)
          });
          
          // Mark nodes as grouped
          validNodeIds.forEach(nodeId => {
            const nodeEl = this.container.querySelector(`#node-${nodeId}`);
            if (nodeEl) {
              nodeEl.dataset.groupId = groupId;
              nodeEl.classList.add('grouped');
            }
          });
          
          // Create visual group box
          this._createGroupBox(groupId);
          
          // Ensure nextGroupId is higher than any restored group
          if (groupId >= this.nextGroupId) {
            this.nextGroupId = groupId + 1;
          }
        }
      });
    }, 150);
  }

  /**
   * Restore node configs after importing workflow data
   */
  _restoreImportedNodeConfigs(data) {
    if (!data?._nodeConfigs) {
      return;
    }
    
    Object.entries(data._nodeConfigs).forEach(([nodeId, config]) => {
      this.nodeConfigs.set(String(nodeId), config);
    });
  }


  /**
   * --------------------------------------------------------------------------
   * PUBLIC: EXPORT WORKFLOW
   * --------------------------------------------------------------------------
   * 
   * Exports the workflow as a downloadable JSON file.
   * 
   * --------------------------------------------------------------------------
   */
  exportWorkflow() {
    const data = this.export();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    /**
     * Create temporary download link
     */
    const link = document.createElement('a');
    link.href = url;
    link.download = `workflow-${Date.now()}.json`;
    link.click();

    /**
     * Cleanup
     */
    URL.revokeObjectURL(url);

    this._setStatus('Workflow exported');

    /**
     * Call onSave callback if provided
     */
    if (this.options.onSave) {
      this.options.onSave(data);
    }
  }


  /**
   * --------------------------------------------------------------------------
   * PUBLIC: IMPORT WORKFLOW
   * --------------------------------------------------------------------------
   * 
   * Imports a workflow from a JSON file.
   * 
   * @param {File} file - JSON file to import
   * 
   * --------------------------------------------------------------------------
   */
  importWorkflow(file) {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        this.import(data);
      } catch (error) {
        alert('Invalid workflow file. Please select a valid JSON file.');
        console.error('WorkflowBuilder: Import error', error);
      }
    };

    reader.readAsText(file);
  }


  /**
   * --------------------------------------------------------------------------
   * PUBLIC: SET THEME
   * --------------------------------------------------------------------------
   * 
   * Changes the theme of the workflow builder.
   * 
   * @param {string} theme - 'light' or 'dark'
   * 
   * --------------------------------------------------------------------------
   */
  setTheme(theme) {
    this.options.theme = theme;
    this._applyTheme();
  }


  /**
   * --------------------------------------------------------------------------
   * PUBLIC: DESTROY
   * --------------------------------------------------------------------------
   * 
   * Destroys the workflow builder and cleans up.
   * 
   * --------------------------------------------------------------------------
   */
  destroy() {
    this.container.innerHTML = '';
    this.container.classList.remove('workflow-builder', 'theme-light', 'theme-dark');
    this.drawflow = null;
  }


  // ============================================================================
  // WORKFLOW EXECUTION
  // ============================================================================

  /**
   * Setup executor event callbacks
   */
  _setupExecutorCallbacks() {
    if (!this.executor) return;
    
    this.executor.onNodeStart = (nodeId, node) => {
      // Node execution started
    };
    
    this.executor.onNodeComplete = (nodeId, node, result) => {
      console.log('[Callback] onNodeComplete node:', nodeId, 'result.output:', result?.output);
      this._updateExecutionLog();
      // Color outgoing connections based on which output was taken
      this._colorExecutedConnection(nodeId, result?.output || 'output_1');
    };
    
    this.executor.onNodeError = (nodeId, node, error) => {
      this._setStatus(`Error in ${node.name}: ${error.message}`);
      this._updateExecutionLog();
    };
    
    this.executor.onExecutionStart = () => {
      this._setStatus('Workflow running...');
      this._updateExecutionButtons(true);
      this.showExecutionLog();
      this._updateExecutionLog();
      // Reset connection colors before execution
      this._resetExecutionConnectionColors();
    };
    
    this.executor.onExecutionComplete = (history, context) => {
      this._setStatus(`Workflow completed (${history.length} steps)`);
      this._updateExecutionButtons(false);
      this._updateExecutionLog();
    };
    
    this.executor.onExecutionError = (error) => {
      this._setStatus(`Workflow error: ${error.message}`);
      this._updateExecutionButtons(false);
      this._updateExecutionLog();
    };
  }
  
  /**
   * Reset all connection colors before execution
   */
  _resetExecutionConnectionColors() {
    const connections = this.container.querySelectorAll('.drawflow .connection');
    connections.forEach(conn => {
      conn.classList.remove('exec-taken', 'exec-not-taken');
      const path = conn.querySelector('.main-path');
      if (path) {
        // Reset ALL inline styles that may have been set during execution
        path.style.removeProperty('stroke');
        path.style.removeProperty('stroke-width');
        path.style.removeProperty('filter');
        path.style.removeProperty('opacity');
      }
    });
    // Re-apply static condition colors
    this._colorConditionConnections();
  }
  
  /**
   * Color the connection that was taken during execution
   */
  _colorExecutedConnection(nodeId, outputKey) {
    const conditionTypes = ['condition', 'if', 'decision', 'loop'];
    const nodeEl = this.container.querySelector(`#node-${nodeId}`);
    if (!nodeEl) return;
    
    const nodeType = nodeEl.getAttribute('data-type');
    
    // Only handle branching nodes with 2 outputs
    if (!conditionTypes.includes(nodeType)) return;
    
    // Find ALL connections from this node (try multiple selectors)
    const connections = this.container.querySelectorAll(
      `.drawflow .connection.node_out_node-${nodeId}, ` +
      `.drawflow svg.connection.node_out_node-${nodeId}`
    );
    
    console.log('[Colors] Node', nodeId, 'type:', nodeType, 'outputKey:', outputKey, 'found connections:', connections.length);
    
    // Semantic colors for branching nodes
    const trueColor = '#22C55E';   // Green for TRUE/output_1
    const falseColor = '#EF4444';  // Red for FALSE/output_2
    const notTakenColor = '#9CA3AF'; // Gray for not taken
    
    connections.forEach(conn => {
      const classList = conn.getAttribute('class') || '';
      const path = conn.querySelector('.main-path');
      if (!path) return;
      
      const isTaken = classList.includes(outputKey);
      const isOutput1 = classList.includes('output_1');
      const isOutput2 = classList.includes('output_2');
      
      console.log('[Colors] Connection class:', classList, 'isTaken:', isTaken, 'outputKey:', outputKey);
      
      // Remove any previous condition classes to prevent conflicts
      conn.classList.remove('condition-true', 'condition-false');
      
      if (isTaken) {
        // Taken path - use semantic color (green for true, red for false)
        const color = isOutput1 ? trueColor : falseColor;
        const shadow = isOutput1 ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)';
        path.style.setProperty('stroke', color, 'important');
        path.style.setProperty('stroke-width', '3', 'important');
        path.style.setProperty('filter', `drop-shadow(0 0 4px ${shadow})`, 'important');
        path.style.removeProperty('opacity');
        conn.classList.add('exec-taken');
        conn.classList.remove('exec-not-taken');
      } else {
        // Not-taken path - dimmed gray
        path.style.setProperty('stroke', notTakenColor, 'important');
        path.style.setProperty('stroke-width', '2', 'important');
        path.style.setProperty('opacity', '0.5', 'important');
        path.style.removeProperty('filter');
        conn.classList.add('exec-not-taken');
        conn.classList.remove('exec-taken');
      }
    });
  }

  /**
   * Update execution control buttons state
   */
  _updateExecutionButtons(isRunning) {
    const runBtn = this.container.querySelector('[data-action="exec-run"]');
    const pauseBtn = this.container.querySelector('[data-action="exec-pause"]');
    const stopBtn = this.container.querySelector('[data-action="exec-stop"]');
    
    if (runBtn) runBtn.disabled = isRunning;
    if (pauseBtn) pauseBtn.disabled = !isRunning;
    if (stopBtn) stopBtn.disabled = !isRunning;
  }

  /**
   * Run the workflow
   */
  runWorkflow() {
    if (!this.executor) {
      this._setStatus('Executor not initialized');
      return;
    }
    
    this.executor.start();
  }

  /**
   * Run workflow starting from a specific node
   */
  runFromNode(nodeId) {
    if (!this.executor) {
      this._setStatus('Executor not initialized');
      return;
    }
    
    const nodes = this.executor.getNodes();
    const node = nodes[nodeId];
    
    if (!node) {
      this._setStatus('Node not found');
      return;
    }
    
    // Reset and set running state
    this.executor.reset();
    this.executor.isRunning = true;
    this.executor.isPaused = false;
    this.executor.abortController = new AbortController();
    
    this.showExecutionLog();
    this._updateExecutionButtons(true);
    this._setStatus(`Running from: ${node.name}`);
    
    // Execute this node and continue from here
    this.executor.executeFromNode(nodeId).then(() => {
      this.executor.isRunning = false;
      this._updateExecutionButtons(false);
      this._updateExecutionLog();
      this._setStatus('Workflow complete');
    }).catch(err => {
      console.error('Execution error:', err);
      this.executor.isRunning = false;
      this._updateExecutionButtons(false);
      this._updateExecutionLog();
    });
  }

  /**
   * Run only the selected node (no continuation)
   */
  runSelectedOnly() {
    const selectedNode = this.container.querySelector('.drawflow-node.selected');
    if (!selectedNode) {
      this._setStatus('No node selected');
      return;
    }
    
    const nodeId = selectedNode.id.replace('node-', '');
    this.runSingleNode(nodeId);
  }

  /**
   * Run a single node without continuing to connected nodes
   */
  runSingleNode(nodeId) {
    if (!this.executor) {
      this._setStatus('Executor not initialized');
      return;
    }
    
    const nodes = this.executor.getNodes();
    const node = nodes[nodeId];
    
    if (!node) {
      this._setStatus('Node not found');
      return;
    }
    
    // Reset and set running state
    this.executor.reset();
    this.executor.isRunning = true;
    this.executor.abortController = new AbortController();
    
    this.showExecutionLog();
    this._updateExecutionButtons(true);
    this._setStatus(`Testing: ${node.name}`);
    
    // Execute just this one node
    this.executor.executeNode(nodeId).then(result => {
      this.executor.isRunning = false;
      this._updateExecutionButtons(false);
      this._setStatus(`Completed: ${node.name}`);
      this._updateExecutionLog();
    }).catch(err => {
      console.error('Execution error:', err);
      this.executor.isRunning = false;
      this._updateExecutionButtons(false);
      this._updateExecutionLog();
    });
  }

  /**
   * Pause the workflow
   */
  pauseWorkflow() {
    if (!this.executor) return;
    
    if (this.executor.isPaused) {
      this.executor.resume();
      this._setStatus('Workflow resumed');
    } else {
      this.executor.pause();
      this._setStatus('Workflow paused');
    }
  }

  /**
   * Stop the workflow
   */
  stopWorkflow() {
    if (!this.executor) return;
    this.executor.stop();
    this._setStatus('Workflow stopped');
    this._updateExecutionButtons(false);
  }

  /**
   * Reset workflow execution state
   */
  resetWorkflow() {
    if (!this.executor) return;
    this.executor.reset();
    this._setStatus('Workflow reset');
    this._updateExecutionButtons(false);
    this._updateExecutionLog();
  }

  /**
   * Get execution state (for persistence)
   * Returns node states, execution history, and context
   */
  getExecutionState() {
    if (!this.executor) return null;
    return this.executor.exportState();
  }

  /**
   * Set execution state (restore from persistence)
   * @param {Object} state - State object from getExecutionState()
   */
  setExecutionState(state) {
    if (!this.executor || !state) return;
    this.executor.importState(state);
    this._updateExecutionLog();
  }

  /**
   * Get execution log history
   */
  getExecutionLog() {
    if (!this.executor) return [];
    return this.executor.getLog();
  }

  /**
   * Get execution context (data passed between nodes)
   */
  getExecutionContext() {
    if (!this.executor) return {};
    return this.executor.getContext();
  }

  /**
   * Toggle execution log panel visibility
   */
  toggleExecutionLog() {
    const logPanel = this.container.querySelector('#execution-log-panel');
    if (logPanel) {
      logPanel.classList.toggle('visible');
    }
  }

  /**
   * Show execution log panel
   */
  showExecutionLog() {
    const logPanel = this.container.querySelector('#execution-log-panel');
    if (logPanel) {
      logPanel.classList.add('visible');
    }
  }

  /**
   * Update execution log panel
   */
  _updateExecutionLog() {
    const logPanel = this.container.querySelector('#execution-log-panel .log-panel-body');
    if (!logPanel || !this.executor) return;
    
    const history = this.executor.getLog();
    
    if (history.length === 0) {
      logPanel.innerHTML = '<div class="log-empty">No execution history yet.</div>';
      return;
    }
    
    logPanel.innerHTML = history.map((entry, i) => {
      // Format CONFIG section
      let configHtml = '';
      if (entry.config && Object.keys(entry.config).length > 0) {
        try {
          const configStr = JSON.stringify(entry.config, null, 2);
          configHtml = `
            <div class="log-section">
              <div class="log-section-header">Request Config</div>
              <pre class="log-code">${this._escapeHtml(configStr)}</pre>
            </div>
          `;
        } catch (e) {}
      }
      
      // Format RESPONSE section (full data)
      let responseHtml = '';
      if (entry.result && entry.status === 'success') {
        const result = entry.result;
        
        // HTTP status if available
        if (result.status) {
          responseHtml += `<div class="log-http-badge ${result.ok ? 'success' : 'error'}">HTTP ${result.status} ${result.statusText || ''}</div>`;
        }
        
        // Request details (echoed from HTTP executor)
        if (result.request) {
          try {
            const reqStr = JSON.stringify(result.request, null, 2);
            responseHtml += `
              <div class="log-section log-collapsible">
                <div class="log-section-header" onclick="this.parentElement.classList.toggle('collapsed')">Request Sent</div>
                <pre class="log-code">${this._escapeHtml(reqStr)}</pre>
              </div>
            `;
          } catch (e) {}
        }
        
        // Response headers
        if (result.headers && Object.keys(result.headers).length > 0) {
          try {
            const headersStr = JSON.stringify(result.headers, null, 2);
            responseHtml += `
              <div class="log-section log-collapsible collapsed">
                <div class="log-section-header" onclick="this.parentElement.classList.toggle('collapsed')">Response Headers</div>
                <pre class="log-code">${this._escapeHtml(headersStr)}</pre>
              </div>
            `;
          } catch (e) {}
        }
        
        // Response data
        if (result.data !== undefined && result.data !== null) {
          try {
            const jsonStr = typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2);
            responseHtml += `
              <div class="log-section">
                <div class="log-section-header">Response Body</div>
                <pre class="log-code">${this._escapeHtml(jsonStr)}</pre>
              </div>
            `;
          } catch (e) {
            responseHtml += `<div class="log-section"><pre class="log-code">${String(result.data)}</pre></div>`;
          }
        }
        
        // Any other result fields (like output path, message, etc.)
        const excludeKeys = ['data', 'status', 'statusText', 'ok', 'output', 'headers', 'request', 'url'];
        const otherFields = Object.entries(result).filter(([k]) => !excludeKeys.includes(k));
        if (otherFields.length > 0) {
          responseHtml += `
            <div class="log-section">
              <div class="log-section-header">Other Info</div>
              <div class="log-fields">
                ${otherFields.map(([k, v]) => `<div><strong>${k}:</strong> ${typeof v === 'object' ? JSON.stringify(v) : v}</div>`).join('')}
              </div>
            </div>
          `;
        }
      }
      
      return `
        <div class="log-entry log-${entry.status}" data-node-id="${entry.nodeId}">
          <div class="log-entry-header" onclick="this.parentElement.classList.toggle('expanded')">
            <span class="log-num">#${i + 1}</span>
            <span class="log-node">${entry.nodeName}</span>
            <span class="log-status">${entry.status.toUpperCase()}</span>
            <span class="log-time">${entry.duration}ms</span>
            <span class="log-expand">▼</span>
          </div>
          <div class="log-entry-details">
            ${entry.error ? `<div class="log-error-box">Error: ${entry.error}</div>` : ''}
            ${configHtml}
            ${responseHtml}
            <div class="log-timestamp">${entry.timestamp}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Get node configuration
   */
  getNodeConfig(nodeId) {
    return this.nodeConfigs.get(String(nodeId)) || {};
  }

  /**
   * Set node configuration
   */
  setNodeConfig(nodeId, config) {
    this.nodeConfigs.set(String(nodeId), config);
    this._triggerChange();
  }

  /**
   * Show node config panel
   */
  showNodeConfigPanel(nodeId) {
    const panel = this.container.querySelector('#node-config-panel');
    const backdrop = this.container.querySelector('#config-panel-backdrop');
    if (!panel) return;
    
    const nodes = this.executor.getNodes();
    const node = nodes[nodeId];
    
    if (!node) {
      this._setStatus('Node not found');
      return;
    }
    
    // Get schema for this node type
    const schema = NodeExecutorRegistry.getConfigSchema(node.name);
    const currentConfig = this.getNodeConfig(nodeId);
    
    // Build config form
    const body = panel.querySelector('.config-panel-body');
    body.innerHTML = this._buildConfigForm(schema, currentConfig, node.name);
    
    // Store current node ID for saving
    panel.dataset.nodeId = nodeId;
    
    // Update header
    const header = panel.querySelector('.config-panel-header h3');
    header.textContent = `Configure: ${node.name}`;
    
    // Show backdrop and panel
    if (backdrop) backdrop.classList.add('visible');
    panel.classList.add('visible');
    
    // Setup conditional field visibility
    this._setupConditionalFields(panel);
  }

  /**
   * Build config form HTML from schema
   */
  _buildConfigForm(schema, currentConfig, nodeType) {
    // Always add label field at the top for renaming nodes
    const labelValue = currentConfig.label || '';
    const labelField = `
      <div class="config-field">
        <label>Node Label</label>
        <input type="text" name="label" value="${this._escapeHtml(labelValue)}" placeholder="Custom label for this node...">
        <div class="field-hint">Change the display name of this node</div>
      </div>
    `;
    
    if (!schema || schema.length === 0) {
      return `
        ${labelField}
        <div class="config-empty">No additional options for this node type.</div>
        ${this._buildCustomFieldsSection(currentConfig)}
      `;
    }
    
    // Filter out label field from schema if already present (avoid duplicate)
    const filteredSchema = schema.filter(f => f.key !== 'label');
    
    const schemaFields = filteredSchema.map(field => {
      const value = currentConfig[field.key] !== undefined ? currentConfig[field.key] : (field.default || '');
      const showIfAttr = field.showIf ? `data-show-if='${JSON.stringify(field.showIf)}'` : '';
      const hint = this._getFieldHint(field);
      
      let inputHtml = '';
      
      switch (field.type) {
        case 'text':
          inputHtml = `<input type="text" name="${field.key}" value="${this._escapeHtml(value)}" placeholder="${field.placeholder || ''}">`;
          break;
          
        case 'number':
          inputHtml = `<input type="number" name="${field.key}" value="${value}">`;
          break;
          
        case 'textarea':
          inputHtml = `<textarea name="${field.key}" placeholder="${field.placeholder || ''}" rows="3">${this._escapeHtml(value)}</textarea>`;
          break;
          
        case 'select':
          const options = (field.options || []).map(opt => 
            `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>`
          ).join('');
          inputHtml = `<select name="${field.key}">${options}</select>`;
          break;
          
        case 'json':
          const jsonValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : value;
          inputHtml = `<textarea name="${field.key}" class="config-json" placeholder="${field.placeholder || '{}'}" rows="4">${this._escapeHtml(jsonValue)}</textarea>`;
          break;
          
        case 'code':
          inputHtml = `<textarea name="${field.key}" class="config-code" placeholder="${field.placeholder || ''}" rows="6">${this._escapeHtml(value)}</textarea>`;
          break;
          
        case 'checkbox':
          inputHtml = `<label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" name="${field.key}" ${value ? 'checked' : ''}> Enable</label>`;
          break;
          
        default:
          inputHtml = `<input type="text" name="${field.key}" value="${this._escapeHtml(value)}">`;
      }
      
      return `
        <div class="config-field" ${showIfAttr}>
          <label>${field.label}</label>
          ${inputHtml}
          ${hint ? `<span class="config-field-hint">${hint}</span>` : ''}
        </div>
      `;
    }).join('');
    
    return labelField + schemaFields + this._buildCustomFieldsSection(currentConfig, filteredSchema);
  }
  
  /**
   * Get hint text for a field
   */
  _getFieldHint(field) {
    if (field.hint) return field.hint;
    
    // Auto hints based on field type or key
    if (field.type === 'json') {
      return 'Enter valid JSON. Supports {{variable}} interpolation.';
    }
    if (field.type === 'code') {
      return 'Access context via `ctx`. Return value becomes output.';
    }
    if (field.key.includes('message') || field.key.includes('url') || field.key.includes('value')) {
      return 'Use {{lastResult.data}}, {{node_1.field}}, or {{variableName}} for dynamic values.';
    }
    return '';
  }
  
  /**
   * Build custom fields section for arbitrary key-value pairs
   */
  _buildCustomFieldsSection(currentConfig, schema = []) {
    // Get keys that are not in schema
    const schemaKeys = schema.map(f => f.key);
    const customFields = Object.entries(currentConfig || {})
      .filter(([key]) => !schemaKeys.includes(key))
      .map(([key, value]) => `
        <div class="custom-field-row" data-key="${key}">
          <input type="text" value="${this._escapeHtml(key)}" placeholder="Key" class="custom-field-key" readonly>
          <input type="text" value="${this._escapeHtml(String(value))}" placeholder="Value" class="custom-field-value" name="custom_${key}">
          <button type="button" class="remove-custom-field" title="Remove">×</button>
        </div>
      `).join('');
    
    return `
      <div class="config-custom-fields">
        <h4>Custom Fields</h4>
        <div class="custom-fields-list">
          ${customFields}
        </div>
        <div class="custom-field-row new-field-row">
          <input type="text" placeholder="Key name" class="new-field-key">
          <input type="text" placeholder="Value" class="new-field-value">
          <button type="button" class="btn-add-field" title="Add">+</button>
        </div>
        <span class="config-field-hint" style="display:block;margin-top:8px;">Add any custom key-value pairs for this node's configuration.</span>
      </div>
    `;
  }

  /**
   * Setup conditional field visibility
   */
  _setupConditionalFields(panel) {
    const updateVisibility = () => {
      const fields = panel.querySelectorAll('.config-field[data-show-if]');
      fields.forEach(field => {
        const showIf = JSON.parse(field.dataset.showIf);
        let visible = true;
        
        for (const [key, expectedValue] of Object.entries(showIf)) {
          const input = panel.querySelector(`[name="${key}"]`);
          if (input && input.value !== expectedValue) {
            visible = false;
            break;
          }
        }
        
        field.style.display = visible ? 'block' : 'none';
      });
    };
    
    // Initial update
    updateVisibility();
    
    // Listen for changes
    panel.querySelectorAll('select, input').forEach(el => {
      el.addEventListener('change', updateVisibility);
    });
  }

  /**
   * Hide node config panel
   */
  hideNodeConfigPanel() {
    const panel = this.container.querySelector('#node-config-panel');
    const backdrop = this.container.querySelector('#config-panel-backdrop');
    if (panel) {
      panel.classList.remove('visible');
    }
    if (backdrop) {
      backdrop.classList.remove('visible');
    }
  }

  /**
   * Save node config from panel
   */
  saveNodeConfig() {
    const panel = this.container.querySelector('#node-config-panel');
    if (!panel) return;
    
    const nodeId = panel.dataset.nodeId;
    if (!nodeId) return;
    
    const config = {};
    
    // Get schema-based inputs
    const inputs = panel.querySelectorAll('.config-field input, .config-field textarea, .config-field select');
    
    inputs.forEach(input => {
      const name = input.name;
      if (!name) return;
      
      if (input.type === 'checkbox') {
        config[name] = input.checked;
      } else if (input.classList.contains('config-json')) {
        try {
          config[name] = JSON.parse(input.value || '{}');
        } catch (e) {
          config[name] = input.value;
        }
      } else {
        config[name] = input.value;
      }
    });
    
    // Get custom fields
    const customFieldRows = panel.querySelectorAll('.custom-field-row[data-key]');
    customFieldRows.forEach(row => {
      const key = row.dataset.key;
      const valueInput = row.querySelector('.custom-field-value');
      if (key && valueInput) {
        config[key] = valueInput.value;
      }
    });
    
    this.setNodeConfig(nodeId, config);
    
    // Update visual label if provided
    if (config.label) {
      this._updateNodeLabel(nodeId, config.label);
    }
    
    this.hideNodeConfigPanel();
    this._setStatus('Node configuration saved');
  }

  /**
   * Update a node's visual label
   */
  _updateNodeLabel(nodeId, newLabel) {
    const nodeEl = this.container.querySelector(`#node-${nodeId}`);
    if (!nodeEl) return;
    
    const labelEl = nodeEl.querySelector('.node-label');
    if (labelEl) {
      labelEl.textContent = newLabel;
    }
  }

  /**
   * Helper to escape HTML
   */
  _escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Show config tooltip on node hover
   */
  _showConfigTooltip(nodeId, nodeEl) {
    const tooltip = this.container.querySelector('#node-config-tooltip');
    if (!tooltip) return;
    
    const nodes = this.executor.getNodes();
    const node = nodes[nodeId];
    if (!node) return;
    
    const config = this.getNodeConfig(nodeId);
    const configEntries = Object.entries(config || {});
    
    // Build tooltip content
    let content = `<div class="tooltip-header">${node.name}</div>`;
    
    if (configEntries.length === 0) {
      content += '<div class="tooltip-empty">No configuration set.<br><small>Double-click to configure</small></div>';
    } else {
      content += '<div class="tooltip-config">';
      configEntries.slice(0, 6).forEach(([key, value]) => {
        let displayValue = value;
        if (typeof value === 'object') {
          displayValue = JSON.stringify(value).substring(0, 30) + '...';
        } else if (typeof value === 'string' && value.length > 40) {
          displayValue = value.substring(0, 40) + '...';
        }
        content += `<div class="tooltip-row"><span class="tooltip-key">${key}:</span> <span class="tooltip-value">${this._escapeHtml(String(displayValue))}</span></div>`;
      });
      if (configEntries.length > 6) {
        content += `<div class="tooltip-more">+${configEntries.length - 6} more...</div>`;
      }
      content += '</div>';
    }
    
    tooltip.innerHTML = content;
    
    // Position tooltip
    const rect = nodeEl.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    
    let left = rect.right - containerRect.left + 10;
    let top = rect.top - containerRect.top;
    
    // Keep tooltip within container
    if (left + 250 > containerRect.width) {
      left = rect.left - containerRect.left - 260;
    }
    
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.classList.add('visible');
  }

  /**
   * Hide config tooltip
   */
  _hideConfigTooltip() {
    const tooltip = this.container.querySelector('#node-config-tooltip');
    if (tooltip) {
      tooltip.classList.remove('visible');
    }
  }


  // ============================================================================
  // COPY / PASTE / DUPLICATE
  // ============================================================================

  /**
   * Copy selected node to clipboard
   */
  copySelected() {
    const selectedNode = this.container.querySelector('.drawflow-node.selected');
    if (!selectedNode) {
      this._setStatus('No node selected to copy');
      return;
    }

    const nodeId = selectedNode.id.replace('node-', '');
    const nodeData = this.drawflow.getNodeFromId(nodeId);
    
    if (nodeData) {
      this.clipboard = {
        type: nodeData.class,
        data: nodeData.data,
        html: nodeData.html
      };
      this._setStatus('Node copied');
    }
  }

  /**
   * Paste node from clipboard
   */
  paste() {
    if (!this.clipboard) {
      this._setStatus('Nothing to paste');
      return;
    }

    // Calculate center position of visible canvas
    const canvas = this.container.querySelector('#drawflow-canvas');
    const rect = canvas.getBoundingClientRect();
    const centerX = (rect.width / 2) / this.drawflow.zoom - this.drawflow.canvas_x / this.drawflow.zoom;
    const centerY = (rect.height / 2) / this.drawflow.zoom - this.drawflow.canvas_y / this.drawflow.zoom;

    // Add slight offset for pasted nodes
    const x = centerX + Math.random() * 50 - 25;
    const y = centerY + Math.random() * 50 - 25;

    this.addNode(this.clipboard.type, x, y, this.clipboard.data);
    this._setStatus('Node pasted');
  }

  /**
   * Duplicate selected node
   */
  duplicateSelected() {
    const selectedNode = this.container.querySelector('.drawflow-node.selected');
    if (!selectedNode) {
      this._setStatus('No node selected to duplicate');
      return;
    }

    const nodeId = selectedNode.id.replace('node-', '');
    const nodeData = this.drawflow.getNodeFromId(nodeId);
    
    if (nodeData) {
      const x = nodeData.pos_x + 50;
      const y = nodeData.pos_y + 50;
      this.addNode(nodeData.class, x, y, nodeData.data);
      this._setStatus('Node duplicated');
    }
  }


  // ============================================================================
  // ADVANCED FEATURES
  // ============================================================================

  /**
   * Fit all nodes in view
   */
  fitView(padding = 50) {
    if (!this.drawflow) return;
    
    const nodes = this.container.querySelectorAll('.drawflow-node');
    if (nodes.length === 0) {
      this._setStatus('No nodes to fit');
      return;
    }

    // Calculate bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(node => {
      const x = parseFloat(node.style.left) || 0;
      const y = parseFloat(node.style.top) || 0;
      const w = node.offsetWidth;
      const h = node.offsetHeight;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });

    // Add padding
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    const canvas = this.container.querySelector('#drawflow-canvas');
    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;

    // Calculate zoom to fit
    const scaleX = canvasWidth / contentWidth;
    const scaleY = canvasHeight / contentHeight;
    let newZoom = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%
    newZoom = Math.max(newZoom, 0.2); // Don't zoom out too much

    // Calculate center position
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Apply zoom and position
    this.drawflow.zoom = newZoom;
    this.drawflow.canvas_x = (canvasWidth / 2) - (centerX * newZoom);
    this.drawflow.canvas_y = (canvasHeight / 2) - (centerY * newZoom);
    
    this.drawflow.precanvas.style.transform = 
      `translate(${this.drawflow.canvas_x}px, ${this.drawflow.canvas_y}px) scale(${this.drawflow.zoom})`;

    this._updateZoomDisplay();
    this._setStatus('Fit to view');
  }

  /**
   * Toggle minimap visibility
   */
  toggleMinimap() {
    this.minimapVisible = !this.minimapVisible;
    const minimap = this.container.querySelector('.workflow-minimap');
    if (minimap) {
      minimap.classList.toggle('hidden', !this.minimapVisible);
    }
    
    // Update toggle button state
    const btn = this.container.querySelector('[data-action="toggle-minimap"]');
    if (btn) {
      btn.classList.toggle('active', this.minimapVisible);
    }
    
    this._setStatus(this.minimapVisible ? 'Minimap shown' : 'Minimap hidden');
  }

  /**
   * Toggle snap to grid
   */
  toggleSnap() {
    this.snapEnabled = !this.snapEnabled;
    
    // Update toggle button state
    const btn = this.container.querySelector('[data-action="toggle-snap"]');
    if (btn) {
      btn.classList.toggle('active', this.snapEnabled);
    }
    
    this._setStatus(this.snapEnabled ? 'Snap to grid enabled' : 'Snap to grid disabled');
  }

  /**
   * Toggle animated edges
   */
  toggleAnimate() {
    this.animateEnabled = !this.animateEnabled;
    
    // Toggle animation class on canvas
    const canvas = this.container.querySelector('#drawflow-canvas');
    if (canvas) {
      canvas.classList.toggle('animated-edges', this.animateEnabled);
    }
    
    // Update toggle button state
    const btn = this.container.querySelector('[data-action="toggle-animate"]');
    if (btn) {
      btn.classList.toggle('active', this.animateEnabled);
    }
    
    this._setStatus(this.animateEnabled ? 'Animated edges enabled' : 'Animated edges disabled');
  }

  /**
   * Snap position to grid
   */
  snapToGrid(x, y) {
    if (!this.snapEnabled) return { x, y };
    const gridSize = this.options.gridSize;
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize
    };
  }

  /**
   * Select multiple nodes
   */
  selectNodes(nodeIds) {
    // Clear previous selection
    this.clearSelection();
    
    nodeIds.forEach(id => {
      const node = this.container.querySelector(`#node-${id}`);
      if (node) {
        node.classList.add('multi-selected');
        this.selectedNodes.add(id);
      }
    });
    
    this._setStatus(`${this.selectedNodes.size} nodes selected`);
  }

  /**
   * Select all nodes on canvas
   */
  selectAllNodes() {
    this.clearSelection();
    
    const nodes = this.container.querySelectorAll('.drawflow-node');
    nodes.forEach(node => {
      // Skip collapsed-hidden nodes
      if (node.classList.contains('collapsed-hidden')) return;
      
      const nodeId = node.id.replace('node-', '');
      node.classList.add('multi-selected');
      this.selectedNodes.add(nodeId);
    });
    
    this._setStatus(`${this.selectedNodes.size} nodes selected`);
  }

  /**
   * Clear multi-selection and Drawflow selection
   */
  clearSelection() {
    // Clear our multi-selected nodes
    this.container.querySelectorAll('.multi-selected').forEach(node => {
      node.classList.remove('multi-selected');
    });
    this.selectedNodes.clear();
    
    // Also clear Drawflow's native selection
    this.container.querySelectorAll('.drawflow-node.selected').forEach(node => {
      node.classList.remove('selected');
    });
  }

  /**
   * Delete all selected nodes
   */
  deleteSelected() {
    // First try multi-selected nodes
    if (this.selectedNodes && this.selectedNodes.size > 0) {
      const count = this.selectedNodes.size;
      this.selectedNodes.forEach(id => {
        this.drawflow.removeNodeId(`node-${id}`);
      });
      this.clearSelection();
      this._setStatus(`${count} nodes deleted`);
      return;
    }
    
    // Then try single selected node
    const selectedNode = this.container.querySelector('.drawflow-node.selected');
    if (selectedNode) {
      const nodeId = selectedNode.id.replace('node-', '');
      this.drawflow.removeNodeId(`node-${nodeId}`);
      this._setStatus('Node deleted');
    }
  }

  /**
   * Get nodes in selection box
   */
  getNodesInRect(rect) {
    const nodeIds = [];
    const nodes = this.container.querySelectorAll('.drawflow-node');
    
    nodes.forEach(node => {
      const nodeRect = node.getBoundingClientRect();
      if (this._rectsIntersect(rect, nodeRect)) {
        const id = node.id.replace('node-', '');
        nodeIds.push(id);
      }
    });
    
    return nodeIds;
  }

  /**
   * Check if two rects intersect
   */
  _rectsIntersect(r1, r2) {
    return !(r2.left > r1.right || 
             r2.right < r1.left || 
             r2.top > r1.bottom ||
             r2.bottom < r1.top);
  }

  /**
   * Export workflow as PNG image
   */
  async exportAsImage(format = 'png') {
    const canvas = this.container.querySelector('#drawflow-canvas');
    if (!canvas) return;

    try {
      const drawflowEl = canvas.querySelector('.drawflow');
      if (!drawflowEl) return;

      // Get all nodes
      const nodes = canvas.querySelectorAll('.drawflow-node');
      if (nodes.length === 0) {
        this._setStatus('No nodes to export');
        return;
      }

      // Calculate bounds
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodes.forEach(node => {
        const x = parseFloat(node.style.left) || 0;
        const y = parseFloat(node.style.top) || 0;
        const w = node.offsetWidth;
        const h = node.offsetHeight;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + w);
        maxY = Math.max(maxY, y + h);
      });

      const padding = 80;
      const width = maxX - minX + padding * 2;
      const height = maxY - minY + padding * 2;

      // Create canvas
      const exportCanvas = document.createElement('canvas');
      const ctx = exportCanvas.getContext('2d');
      const scale = 2; // High DPI
      
      exportCanvas.width = width * scale;
      exportCanvas.height = height * scale;
      ctx.scale(scale, scale);

      // Fill background with gradient
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#F8FAFC');
      gradient.addColorStop(1, '#F1F5F9');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Draw dot pattern background
      ctx.fillStyle = 'rgba(148, 163, 184, 0.3)';
      for (let x = 0; x < width; x += 20) {
        for (let y = 0; y < height; y += 20) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw connections first (behind nodes)
      ctx.strokeStyle = '#5A8DEE';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      
      const connections = canvas.querySelectorAll('.connection path.main-path');
      connections.forEach(path => {
        const d = path.getAttribute('d');
        if (d) {
          this._drawPath(ctx, d, minX - padding, minY - padding, 1);
        }
      });

      // Draw nodes with proper styling
      for (const node of nodes) {
        const x = (parseFloat(node.style.left) || 0) - minX + padding;
        const y = (parseFloat(node.style.top) || 0) - minY + padding;
        const w = node.offsetWidth;
        const h = node.offsetHeight;
        
        // Get node styling
        const workflowNode = node.querySelector('.workflow-node');
        const nodeLabel = node.querySelector('.node-label');
        const nodeIcon = node.querySelector('.node-icon svg');
        
        // Get computed colors
        let borderColor = '#E2E8F0';
        let bgColor = '#FFFFFF';
        let iconBgColor = '#F3F4F6';
        
        if (workflowNode) {
          const style = getComputedStyle(workflowNode);
          borderColor = style.borderLeftColor || style.borderColor || borderColor;
          bgColor = style.backgroundColor || bgColor;
        }
        
        const iconContainer = node.querySelector('.node-icon');
        if (iconContainer) {
          const iconStyle = getComputedStyle(iconContainer);
          iconBgColor = iconStyle.backgroundColor || iconBgColor;
        }

        // Draw node shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;

        // Draw node background
        ctx.fillStyle = bgColor;
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 12);
        ctx.fill();
        ctx.stroke();
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Draw left accent border
        ctx.fillStyle = borderColor;
        ctx.beginPath();
        ctx.roundRect(x, y, 4, h, [12, 0, 0, 12]);
        ctx.fill();

        // Draw icon background circle
        const iconX = x + 16;
        const iconY = y + h / 2;
        const iconRadius = 18;
        
        ctx.fillStyle = iconBgColor;
        ctx.beginPath();
        ctx.arc(iconX + iconRadius, iconY, iconRadius, 0, Math.PI * 2);
        ctx.fill();

        // Draw icon (simplified - draw a placeholder)
        ctx.fillStyle = borderColor;
        ctx.beginPath();
        ctx.arc(iconX + iconRadius, iconY, 8, 0, Math.PI * 2);
        ctx.fill();

        // Draw label
        if (nodeLabel) {
          ctx.fillStyle = '#1E293B';
          ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(nodeLabel.textContent, x + 58, y + h / 2);
        }

        // Draw connection dots
        const inputDot = node.querySelector('.input');
        const outputDot = node.querySelector('.output');
        
        // Input dot (left side)
        if (inputDot) {
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = '#94A3B8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x + 2, y + 25, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        
        // Output dot (right side)
        if (outputDot) {
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = '#94A3B8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x + w - 24, y + 25, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }

      // Add watermark/branding (optional)
      ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('Workflow Builder', width - 20, height - 15);

      // Download
      const link = document.createElement('a');
      link.download = `workflow.${format}`;
      link.href = exportCanvas.toDataURL(`image/${format}`, 0.95);
      link.click();

      this._setStatus(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export failed:', error);
      this._setStatus('Export failed');
    }
  }

  /**
   * Draw SVG path to canvas context
   */
  _drawPath(ctx, d, offsetX, offsetY, scale) {
    // Parse basic SVG path commands (M, L, C, Q, Z)
    const commands = d.match(/[MLCQSTZ][^MLCQSTZ]*/gi) || [];
    ctx.beginPath();
    
    let currentX = 0, currentY = 0;
    
    commands.forEach(cmd => {
      const type = cmd[0].toUpperCase();
      const args = cmd.slice(1).trim().split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n));
      
      switch (type) {
        case 'M':
          currentX = (args[0] - offsetX) * scale;
          currentY = (args[1] - offsetY) * scale;
          ctx.moveTo(currentX, currentY);
          break;
        case 'L':
          currentX = (args[0] - offsetX) * scale;
          currentY = (args[1] - offsetY) * scale;
          ctx.lineTo(currentX, currentY);
          break;
        case 'C':
          // Cubic bezier
          ctx.bezierCurveTo(
            (args[0] - offsetX) * scale,
            (args[1] - offsetY) * scale,
            (args[2] - offsetX) * scale,
            (args[3] - offsetY) * scale,
            (args[4] - offsetX) * scale,
            (args[5] - offsetY) * scale
          );
          currentX = (args[4] - offsetX) * scale;
          currentY = (args[5] - offsetY) * scale;
          break;
        case 'Q':
          // Quadratic bezier
          ctx.quadraticCurveTo(
            (args[0] - offsetX) * scale,
            (args[1] - offsetY) * scale,
            (args[2] - offsetX) * scale,
            (args[3] - offsetY) * scale
          );
          currentX = (args[2] - offsetX) * scale;
          currentY = (args[3] - offsetY) * scale;
          break;
        case 'Z':
          ctx.closePath();
          break;
      }
    });
    
    ctx.stroke();
  }


  // ============================================================================
  // MOVEMENT & SELECTION
  // ============================================================================

  /**
   * Move selected node by delta
   */
  moveSelected(dx, dy) {
    const selectedNode = this.container.querySelector('.drawflow-node.selected');
    if (!selectedNode) return;

    const nodeId = selectedNode.id.replace('node-', '');

    const nodeData = this.drawflow.getNodeFromId(nodeId);
    if (nodeData) {
      let newX = nodeData.pos_x + dx;
      let newY = nodeData.pos_y + dy;
      
      // Update position in Drawflow
      this.drawflow.drawflow.drawflow.Home.data[nodeId].pos_x = newX;
      this.drawflow.drawflow.drawflow.Home.data[nodeId].pos_y = newY;
      
      // Update DOM position
      selectedNode.style.left = `${newX}px`;
      selectedNode.style.top = `${newY}px`;
      
      // Update connections
      this.drawflow.updateConnectionNodes(`node-${nodeId}`);
    }
  }

  /**
   * Deselect all nodes
   */
  deselectAll() {
    const selectedNodes = this.container.querySelectorAll('.drawflow-node.selected');
    selectedNodes.forEach(node => node.classList.remove('selected'));
    this._hideProperties();
  }


  // ============================================================================
  // FIT TO SCREEN
  // ============================================================================

  /**
   * Fit all nodes to screen
   */
  fitToScreen() {
    const nodes = this.container.querySelectorAll('.drawflow-node');
    if (nodes.length === 0) {
      this.zoomReset();
      return;
    }

    // Get bounding box of all nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    nodes.forEach(node => {
      const nodeId = node.id.replace('node-', '');
      const nodeData = this.drawflow.getNodeFromId(nodeId);
      if (nodeData) {
        minX = Math.min(minX, nodeData.pos_x);
        minY = Math.min(minY, nodeData.pos_y);
        maxX = Math.max(maxX, nodeData.pos_x + 200); // Approximate node width
        maxY = Math.max(maxY, nodeData.pos_y + 100); // Approximate node height
      }
    });

    // Calculate required zoom to fit
    const canvas = this.container.querySelector('#drawflow-canvas');
    const rect = canvas.getBoundingClientRect();
    const padding = 80;
    
    const contentWidth = maxX - minX + padding * 2;
    const contentHeight = maxY - minY + padding * 2;
    
    const zoomX = rect.width / contentWidth;
    const zoomY = rect.height / contentHeight;
    const newZoom = Math.min(zoomX, zoomY, 1); // Don't zoom in beyond 100%

    // Center the content
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // Apply zoom and pan
    this.drawflow.zoom = newZoom;
    this.drawflow.canvas_x = rect.width / 2 - centerX * newZoom;
    this.drawflow.canvas_y = rect.height / 2 - centerY * newZoom;
    
    // Update display
    this.drawflow.zoom_refresh();
    this._updateZoomDisplay(newZoom);
    this._setStatus('Fit to screen');
  }


  // ============================================================================
  // CONTEXT MENU
  // ============================================================================

  /**
   * Setup right-click context menu
   */
  _setupContextMenu() {
    // Preset colors for nodes and connections
    this.presetColors = [
      { name: 'Teal', value: '#02514a' },
      { name: 'Green', value: '#10B981' },
      { name: 'Red', value: '#EF4444' },
      { name: 'Purple', value: '#8B5CF6' },
      { name: 'Orange', value: '#F97316' },
      { name: 'Yellow', value: '#EAB308' },
      { name: 'Pink', value: '#EC4899' },
      { name: 'Cyan', value: '#06B6D4' },
      { name: 'Gray', value: '#6B7280' },
    ];
    
    const colorSwatches = this.presetColors.map(c => 
      `<div class="color-swatch" data-color="${c.value}" title="${c.name}" style="background-color: ${c.value}"></div>`
    ).join('');
    
    // Create context menu element
    const menu = document.createElement('div');
    menu.className = 'workflow-context-menu';
    menu.innerHTML = `
      <div class="context-menu-item" data-action="configure">Configure Node</div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" data-action="run-single">▶ Test This Node Only</div>
      <div class="context-menu-item" data-action="run-from-here">▶▶ Run Workflow From Here</div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" data-action="copy">Copy</div>
      <div class="context-menu-item" data-action="paste">Paste</div>
      <div class="context-menu-item" data-action="duplicate">Duplicate</div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item context-menu-submenu" data-submenu="node-color">
        Change Color
        <span class="submenu-arrow">▶</span>
        <div class="context-submenu" id="node-color-submenu">
          <div class="color-picker-grid">${colorSwatches}</div>
          <div class="color-picker-custom">
            <input type="color" id="custom-node-color" value="#02514a">
            <span>Custom</span>
          </div>
        </div>
      </div>
      <div class="context-menu-item" data-action="add-comment">Add Comment</div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" data-action="toggle-group">Group / Ungroup</div>
      <div class="context-menu-item" data-action="collapse-group">Collapse Group</div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" data-action="disconnect">Disconnect All</div>
      <div class="context-menu-item context-menu-danger" data-action="delete">Delete</div>
      <div class="context-menu-item context-menu-danger" data-action="delete-connection" style="display:none;">Delete Connection</div>
    `;
    this.container.appendChild(menu);
    this.contextMenu = menu;
    this.contextMenuNodeId = null;  // Track which node the context menu is for
    this.contextMenuPosition = { x: 0, y: 0 };  // Track where menu was opened
    this.selectedConnection = null;  // Track selected connection for deletion

    // Handle right-click on canvas
    const canvas = this.container.querySelector('#drawflow-canvas');
    canvas.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      
      // ALWAYS reset connection state at start of every context menu
      this.selectedConnection = null;
      
      // Store position for adding comments
      const canvasRect = canvas.getBoundingClientRect();
      this.contextMenuPosition = {
        x: (event.clientX - canvasRect.left) / this.drawflow.zoom - this.drawflow.canvas_x / this.drawflow.zoom,
        y: (event.clientY - canvasRect.top) / this.drawflow.zoom - this.drawflow.canvas_y / this.drawflow.zoom
      };
      
      // Check if right-clicking on a connection
      // Only detect as connection if clicking on the actual path line, not SVG container
      let connection = null;
      const target = event.target;
      
      // Check if we clicked directly on the path (main-path) inside connection SVG
      if (target.tagName === 'path' && target.classList.contains('main-path')) {
        connection = target.closest('.connection');
      }
      
      if (connection && connection.classList.contains('connection')) {
        this.selectedConnection = connection;
        this.contextMenuNodeId = null;
        this._showContextMenu(event.clientX, event.clientY, false, true);
        return;
      }
      
      // Check if right-clicking on a node
      const node = event.target.closest('.drawflow-node');
      if (node) {
        const nodeId = node.id.replace('node-', '');
        
        // If this node is NOT already in our selectedNodes, add it
        // This ensures grouping operations work with right-clicked nodes
        if (!this.selectedNodes.has(nodeId)) {
          // If we have multi-selected nodes, add this node to the selection
          // Otherwise, start a new selection with just this node
          if (this.selectedNodes.size === 0) {
            // No multi-selection, just select this node
            node.classList.add('multi-selected');
          } else {
            // Add to existing multi-selection
            node.classList.add('multi-selected');
          }
          this.selectedNodes.add(nodeId);
        }
        
        // Also set Drawflow selection
        node.classList.add('selected');
        this.contextMenuNodeId = nodeId;
        this._showProperties(nodeId);
      } else {
        this.contextMenuNodeId = null;
      }
      
      this._showContextMenu(event.clientX, event.clientY, !!node, false);
    });

    // Handle double-click on connections to delete them
    canvas.addEventListener('dblclick', (event) => {
      const connection = event.target.closest('.connection');
      if (connection) {
        this._deleteConnection(connection);
      }
    });
    
    // Handle color swatch clicks for nodes
    menu.querySelectorAll('#node-color-submenu .color-swatch').forEach(swatch => {
      swatch.addEventListener('click', (event) => {
        event.stopPropagation();
        const color = swatch.dataset.color;
        if (this.contextMenuNodeId) {
          this.setNodeColor(this.contextMenuNodeId, color);
        }
        this._hideContextMenu();
      });
    });
    
    // Handle custom color input for nodes
    const customColorInput = menu.querySelector('#custom-node-color');
    if (customColorInput) {
      customColorInput.addEventListener('change', (event) => {
        event.stopPropagation();
        if (this.contextMenuNodeId) {
          this.setNodeColor(this.contextMenuNodeId, event.target.value);
        }
        this._hideContextMenu();
      });
    }

    // Handle context menu item clicks
    menu.addEventListener('click', (event) => {
      const item = event.target.closest('.context-menu-item');
      if (!item) return;
      
      // Don't close menu if clicking on submenu parent
      if (item.classList.contains('context-menu-submenu')) {
        event.stopPropagation();
        return;
      }
      
      const action = item.dataset.action;
      
      switch (action) {
        case 'configure':
          if (this.contextMenuNodeId) {
            this.showNodeConfigPanel(this.contextMenuNodeId);
          }
          break;
        case 'run-single':
          if (this.contextMenuNodeId) {
            this.runSingleNode(this.contextMenuNodeId);
          }
          break;
        case 'run-from-here':
          if (this.contextMenuNodeId) {
            this.runFromNode(this.contextMenuNodeId);
          }
          break;
        case 'copy':
          this.copySelected();
          break;
        case 'paste':
          this.paste();
          break;
        case 'duplicate':
          this.duplicateSelected();
          break;
        case 'add-comment':
          this.addComment(this.contextMenuPosition.x, this.contextMenuPosition.y);
          break;
        case 'toggle-group':
          this.toggleGroup();
          break;
        case 'collapse-group':
          this.collapseSelectedGroup();
          break;
        case 'disconnect':
          this.disconnectSelected();
          break;
        case 'delete':
          this.deleteSelected();
          break;
        case 'delete-connection':
          if (this.selectedConnection) {
            this._deleteConnection(this.selectedConnection);
            this.selectedConnection = null;
          }
          break;
      }
      
      this._hideContextMenu();
    });

    // Hide context menu on click elsewhere
    document.addEventListener('click', () => {
      this._hideContextMenu();
    });
  }

  /**
   * Delete a connection element
   */
  _deleteConnection(connectionEl) {
    // Parse connection info from class names
    // Classes are like: "connection node_in_node-2 node_out_node-1 output_1 input_1"
    // SVG elements use classList or getAttribute('class'), not className.split()
    const classString = connectionEl.getAttribute('class') || '';
    const classes = classString.split(' ');
    let inputNodeId, outputNodeId, inputClass, outputClass;
    
    classes.forEach(cls => {
      if (cls.startsWith('node_in_node-')) {
        inputNodeId = parseInt(cls.replace('node_in_node-', ''));
      }
      if (cls.startsWith('node_out_node-')) {
        outputNodeId = parseInt(cls.replace('node_out_node-', ''));
      }
      if (cls.startsWith('output_')) {
        outputClass = cls;
      }
      if (cls.startsWith('input_')) {
        inputClass = cls;
      }
    });
    
    if (outputNodeId && inputNodeId && outputClass && inputClass) {
      this.drawflow.removeSingleConnection(outputNodeId, inputNodeId, outputClass, inputClass);
      this._setStatus('Connection deleted');
    }
  }

  /**
   * Show context menu at position
   */
  _showContextMenu(x, y, hasNode, isConnection = false) {
    this.contextMenu.style.left = `${x}px`;
    this.contextMenu.style.top = `${y}px`;
    this.contextMenu.classList.add('visible');
    
    // Show/hide delete-connection option
    const deleteConnItem = this.contextMenu.querySelector('[data-action="delete-connection"]');
    if (deleteConnItem) {
      deleteConnItem.style.display = isConnection ? 'block' : 'none';
    }
    
    // Show/hide node color submenu
    const nodeColorSubmenu = this.contextMenu.querySelector('[data-submenu="node-color"]');
    if (nodeColorSubmenu) {
      nodeColorSubmenu.style.display = (hasNode && !isConnection) ? 'block' : 'none';
    }
    
    // Check if selection includes grouped nodes or multiple selected
    const hasGroupedNodes = this._selectionHasGroupedNodes();
    // Need 2+ nodes to group; single selected node doesn't count
    const hasMultipleSelected = this.selectedNodes.size >= 2;
    const canToggleGroup = hasMultipleSelected || hasGroupedNodes;
    
    // Check if selection has a collapsible group (non-collapsed group)
    const canCollapseGroup = this._selectionHasCollapsibleGroup();
    
    // Show/hide other items based on context
    const items = this.contextMenu.querySelectorAll('.context-menu-item');
    items.forEach(item => {
      const action = item.dataset.action;
      
      // For connection context menu, hide most items
      if (isConnection) {
        if (action !== 'delete-connection') {
          item.style.display = 'none';
        }
      } else {
        // Normal context menu
        if (action === 'delete-connection') {
          item.style.display = 'none';
        } else {
          item.style.display = 'block';
          if (['copy', 'duplicate', 'disconnect', 'delete'].includes(action)) {
            item.classList.toggle('disabled', !hasNode);
          }
          if (action === 'paste') {
            item.classList.toggle('disabled', !this.clipboard);
          }
          if (action === 'toggle-group') {
            item.classList.toggle('disabled', !canToggleGroup);
            // Update label based on state
            if (hasGroupedNodes) {
              item.textContent = 'Ungroup';
            } else if (hasMultipleSelected) {
              item.textContent = 'Group Selected';
            } else {
              item.textContent = 'Group / Ungroup';
            }
          }
          if (action === 'collapse-group') {
            item.classList.toggle('disabled', !canCollapseGroup);
          }
        }
      }
    });
    
    // Show/hide dividers
    const dividers = this.contextMenu.querySelectorAll('.context-menu-divider');
    dividers.forEach(d => {
      d.style.display = isConnection ? 'none' : 'block';
    });
  }

  /**
   * Hide context menu
   */
  _hideContextMenu() {
    if (this.contextMenu) {
      this.contextMenu.classList.remove('visible');
    }
  }

  /**
   * Disconnect all connections from selected node
   */
  disconnectSelected() {
    const selectedNode = this.container.querySelector('.drawflow-node.selected');
    if (!selectedNode) {
      this._setStatus('No node selected');
      return;
    }

    const nodeId = selectedNode.id.replace('node-', '');
    const nodeData = this.drawflow.getNodeFromId(nodeId);
    
    if (nodeData) {
      // Remove all input connections
      Object.keys(nodeData.inputs).forEach(inputKey => {
        const connections = nodeData.inputs[inputKey].connections;
        connections.forEach(conn => {
          this.drawflow.removeSingleConnection(conn.node, nodeId, conn.input, inputKey);
        });
      });
      
      // Remove all output connections
      Object.keys(nodeData.outputs).forEach(outputKey => {
        const connections = nodeData.outputs[outputKey].connections;
        connections.forEach(conn => {
          this.drawflow.removeSingleConnection(nodeId, conn.node, outputKey, conn.output);
        });
      });
      
      this._setStatus('Disconnected all connections');
    }
  }


  // ============================================================================
  // SEARCH FILTER
  // ============================================================================

  /**
   * Setup search filter for sidebar
   */
  _setupSearchFilter() {
    const searchInput = this.container.querySelector('#node-search');
    if (!searchInput) return;

    searchInput.addEventListener('input', (event) => {
      this.searchFilter = event.target.value.toLowerCase().trim();
      this._filterNodePalette();
    });
    
    // Clear search on Escape
    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        searchInput.value = '';
        this.searchFilter = '';
        this._filterNodePalette();
      }
    });
  }

  /**
   * Filter node palette based on search
   */
  _filterNodePalette() {
    const nodeItems = this.container.querySelectorAll('.node-item');
    const palette = this.container.querySelector('.node-palette');
    let visibleCount = 0;
    
    nodeItems.forEach(item => {
      const name = (item.querySelector('.node-item-name')?.textContent || '').toLowerCase();
      const desc = (item.querySelector('.node-item-desc')?.textContent || '').toLowerCase();
      const type = (item.dataset.nodeType || '').toLowerCase();
      
      const matches = !this.searchFilter || 
                      name.includes(this.searchFilter) || 
                      desc.includes(this.searchFilter) ||
                      type.includes(this.searchFilter);
      
      item.style.display = matches ? '' : 'none';
      if (matches) visibleCount++;
    });
    
    // Show/hide empty state
    let emptyState = palette.querySelector('.search-empty');
    if (visibleCount === 0 && this.searchFilter) {
      if (!emptyState) {
        emptyState = document.createElement('div');
        emptyState.className = 'search-empty';
        emptyState.innerHTML = `
          <span class="search-empty-icon">?</span>
          <p>No nodes found</p>
        `;
        palette.appendChild(emptyState);
      }
      emptyState.style.display = '';
    } else if (emptyState) {
      emptyState.style.display = 'none';
    }
  }


  // ============================================================================
  // MODAL EVENTS
  // ============================================================================

  /**
   * Setup modal event handlers
   */
  _setupModalEvents() {
    const modal = this.container.querySelector('#create-node-modal');
    if (!modal) return;

    // Close on overlay click (not on modal content)
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        this._hideCreateNodeModal();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal.classList.contains('visible')) {
        this._hideCreateNodeModal();
      }
    });
  }


  // ============================================================================
  // CREATE CUSTOM NODE
  // ============================================================================

  /**
   * Show the create node modal
   */
  _showCreateNodeModal() {
    const modal = this.container.querySelector('#create-node-modal');
    if (modal) {
      modal.classList.add('visible');
      // Focus on name input
      const nameInput = modal.querySelector('#new-node-name');
      if (nameInput) nameInput.focus();
    }
  }

  /**
   * Hide the create node modal
   */
  _hideCreateNodeModal() {
    const modal = this.container.querySelector('#create-node-modal');
    if (modal) {
      modal.classList.remove('visible');
      // Clear form
      this._clearCreateNodeForm();
    }
  }

  /**
   * Clear the create node form
   */
  _clearCreateNodeForm() {
    const modal = this.container.querySelector('#create-node-modal');
    if (!modal) return;
    
    modal.querySelector('#new-node-name').value = '';
    modal.querySelector('#new-node-icon').value = '';
    modal.querySelector('#new-node-description').value = '';
    modal.querySelector('#new-node-inputs').value = '1';
    modal.querySelector('#new-node-outputs').value = '1';
    modal.querySelector('#new-node-fields').value = '';
  }

  /**
   * Save custom node from modal form
   */
  _saveCustomNode() {
    const modal = this.container.querySelector('#create-node-modal');
    if (!modal) return;

    // Get form values
    const name = modal.querySelector('#new-node-name').value.trim();
    const icon = modal.querySelector('#new-node-icon').value.trim() || name.charAt(0).toUpperCase();
    const description = modal.querySelector('#new-node-description').value.trim() || 'Custom node';
    const inputs = parseInt(modal.querySelector('#new-node-inputs').value) || 1;
    const outputs = parseInt(modal.querySelector('#new-node-outputs').value) || 1;
    const fieldsText = modal.querySelector('#new-node-fields').value.trim();

    // Validate
    if (!name) {
      alert('Please enter a node name');
      return;
    }

    // Generate type ID from name
    const typeId = name.toLowerCase().replace(/[^a-z0-9]/g, '_');

    // Check if type already exists
    if (this.nodeRegistry.get(typeId)) {
      alert(`A node type "${typeId}" already exists`);
      return;
    }

    // Parse fields
    const fields = [];
    if (fieldsText) {
      const lines = fieldsText.split('\n');
      lines.forEach(line => {
        const [fieldName, fieldType] = line.split(':').map(s => s.trim());
        if (fieldName) {
          fields.push({
            name: fieldName,
            label: fieldName.charAt(0).toUpperCase() + fieldName.slice(1),
            type: fieldType || 'text',
            default: '',
            placeholder: `Enter ${fieldName}...`
          });
        }
      });
    }

    // Create node definition
    const nodeDefinition = {
      label: name,
      icon: icon,
      color: '#64748B',
      description: description,
      inputs: inputs,
      outputs: outputs,
      fields: fields.length > 0 ? fields : [
        { name: 'value', label: 'Value', type: 'text', default: '', placeholder: 'Enter value...' }
      ]
    };

    // Register the node
    this.registerNode(typeId, nodeDefinition);

    // Close modal
    this._hideCreateNodeModal();
    this._setStatus(`Custom node "${name}" created`);
  }


  // ============================================================================
  // MODE SWITCHING
  // ============================================================================

  /**
   * --------------------------------------------------------------------------
   * PUBLIC: SET MODE
   * --------------------------------------------------------------------------
   * 
   * Switches the workflow builder between edit and view modes.
   * 
   * @param {string} mode - 'edit' or 'view'
   * 
   * EXAMPLE:
   *   workflow.setMode('view');  // Switch to read-only mode
   *   workflow.setMode('edit');  // Switch back to edit mode
   * 
   * --------------------------------------------------------------------------
   */
  setMode(mode) {
    if (mode !== 'edit' && mode !== 'view') {
      console.warn(`WorkflowBuilder: Invalid mode "${mode}". Use 'edit' or 'view'.`);
      return;
    }

    if (mode === this.mode) return;  // No change needed

    // Save current workflow data
    const data = this.export();
    
    // Update mode
    this.mode = mode;
    this.container.classList.remove('mode-edit', 'mode-view');
    this.container.classList.add(`mode-${mode}`);
    
    // Rebuild UI for new mode
    this._buildUserInterface();
    this._initializeDrawflow();
    this._setupEventListeners();
    
    // Restore workflow data
    if (data && data.drawflow) {
      this.import(data);
    }
    
    this._setStatus(mode === 'view' ? 'View mode' : 'Edit mode');
  }

  /**
   * --------------------------------------------------------------------------
   * PUBLIC: GET MODE
   * --------------------------------------------------------------------------
   * 
   * Returns the current mode.
   * 
   * @returns {string} Current mode ('edit' or 'view')
   * 
   * --------------------------------------------------------------------------
   */
  getMode() {
    return this.mode;
  }

  /**
   * --------------------------------------------------------------------------
   * PUBLIC: IS VIEW MODE
   * --------------------------------------------------------------------------
   * 
   * Checks if currently in view mode.
   * 
   * @returns {boolean} True if in view mode
   * 
   * --------------------------------------------------------------------------
   */
  isViewMode() {
    return this.mode === 'view';
  }


  // ============================================================================
  // WORKFLOW VALIDATION
  // ============================================================================

  /**
   * --------------------------------------------------------------------------
   * PUBLIC: VALIDATE
   * --------------------------------------------------------------------------
   * 
   * Validates the workflow and shows errors/warnings.
   * Checks for:
   *   - Empty workflow
   *   - Missing trigger nodes
   *   - Unconnected nodes
   *   - Missing required fields
   *   - Orphan end nodes
   * 
   * @returns {Object} Validation result { valid, errors, warnings }
   * 
   * EXAMPLE:
   *   const result = workflow.validate();
   *   if (!result.valid) {
   *     console.log('Errors:', result.errors);
   *   }
   * 
   * --------------------------------------------------------------------------
   */
  validate() {
    const result = {
      valid: true,
      errors: [],
      warnings: []
    };

    const data = this.drawflow.export();
    const nodes = data.drawflow.Home.data;
    const nodeIds = Object.keys(nodes);

    // Check 1: Empty workflow
    if (nodeIds.length === 0) {
      result.valid = false;
      result.errors.push({
        type: 'empty',
        message: 'Workflow is empty. Add at least one node.'
      });
      this._showValidationResults(result);
      return result;
    }

    // Check 2: Must have at least one trigger
    const triggers = nodeIds.filter(id => nodes[id].name === 'trigger');
    if (triggers.length === 0) {
      result.warnings.push({
        type: 'no-trigger',
        message: 'No trigger node found. Workflow needs a starting point.'
      });
    }

    // Check 3: Unconnected nodes (no inputs AND no outputs)
    nodeIds.forEach(id => {
      const node = nodes[id];
      const definition = this.nodeRegistry.get(node.name);
      
      const hasInputConnections = Object.values(node.inputs || {}).some(
        input => input.connections.length > 0
      );
      const hasOutputConnections = Object.values(node.outputs || {}).some(
        output => output.connections.length > 0
      );

      // Skip trigger nodes (they don't need inputs)
      const needsInput = definition?.inputs > 0;
      // Skip end nodes (they don't need outputs)
      const needsOutput = definition?.outputs > 0;

      if (needsInput && !hasInputConnections) {
        result.warnings.push({
          type: 'unconnected-input',
          nodeId: id,
          nodeName: definition?.label || node.name,
          message: `"${definition?.label || node.name}" has no input connection.`
        });
      }

      if (needsOutput && !hasOutputConnections) {
        result.warnings.push({
          type: 'unconnected-output',
          nodeId: id,
          nodeName: definition?.label || node.name,
          message: `"${definition?.label || node.name}" has no output connection.`
        });
      }
    });

    // Check 4: Missing required fields (basic check)
    nodeIds.forEach(id => {
      const node = nodes[id];
      const definition = this.nodeRegistry.get(node.name);
      
      if (definition?.fields) {
        definition.fields.forEach(field => {
          // Check if field is likely required (API url, email to, etc.)
          const requiredFields = ['url', 'to', 'field'];
          if (requiredFields.includes(field.name)) {
            const value = node.data[field.name];
            if (!value || value.trim() === '') {
              result.warnings.push({
                type: 'missing-field',
                nodeId: id,
                nodeName: definition?.label || node.name,
                fieldName: field.label,
                message: `"${definition?.label}": ${field.label} is empty.`
              });
            }
          }
        });
      }
    });

    // Set valid based on errors (warnings don't invalidate)
    result.valid = result.errors.length === 0;

    // Show results
    this._showValidationResults(result);

    return result;
  }

  /**
   * Show validation results in a modal
   */
  _showValidationResults(result) {
    const { valid, errors, warnings } = result;
    
    // Remove existing modal
    const existing = this.container.querySelector('#validation-modal');
    if (existing) existing.remove();

    const totalIssues = errors.length + warnings.length;

    let icon, title, iconClass;
    if (valid && warnings.length === 0) {
      icon = 'OK';
      title = 'Workflow Valid';
      iconClass = 'valid';
    } else if (valid && warnings.length > 0) {
      icon = '!';
      title = `${warnings.length} Warning${warnings.length > 1 ? 's' : ''}`;
      iconClass = 'warning';
    } else {
      icon = 'X';
      title = `${errors.length} Error${errors.length > 1 ? 's' : ''}`;
      iconClass = 'error';
    }

    const issuesHtml = [
      ...errors.map(e => `<div class="validation-item error"><span class="v-icon">X</span> ${e.message}</div>`),
      ...warnings.map(w => `<div class="validation-item warning"><span class="v-icon">!</span> ${w.message}</div>`)
    ].join('') || '<div class="validation-item success"><span class="v-icon">OK</span> No issues found!</div>';

    const modalHtml = `
      <div class="modal-overlay visible" id="validation-modal">
        <div class="modal validation-modal">
          <div class="modal-header">
            <h3>Validation Results</h3>
            <button class="modal-close" data-action="close-validation">&times;</button>
          </div>
          <div class="modal-body">
            <div class="validation-summary ${iconClass}">
              <span class="validation-icon">${icon}</span>
              <span class="validation-title">${title}</span>
            </div>
            <div class="validation-issues">
              ${issuesHtml}
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-primary" data-action="close-validation">Close</button>
          </div>
        </div>
      </div>
    `;

    this.container.insertAdjacentHTML('beforeend', modalHtml);

    // Add close handlers
    const modal = this.container.querySelector('#validation-modal');
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('[data-action="close-validation"]')) {
        modal.remove();
      }
    });

    // Highlight nodes with issues
    if (totalIssues > 0) {
      const nodeIdsWithIssues = [...errors, ...warnings]
        .filter(i => i.nodeId)
        .map(i => i.nodeId);
      
      this._highlightNodes(nodeIdsWithIssues);
    }
  }

  /**
   * Highlight nodes with validation issues
   */
  _highlightNodes(nodeIds) {
    // Remove existing highlights
    this.container.querySelectorAll('.validation-highlight').forEach(el => {
      el.classList.remove('validation-highlight');
    });

    // Add highlights
    nodeIds.forEach(id => {
      const nodeEl = this.container.querySelector(`#node-${id} .workflow-node`);
      if (nodeEl) {
        nodeEl.classList.add('validation-highlight');
      }
    });

    // Remove highlights after 5 seconds
    setTimeout(() => {
      this.container.querySelectorAll('.validation-highlight').forEach(el => {
        el.classList.remove('validation-highlight');
      });
    }, 5000);
  }


  // ============================================================================
  // EXPORT AS IMAGE
  // ============================================================================

  /**
   * --------------------------------------------------------------------------
   * PUBLIC: EXPORT AS IMAGE
   * --------------------------------------------------------------------------
   * 
   * Exports the workflow diagram as a PNG image.
   * Captures nodes, connections, and styling.
   * 
   * @param {Object} options - Export options
   * @param {string} options.format - 'png' (default: 'png')
   * @param {string} options.filename - Output filename
   * @param {number} options.scale - Scale factor (default: 2 for high DPI)
   * 
   * --------------------------------------------------------------------------
   */
  async exportAsImage(options = {}) {
    const {
      format = 'png',
      filename = 'workflow',
      scale = 2
    } = options;

    const canvas = this.container.querySelector('#drawflow-canvas');
    if (!canvas) {
      this._setStatus('Cannot export: canvas not found');
      return;
    }

    this._setStatus('Generating image...');

    try {
      const drawflowEl = canvas.querySelector('.drawflow');
      if (!drawflowEl) {
        throw new Error('Drawflow element not found');
      }

      // Get export data with node positions in internal coordinates
      const exportData = this.drawflow.export();
      const nodesData = exportData.drawflow.Home.data;
      const nodeIds = Object.keys(nodesData);
      
      if (nodeIds.length === 0) {
        this._setStatus('No nodes to export');
        return;
      }

      // Get actual node sizes from DOM
      const nodeSizes = {};
      nodeIds.forEach(id => {
        const nodeEl = canvas.querySelector(`#node-${id}`);
        if (nodeEl) {
          const workflowNode = nodeEl.querySelector('.workflow-node');
          if (workflowNode) {
            nodeSizes[id] = {
              width: workflowNode.offsetWidth,
              height: workflowNode.offsetHeight
            };
          }
        }
      });

      // Calculate bounds in internal coordinates
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      nodeIds.forEach(id => {
        const nodeData = nodesData[id];
        const x = nodeData.pos_x;
        const y = nodeData.pos_y;
        const size = nodeSizes[id] || { width: 200, height: 150 };
        
        // Account for connection dots (about 50px on each side)
        minX = Math.min(minX, x - 50);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + size.width + 50);
        maxY = Math.max(maxY, y + size.height);
      });

      // Add padding
      const padding = 40;
      minX -= padding;
      minY -= padding;
      maxX += padding;
      maxY += padding;

      const width = maxX - minX;
      const height = maxY - minY;

      // Create canvas
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = width * scale;
      exportCanvas.height = height * scale;
      const ctx = exportCanvas.getContext('2d');

      // Fill background
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

      // Draw grid dots
      ctx.fillStyle = '#D1D5DB';
      for (let gx = 0; gx < width; gx += 20) {
        for (let gy = 0; gy < height; gy += 20) {
          ctx.beginPath();
          ctx.arc(gx * scale, gy * scale, 1 * scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw connections using internal coordinates
      ctx.strokeStyle = '#5A8DEE';
      ctx.lineWidth = 2 * scale;
      ctx.lineCap = 'round';
      
      // Draw connections based on export data
      nodeIds.forEach(fromId => {
        const nodeData = nodesData[fromId];
        const fromSize = nodeSizes[fromId] || { width: 200, height: 150 };
        
        Object.entries(nodeData.outputs).forEach(([outputKey, outputData]) => {
          outputData.connections.forEach(conn => {
            const toId = conn.node;
            const toNodeData = nodesData[toId];
            if (!toNodeData) return;
            
            const toSize = nodeSizes[toId] || { width: 200, height: 150 };
            
            // Calculate connection points
            const outputIndex = parseInt(outputKey.replace('output_', '')) - 1;
            const inputIndex = parseInt(conn.output.replace('input_', '')) - 1;
            
            const fromX = (nodeData.pos_x + fromSize.width + 7 - minX) * scale;
            const fromY = (nodeData.pos_y + 50 + outputIndex * 25 - minY) * scale;
            
            const toX = (toNodeData.pos_x - 7 - minX) * scale;
            const toY = (toNodeData.pos_y + 50 + inputIndex * 25 - minY) * scale;
            
            // Draw bezier curve
            const cpOffset = Math.abs(toX - fromX) * 0.5;
            ctx.beginPath();
            ctx.moveTo(fromX, fromY);
            ctx.bezierCurveTo(
              fromX + cpOffset, fromY,
              toX - cpOffset, toY,
              toX, toY
            );
            ctx.stroke();
          });
        });
      });

      // Draw nodes
      nodeIds.forEach(id => {
        const nodeData = nodesData[id];
        const size = nodeSizes[id] || { width: 200, height: 150 };
        const nodeEl = canvas.querySelector(`#node-${id}`);
        
        const x = (nodeData.pos_x - minX) * scale;
        const y = (nodeData.pos_y - minY) * scale;
        const w = size.width * scale;
        const h = size.height * scale;

        // Node shadow
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.shadowBlur = 4 * scale;
        ctx.shadowOffsetY = 2 * scale;

        // Node background
        ctx.fillStyle = '#FFFFFF';
        const radius = 8 * scale;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, radius);
        ctx.fill();

        // Reset shadow for border
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Node border
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1 * scale;
        ctx.stroke();

        // Header background
        const headerHeight = 36 * scale;
        ctx.fillStyle = '#F8FAFC';
        ctx.beginPath();
        ctx.roundRect(x, y, w, headerHeight, [radius, radius, 0, 0]);
        ctx.fill();

        // Header border
        ctx.strokeStyle = '#E2E8F0';
        ctx.beginPath();
        ctx.moveTo(x, y + headerHeight);
        ctx.lineTo(x + w, y + headerHeight);
        ctx.stroke();

        // Get node definition
        const definition = this.nodeRegistry.get(nodeData.name);
        
        // Get label from DOM or fallback
        let label = '';
        if (nodeEl) {
          const labelEl = nodeEl.querySelector('.node-label');
          label = labelEl?.textContent?.trim() || '';
        }
        if (!label && definition) {
          label = definition.label || nodeData.name;
        } else if (!label) {
          label = nodeData.name;
        }
        
        // Draw header text (label only - icons are complex SVGs)
        ctx.fillStyle = '#1E293B';
        ctx.font = `bold ${14 * scale}px Arial, sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + 12 * scale, y + 18 * scale);
        
        // Draw field labels and values from node content
        if (nodeEl && definition && definition.fields) {
          const contentEl = nodeEl.querySelector('.node-body');
          if (contentEl) {
            let fieldY = y + headerHeight + 20 * scale;
            
            definition.fields.slice(0, 2).forEach((fieldDef, idx) => {
              const input = contentEl.querySelector(`[name="${fieldDef.name}"], input:nth-of-type(${idx + 1}), select:nth-of-type(${idx + 1})`);
              
              // Draw field label
              ctx.font = `bold ${10 * scale}px Arial, sans-serif`;
              ctx.fillStyle = '#64748B';
              ctx.fillText(fieldDef.label, x + 12 * scale, fieldY);
              fieldY += 14 * scale;
              
              // Draw field value
              let value = '';
              if (input) {
                if (input.tagName === 'SELECT') {
                  const selectedOption = input.options[input.selectedIndex];
                  value = selectedOption?.text || input.value;
                } else {
                  value = input.value || input.placeholder || '';
                }
              }
              if (value.length > 22) value = value.substring(0, 19) + '...';
              
              ctx.font = `${11 * scale}px Arial, sans-serif`;
              ctx.fillStyle = '#1E293B';
              ctx.fillText(value || '-', x + 12 * scale, fieldY);
              fieldY += 24 * scale;
            });
          }
        }

        // Only draw dots where connections exist
        // Input dots - check if any node connects TO this node's inputs
        const hasInputConnections = {};
        nodeIds.forEach(otherId => {
          const otherNode = nodesData[otherId];
          Object.values(otherNode.outputs).forEach(output => {
            output.connections.forEach(conn => {
              if (conn.node == id) {
                const inputIdx = parseInt(conn.output.replace('input_', '')) - 1;
                hasInputConnections[inputIdx] = true;
              }
            });
          });
        });

        // Draw input dots only where connected
        Object.keys(hasInputConnections).forEach(idx => {
          const i = parseInt(idx);
          const ix = (nodeData.pos_x - 7 - minX) * scale;
          const iy = (nodeData.pos_y + 50 + i * 25 - minY) * scale;
          this._drawConnectionDot(ctx, ix, iy, scale);
        });

        // Output dots - check actual connections from this node
        Object.keys(nodeData.outputs).forEach(outputKey => {
          const output = nodeData.outputs[outputKey];
          if (output.connections.length > 0) {
            const outputIdx = parseInt(outputKey.replace('output_', '')) - 1;
            const ox = (nodeData.pos_x + size.width + 7 - minX) * scale;
            const oy = (nodeData.pos_y + 50 + outputIdx * 25 - minY) * scale;
            this._drawConnectionDot(ctx, ox, oy, scale);
          }
        });
      });

      // Convert to blob and download
      exportCanvas.toBlob((blob) => {
        if (!blob) {
          this._setStatus('Failed to generate image');
          return;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this._setStatus('Image exported successfully');
      }, `image/${format}`);

    } catch (error) {
      console.error('Export failed:', error);
      this._setStatus('Export failed: ' + error.message);
    }
  }

  /**
   * Draw SVG path on canvas
   */
  _drawSVGPath(ctx, d, offsetX, offsetY, scale) {
    // Parse SVG path commands (M, C for bezier curves)
    const commands = d.match(/[MCLQZmclqz][^MCLQZmclqz]*/g);
    if (!commands) return;

    ctx.beginPath();
    
    commands.forEach(cmd => {
      const type = cmd[0];
      const coords = cmd.slice(1).trim().split(/[\s,]+/).map(Number);
      
      switch (type) {
        case 'M': // Move to
          ctx.moveTo((coords[0] - offsetX) * scale, (coords[1] - offsetY) * scale);
          break;
        case 'C': // Cubic bezier
          ctx.bezierCurveTo(
            (coords[0] - offsetX) * scale, (coords[1] - offsetY) * scale,
            (coords[2] - offsetX) * scale, (coords[3] - offsetY) * scale,
            (coords[4] - offsetX) * scale, (coords[5] - offsetY) * scale
          );
          break;
        case 'L': // Line to
          ctx.lineTo((coords[0] - offsetX) * scale, (coords[1] - offsetY) * scale);
          break;
      }
    });
    
    ctx.stroke();
  }

  /**
   * Draw connection dot
   */
  _drawConnectionDot(ctx, x, y, scale) {
    const radius = 7 * scale;
    
    // White fill
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Border
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 2 * scale;
    ctx.stroke();
  }

  /**
   * --------------------------------------------------------------------------
   * PRIVATE: SETUP MINIMAP
   * --------------------------------------------------------------------------
   * 
   * Initializes the minimap navigation component.
   * The minimap shows a scaled-down view of the entire workflow
   * and allows clicking to navigate to different areas.
   * 
   * --------------------------------------------------------------------------
   */
  _setupMinimap() {
    const minimap = this.container.querySelector('.workflow-minimap');
    if (!minimap) return;

    // Hide if disabled
    if (!this.options.minimap) {
      minimap.classList.add('hidden');
      return;
    }

    const minimapContent = minimap.querySelector('.minimap-content');
    const minimapViewport = minimap.querySelector('.minimap-viewport');
    const canvas = this.container.querySelector('#drawflow-canvas');

    // Update minimap on canvas changes
    const updateMinimap = () => {
      if (!this.drawflow) return;

      const drawflowEl = canvas.querySelector('.drawflow');
      if (!drawflowEl) return;

      // Get all nodes
      const nodes = drawflowEl.querySelectorAll('.drawflow-node');
      if (nodes.length === 0) {
        minimapContent.innerHTML = '';
        minimapViewport.style.display = 'none';
        return;
      }

      // Calculate bounds
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodes.forEach(node => {
        const rect = node.getBoundingClientRect();
        const x = parseFloat(node.style.left) || 0;
        const y = parseFloat(node.style.top) || 0;
        const w = rect.width / this.drawflow.zoom;
        const h = rect.height / this.drawflow.zoom;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + w);
        maxY = Math.max(maxY, y + h);
      });

      // Add padding
      const padding = 50;
      minX -= padding;
      minY -= padding;
      maxX += padding;
      maxY += padding;

      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;

      // Scale to fit minimap
      const minimapWidth = minimap.clientWidth;
      const minimapHeight = minimap.clientHeight;
      const scale = Math.min(minimapWidth / contentWidth, minimapHeight / contentHeight, 0.15);

      // Render nodes as small colored blocks
      let html = '';
      nodes.forEach(node => {
        const x = (parseFloat(node.style.left) || 0) - minX;
        const y = (parseFloat(node.style.top) || 0) - minY;
        const rect = node.getBoundingClientRect();
        const w = rect.width / this.drawflow.zoom;
        const h = rect.height / this.drawflow.zoom;
        
        // Get node color from class or default
        const nodeContent = node.querySelector('.workflow-node');
        let color = 'var(--primary)';
        if (nodeContent) {
          const style = getComputedStyle(nodeContent);
          const borderColor = style.borderLeftColor || style.borderColor;
          if (borderColor && borderColor !== 'rgba(0, 0, 0, 0)') {
            color = borderColor;
          }
        }
        
        html += `<div style="
          position: absolute;
          left: ${x * scale}px;
          top: ${y * scale}px;
          width: ${Math.max(w * scale, 4)}px;
          height: ${Math.max(h * scale, 4)}px;
          background: ${color};
          border-radius: 2px;
          opacity: 0.8;
        "></div>`;
      });
      minimapContent.innerHTML = html;

      // Update viewport indicator
      const canvasRect = canvas.getBoundingClientRect();
      const tx = this.drawflow.canvas_x;
      const ty = this.drawflow.canvas_y;
      const zoom = this.drawflow.zoom;

      const viewLeft = (-tx / zoom - minX) * scale;
      const viewTop = (-ty / zoom - minY) * scale;
      const viewWidth = (canvasRect.width / zoom) * scale;
      const viewHeight = (canvasRect.height / zoom) * scale;

      minimapViewport.style.display = 'block';
      minimapViewport.style.left = `${Math.max(0, viewLeft)}px`;
      minimapViewport.style.top = `${Math.max(0, viewTop)}px`;
      minimapViewport.style.width = `${Math.min(viewWidth, minimapWidth)}px`;
      minimapViewport.style.height = `${Math.min(viewHeight, minimapHeight)}px`;

      // Store for click navigation
      minimap._scale = scale;
      minimap._minX = minX;
      minimap._minY = minY;
    };

    // Click to navigate
    minimap.addEventListener('click', (e) => {
      if (!minimap._scale) return;
      
      const rect = minimap.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Convert to canvas coordinates
      const canvasX = clickX / minimap._scale + minimap._minX;
      const canvasY = clickY / minimap._scale + minimap._minY;

      // Center the canvas on clicked position
      const canvasEl = this.container.querySelector('#drawflow-canvas');
      const canvasRect = canvasEl.getBoundingClientRect();
      const centerX = canvasRect.width / 2 / this.drawflow.zoom;
      const centerY = canvasRect.height / 2 / this.drawflow.zoom;

      this.drawflow.canvas_x = -(canvasX - centerX) * this.drawflow.zoom;
      this.drawflow.canvas_y = -(canvasY - centerY) * this.drawflow.zoom;
      this.drawflow.precanvas.style.transform = 
        `translate(${this.drawflow.canvas_x}px, ${this.drawflow.canvas_y}px) scale(${this.drawflow.zoom})`;

      updateMinimap();
    });

    // Update on relevant events
    this.drawflow.on('nodeCreated', updateMinimap);
    this.drawflow.on('nodeRemoved', updateMinimap);
    this.drawflow.on('nodeMoved', updateMinimap);
    this.drawflow.on('zoom', updateMinimap);
    this.drawflow.on('translate', updateMinimap);

    // Initial update
    setTimeout(updateMinimap, 100);
  }

  /**
   * --------------------------------------------------------------------------
   * PRIVATE: SETUP ADVANCED FEATURES
   * --------------------------------------------------------------------------
   * 
   * Initializes advanced features like multi-select, snap-to-grid, and canvas panning.
   * 
   * --------------------------------------------------------------------------
   */
  _setupAdvancedFeatures() {
    const canvas = this.container.querySelector('#drawflow-canvas');
    const canvasContainer = this.container.querySelector('.workflow-canvas-container');
    if (!canvas || !canvasContainer) return;

    // =========================================================================
    // CANVAS PANNING - Works with Space+drag, middle mouse, or left-drag on empty area
    // =========================================================================
    let isSpacePressed = false;
    let isPanning = false;
    let panStartX = 0, panStartY = 0;
    let canvasStartX = 0, canvasStartY = 0;
    
    const onSpaceKeyDown = (e) => {
      if (e.code === 'Space' && !isSpacePressed) {
        const isTyping = document.activeElement.tagName === 'INPUT' || 
                         document.activeElement.tagName === 'TEXTAREA';
        if (isTyping) return;
        
        e.preventDefault();
        isSpacePressed = true;
        canvas.style.cursor = 'grab';
      }
    };
    
    const onSpaceKeyUp = (e) => {
      if (e.code === 'Space') {
        isSpacePressed = false;
        isPanning = false;
        canvas.style.cursor = '';
      }
    };
    
    const startPan = (e) => {
      isPanning = true;
      panStartX = e.clientX;
      panStartY = e.clientY;
      canvasStartX = this.drawflow.canvas_x;
      canvasStartY = this.drawflow.canvas_y;
      canvas.style.cursor = 'grabbing';
    };
    
    const onPanMouseDown = (e) => {
      const nodeEl = e.target.closest('.drawflow-node');
      const isOnConnection = e.target.closest('.connection');
      const isOnInput = e.target.closest('.input');
      const isOnOutput = e.target.closest('.output');
      
      // Pan with spacebar + left click OR middle mouse button (anywhere)
      if ((isSpacePressed && e.button === 0) || e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
        startPan(e);
        return;
      }
      
      // Left-click on empty canvas area (not on node, connection, or ports) - enable pan
      if (e.button === 0 && !nodeEl && !isOnConnection && !isOnInput && !isOnOutput) {
        const isModifierKey = e.shiftKey || e.ctrlKey || e.metaKey;
        // Don't pan if modifier key is pressed (that's for selection box)
        if (!isModifierKey) {
          startPan(e);
        }
      }
    };
    
    const onPanMouseMove = (e) => {
      if (isPanning) {
        e.preventDefault();
        const dx = e.clientX - panStartX;
        const dy = e.clientY - panStartY;
        this.drawflow.canvas_x = canvasStartX + dx;
        this.drawflow.canvas_y = canvasStartY + dy;
        
        // Update the transform
        const precanvas = canvas.querySelector('.drawflow');
        if (precanvas) {
          precanvas.style.transform = `translate(${this.drawflow.canvas_x}px, ${this.drawflow.canvas_y}px) scale(${this.drawflow.zoom})`;
        }
      }
    };
    
    const onPanMouseUp = () => {
      if (isPanning) {
        isPanning = false;
        canvas.style.cursor = isSpacePressed ? 'grab' : '';
      }
    };
    
    document.addEventListener('keydown', onSpaceKeyDown);
    document.addEventListener('keyup', onSpaceKeyUp);
    // Use capture phase so we handle before Drawflow
    canvas.addEventListener('mousedown', onPanMouseDown, true);
    document.addEventListener('mousemove', onPanMouseMove);
    document.addEventListener('mouseup', onPanMouseUp);

    // Selection box for multi-select - now positioned relative to container
    const selectionBox = this.container.querySelector('.selection-box');
    
    // State for drag selection
    let isDragging = false;
    let startX = 0, startY = 0;
    let containerRect = null;
    let dragStartTime = 0;
    
    // Multi-select with Ctrl/Cmd+click or Shift+click on node
    canvas.addEventListener('mousedown', (e) => {
      const nodeEl = e.target.closest('.drawflow-node');
      const isModifierKey = e.shiftKey || e.ctrlKey || e.metaKey;
      
      // Ctrl/Shift+click on node - toggle selection
      if (nodeEl && isModifierKey) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const nodeId = nodeEl.id.replace('node-', '');
        
        if (this.selectedNodes.has(nodeId)) {
          nodeEl.classList.remove('multi-selected');
          this.selectedNodes.delete(nodeId);
        } else {
          nodeEl.classList.add('multi-selected');
          this.selectedNodes.add(nodeId);
        }
        
        this._setStatus(`${this.selectedNodes.size} nodes selected`);
        return;
      }
      
      // Shift/Ctrl+drag on empty area - start selection box
      if (isModifierKey && !nodeEl && e.button === 0) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        isDragging = true;
        dragStartTime = Date.now();
        containerRect = canvasContainer.getBoundingClientRect();
        startX = e.clientX - containerRect.left;
        startY = e.clientY - containerRect.top;
        
        if (selectionBox) {
          selectionBox.style.left = `${startX}px`;
          selectionBox.style.top = `${startY}px`;
          selectionBox.style.width = '0';
          selectionBox.style.height = '0';
          selectionBox.classList.add('active');
        }
        return;
      }
    }, true); // Capture phase to run before Drawflow

    // Clear selection on regular click (no modifier key)
    canvas.addEventListener('click', (e) => {
      const nodeEl = e.target.closest('.drawflow-node');
      const isModifierKey = e.shiftKey || e.ctrlKey || e.metaKey;
      if (!nodeEl && !isModifierKey && this.selectedNodes.size > 0) {
        this.clearSelection();
      }
    });

    // Track mouse movement for selection box
    const onMouseMove = (e) => {
      if (!isDragging || !selectionBox || !containerRect) return;
      
      e.preventDefault();
      
      const currentX = e.clientX - containerRect.left;
      const currentY = e.clientY - containerRect.top;
      
      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);
      
      selectionBox.style.left = `${left}px`;
      selectionBox.style.top = `${top}px`;
      selectionBox.style.width = `${width}px`;
      selectionBox.style.height = `${height}px`;
    };

    // End selection on mouseup
    const onMouseUp = (e) => {
      if (!isDragging) return;
      
      isDragging = false;
      
      if (selectionBox && containerRect) {
        const boxLeft = parseFloat(selectionBox.style.left) || 0;
        const boxTop = parseFloat(selectionBox.style.top) || 0;
        const boxWidth = parseFloat(selectionBox.style.width) || 0;
        const boxHeight = parseFloat(selectionBox.style.height) || 0;
        
        selectionBox.classList.remove('active');
        
        // Only select if box has some size
        if (boxWidth > 10 && boxHeight > 10) {
          const boxScreenRect = {
            left: containerRect.left + boxLeft,
            top: containerRect.top + boxTop,
            right: containerRect.left + boxLeft + boxWidth,
            bottom: containerRect.top + boxTop + boxHeight
          };
          
          const nodeIds = this.getNodesInRect(boxScreenRect);
          
          if (nodeIds.length > 0) {
            this.selectNodes(nodeIds);
          }
        }
      }
      containerRect = null;
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    // Snap to grid on node move
    if (this.drawflow && this.options.snapToGrid) {
      this.snapEnabled = true;
      
      this.drawflow.on('nodeMoved', (nodeId) => {
        if (!this.snapEnabled) return;
        
        const node = this.drawflow.getNodeFromId(nodeId);
        if (node) {
          const snapped = this.snapToGrid(node.pos_x, node.pos_y);
          if (snapped.x !== node.pos_x || snapped.y !== node.pos_y) {
            const nodeEl = this.container.querySelector(`#node-${nodeId}`);
            if (nodeEl) {
              nodeEl.style.left = `${snapped.x}px`;
              nodeEl.style.top = `${snapped.y}px`;
              this.drawflow.drawflow.drawflow.Home.data[nodeId].pos_x = snapped.x;
              this.drawflow.drawflow.drawflow.Home.data[nodeId].pos_y = snapped.y;
              this.drawflow.updateConnectionNodes(`node-${nodeId}`);
            }
          }
        }
      });
    }

    // Update group boxes when nodes move
    this.drawflow.on('nodeMoved', (nodeId) => {
      const groupId = this._getNodeGroupId(nodeId);
      if (groupId !== null) {
        this._updateGroupBox(groupId);
      }
    });

    // Clean up groups when nodes are removed
    this.drawflow.on('nodeRemoved', (nodeId) => {
      const groupId = this._getNodeGroupId(nodeId);
      if (groupId !== null) {
        this._removeNodeFromGroup(nodeId, groupId);
      }
    });

    // Initialize animated edges if enabled
    if (this.options.animatedEdges) {
      this.animateEnabled = true;
      canvas.classList.add('animated-edges');
      const btn = this.container.querySelector('[data-action="toggle-animate"]');
      if (btn) btn.classList.add('active');
    }

    // Initialize minimap visibility
    if (this.options.minimap) {
      this.minimapVisible = true;
      const btn = this.container.querySelector('[data-action="toggle-minimap"]');
      if (btn) btn.classList.add('active');
    }

    // Delete key for multi-selected nodes
    document.addEventListener('keydown', (e) => {
      if (!this.container.contains(document.activeElement) && 
          document.activeElement.tagName !== 'INPUT' && 
          document.activeElement.tagName !== 'TEXTAREA') {
        
        if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedNodes.size > 0) {
          e.preventDefault();
          this.deleteSelected();
        }
      }
    });
  }

  /**
   * --------------------------------------------------------------------------
   * PUBLIC: SET NODE COLOR
   * --------------------------------------------------------------------------
   * 
   * Changes the color of a specific node.
   * 
   * @param {string|number} nodeId - ID of the node to color
   * @param {string} color - Hex color value
   * 
   * --------------------------------------------------------------------------
   */
  setNodeColor(nodeId, color) {
    const nodeElement = this.container.querySelector(`#node-${nodeId}`);
    if (!nodeElement) {
      console.warn('[VizFlow] setNodeColor: Node element not found:', nodeId);
      return;
    }
    
    // Apply color to the node visually
    nodeElement.style.setProperty('--node-color', color);
    nodeElement.classList.add('custom-color');
    
    // Store color in Drawflow's internal data structure directly
    // Note: getNodeFromId returns a copy, so we must modify the source
    try {
      const internalData = this.drawflow.drawflow.drawflow.Home.data[nodeId];
      if (internalData) {
        internalData.data._nodeColor = color;
      }
    } catch (e) {
      // Silently fail - color will still be applied visually
    }
    
    this._saveToHistory();
    this._triggerChange();
    this._setStatus(`Node color changed`);
    
    return this;
  }

  /**
   * --------------------------------------------------------------------------
   * PUBLIC: SET CONNECTION COLOR
   * --------------------------------------------------------------------------
   * 
   * Changes the color of a connection between two nodes.
   * 
   * @param {string|number} fromNodeId - Source node ID
   * @param {string|number} toNodeId - Target node ID
   * @param {string} color - Hex color value
   * @param {string} [outputClass='output_1'] - Output class name
   * @param {string} [inputClass='input_1'] - Input class name
   * @returns {WorkflowBuilder} - Returns self for chaining
   * 
   * --------------------------------------------------------------------------
   */
  setConnectionColor(fromNodeId, toNodeId, color, outputClass = 'output_1', inputClass = 'input_1') {
    const selector = `.connection.node_out_node-${fromNodeId}.node_in_node-${toNodeId}.${outputClass}.${inputClass}`;
    const connection = this.container.querySelector(selector);
    
    if (!connection) {
      console.warn('[FlowKit] setConnectionColor: Connection not found');
      return this;
    }
    
    const path = connection.querySelector('.main-path');
    if (path) {
      path.style.stroke = color;
      connection.dataset.customColor = color;
    }
    
    this._saveToHistory();
    this._triggerChange();
    this._setStatus('Connection color changed');
    
    return this;
  }

  /**
   * --------------------------------------------------------------------------
   * PUBLIC: SET DEFAULT CONNECTION COLOR
   * --------------------------------------------------------------------------
   * 
   * Sets the default color for all new connections.
   * 
   * @param {string} color - Hex color value
   * @returns {WorkflowBuilder} - Returns self for chaining
   * 
   * --------------------------------------------------------------------------
   */
  setDefaultConnectionColor(color) {
    this.defaultConnectionColor = color;
    
    // Update CSS variable
    const canvas = this.container.querySelector('#drawflow-canvas');
    if (canvas) {
      canvas.style.setProperty('--connection-color', color);
    }
    
    // Update existing connections (except condition connections)
    const connections = this.container.querySelectorAll('.drawflow .connection:not(.condition-true):not(.condition-false)');
    connections.forEach(conn => {
      const path = conn.querySelector('.main-path');
      if (path && !conn.dataset.customColor) {
        path.style.stroke = color;
      }
    });
    
    // Update arrow markers
    const arrowhead = this.container.querySelector('#arrowhead polygon');
    const arrowheadHover = this.container.querySelector('#arrowhead-hover polygon');
    if (arrowhead) arrowhead.setAttribute('fill', color);
    if (arrowheadHover) arrowheadHover.setAttribute('fill', color);
    
    this._setStatus('Default connection color changed');
    return this;
  }

  /**
   * --------------------------------------------------------------------------
   * PUBLIC: SET CONDITION COLORS
   * --------------------------------------------------------------------------
   * 
   * Sets the colors for condition node branches.
   * 
   * @param {string} trueColor - Hex color for true/success branch (output_1)
   * @param {string} falseColor - Hex color for false/error branch (output_2)
   * @returns {WorkflowBuilder} - Returns self for chaining
   * 
   * --------------------------------------------------------------------------
   */
  setConditionColors(trueColor, falseColor) {
    this.conditionTrueColor = trueColor;
    this.conditionFalseColor = falseColor;
    
    // Update existing condition connections
    const trueConnections = this.container.querySelectorAll('.drawflow .connection.condition-true');
    const falseConnections = this.container.querySelectorAll('.drawflow .connection.condition-false');
    
    trueConnections.forEach(conn => {
      const path = conn.querySelector('.main-path');
      if (path) path.style.stroke = trueColor;
    });
    
    falseConnections.forEach(conn => {
      const path = conn.querySelector('.main-path');
      if (path) path.style.stroke = falseColor;
    });
    
    // Update condition node output dots
    const conditionNodes = this.container.querySelectorAll('.drawflow-node[data-type="condition"], .drawflow-node[data-type="if"], .drawflow-node[data-type="decision"]');
    conditionNodes.forEach(node => {
      const outputs = node.querySelectorAll('.output');
      if (outputs[0]) outputs[0].style.borderColor = trueColor;
      if (outputs[1]) outputs[1].style.borderColor = falseColor;
    });
    
    this._setStatus('Condition colors updated');
    return this;
  }

  /**
   * --------------------------------------------------------------------------
   * PUBLIC: GROUP SELECTED NODES
   * --------------------------------------------------------------------------
   * 
   * Groups the currently selected nodes together.
   * 
   * @returns {number|null} Group ID or null if grouping failed
   * 
   * --------------------------------------------------------------------------
   */
  groupSelected() {
    // Get all selected node IDs
    const nodeIds = new Set();
    
    // Add multi-selected nodes
    this.selectedNodes.forEach(id => nodeIds.add(String(id)));
    
    // Add single selected node if any
    const selectedNode = this.container.querySelector('.drawflow-node.selected');
    if (selectedNode) {
      nodeIds.add(selectedNode.id.replace('node-', ''));
    }
    
    if (nodeIds.size < 2) {
      this._setStatus('Select at least 2 nodes to group');
      return null;
    }
    
    // Check if any node is already in a group - remove from old group first
    nodeIds.forEach(nodeId => {
      const existingGroupId = this._getNodeGroupId(nodeId);
      if (existingGroupId !== null) {
        this._removeNodeFromGroup(nodeId, existingGroupId);
      }
    });
    
    // Calculate center position for group
    const bounds = this._calculateBoundsForNodes(nodeIds);
    
    // Create new group - find next available number
    const groupId = this._getNextAvailableGroupNumber();
    const groupColor = this._getGroupColor(groupId);
    
    this.groups.set(groupId, {
      nodeIds: nodeIds,
      label: `Group ${groupId}`,
      color: groupColor,
      collapsed: false,
      centerX: bounds.centerX,
      centerY: bounds.centerY
    });
    
    // Create visual group box
    this._createGroupBox(groupId);
    
    // Mark nodes as grouped
    nodeIds.forEach(nodeId => {
      const nodeEl = this.container.querySelector(`#node-${nodeId}`);
      if (nodeEl) {
        nodeEl.dataset.groupId = groupId;
        nodeEl.classList.add('grouped');
      }
    });
    
    // Clear all selection
    this.clearSelection();
    
    this._saveToHistory();
    this._triggerChange();
    this._setStatus(`Created group with ${nodeIds.size} nodes`);
    
    return groupId;
  }

  /**
   * Calculate bounding box for a set of node IDs
   */
  _calculateBoundsForNodes(nodeIds) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    nodeIds.forEach(nodeId => {
      const nodeEl = this.container.querySelector(`#node-${nodeId}`);
      if (nodeEl) {
        const nodeData = this.drawflow.getNodeFromId(nodeId);
        if (nodeData) {
          minX = Math.min(minX, nodeData.pos_x);
          minY = Math.min(minY, nodeData.pos_y);
          maxX = Math.max(maxX, nodeData.pos_x + nodeEl.offsetWidth);
          maxY = Math.max(maxY, nodeData.pos_y + nodeEl.offsetHeight);
        }
      }
    });
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    };
  }

  /**
   * Ungroup selected nodes or a specific group
   */
  ungroupSelected() {
    const groupIds = new Set();
    
    // Check for collapsed group node
    const collapsedNode = this.container.querySelector('.drawflow-node.selected .collapsed-group-node');
    if (collapsedNode) {
      const groupId = parseInt(collapsedNode.dataset.groupId);
      if (!isNaN(groupId)) groupIds.add(groupId);
    }
    
    // Find groups from multi-selected nodes
    this.selectedNodes.forEach(nodeId => {
      const groupId = this._getNodeGroupId(nodeId);
      if (groupId !== null) groupIds.add(groupId);
    });
    
    // Check single selected node
    const selectedNode = this.container.querySelector('.drawflow-node.selected');
    if (selectedNode && !collapsedNode) {
      const groupId = this._getNodeGroupId(selectedNode.id.replace('node-', ''));
      if (groupId !== null) groupIds.add(groupId);
    }
    
    if (groupIds.size === 0) {
      this._setStatus('No grouped nodes selected');
      return;
    }
    
    // Ungroup all found groups
    groupIds.forEach(groupId => this._dissolveGroup(groupId));
    
    // Clear selection after ungrouping
    this.clearSelection();
    
    this._saveToHistory();
    this._triggerChange();
    this._setStatus(`Ungrouped ${groupIds.size} group(s)`);
  }

  /**
   * Collapse the group of the selected node
   */
  collapseSelectedGroup() {
    const groupIds = new Set();
    
    // Find groups from multi-selected nodes
    this.selectedNodes.forEach(nodeId => {
      const groupId = this._getNodeGroupId(nodeId);
      if (groupId !== null) {
        const group = this.groups.get(groupId);
        if (group && !group.collapsed) {
          groupIds.add(groupId);
        }
      }
    });
    
    // Check single selected node
    const selectedNode = this.container.querySelector('.drawflow-node.selected');
    if (selectedNode) {
      const groupId = this._getNodeGroupId(selectedNode.id.replace('node-', ''));
      if (groupId !== null) {
        const group = this.groups.get(groupId);
        if (group && !group.collapsed) {
          groupIds.add(groupId);
        }
      }
    }
    
    if (groupIds.size === 0) {
      this._setStatus('No expandable group selected');
      return;
    }
    
    groupIds.forEach(groupId => this._collapseGroup(groupId));
  }

  /**
   * Toggle Group: Groups selected nodes OR ungroups if already grouped
   */
  toggleGroup() {
    // Check if any selected node is in a group
    const hasGroupedNodes = this._selectionHasGroupedNodes();
    
    if (hasGroupedNodes) {
      // Ungroup
      this.ungroupSelected();
    } else {
      // Group
      this.groupSelected();
    }
  }

  /**
   * Toggle collapse state of a group
   */
  toggleGroupCollapse(groupId) {
    const group = this.groups.get(groupId);
    if (!group) return;
    
    if (group.collapsed) {
      this._expandGroup(groupId);
    } else {
      this._collapseGroup(groupId);
    }
  }

  /**
   * Check if current selection has grouped nodes
   */
  _selectionHasGroupedNodes() {
    // Check multi-selected nodes
    for (const nodeId of this.selectedNodes) {
      if (this._getNodeGroupId(nodeId) !== null) return true;
    }
    
    // Check single selected node
    const selectedNode = this.container.querySelector('.drawflow-node.selected');
    if (selectedNode) {
      const nodeId = selectedNode.id.replace('node-', '');
      if (this._getNodeGroupId(nodeId) !== null) return true;
    }
    
    return false;
  }

  /**
   * Check if current selection has a collapsible (not-collapsed) group
   */
  _selectionHasCollapsibleGroup() {
    // Check multi-selected nodes
    for (const nodeId of this.selectedNodes) {
      const groupId = this._getNodeGroupId(nodeId);
      if (groupId !== null) {
        const group = this.groups.get(groupId);
        if (group && !group.collapsed) return true;
      }
    }
    
    // Check single selected node
    const selectedNode = this.container.querySelector('.drawflow-node.selected');
    if (selectedNode) {
      const nodeId = selectedNode.id.replace('node-', '');
      const groupId = this._getNodeGroupId(nodeId);
      if (groupId !== null) {
        const group = this.groups.get(groupId);
        if (group && !group.collapsed) return true;
      }
    }
    
    return false;
  }

  /**
   * Get the group ID for a node
   */
  _getNodeGroupId(nodeId) {
    for (const [groupId, group] of this.groups) {
      if (group.nodeIds.has(nodeId) || group.nodeIds.has(String(nodeId))) {
        return groupId;
      }
    }
    return null;
  }

  /**
   * Remove a node from a group
   */
  _removeNodeFromGroup(nodeId, groupId) {
    const group = this.groups.get(groupId);
    if (!group) return;
    
    group.nodeIds.delete(nodeId);
    group.nodeIds.delete(String(nodeId));
    
    const nodeEl = this.container.querySelector(`#node-${nodeId}`);
    if (nodeEl) {
      delete nodeEl.dataset.groupId;
      nodeEl.classList.remove('grouped');
    }
    
    // If group is empty or has only one node, dissolve it
    if (group.nodeIds.size < 2) {
      this._dissolveGroup(groupId);
    } else {
      this._updateGroupBox(groupId);
    }
  }

  /**
   * Dissolve a group completely
   */
  _dissolveGroup(groupId) {
    const group = this.groups.get(groupId);
    if (!group) return;
    
    // If collapsed, expand first
    if (group.collapsed) {
      this._expandGroup(groupId);
    }
    
    // Remove grouped class from all nodes
    group.nodeIds.forEach(nodeId => {
      const nodeEl = this.container.querySelector(`#node-${nodeId}`);
      if (nodeEl) {
        delete nodeEl.dataset.groupId;
        nodeEl.classList.remove('grouped');
      }
    });
    
    // Remove group box
    const groupBox = this.container.querySelector(`.group-box[data-group-id="${groupId}"]`);
    if (groupBox) {
      groupBox.remove();
    }
    
    this.groups.delete(groupId);
  }

  /**
   * Get the group ID that owns a collapsed node (by collapsed node ID)
   */
  _getGroupByCollapsedNodeId(nodeId) {
    const nodeIdInt = parseInt(nodeId);
    for (const [groupId, collapsedNodeId] of this.collapsedGroupNodes) {
      if (collapsedNodeId === nodeIdInt) {
        return groupId;
      }
    }
    return null;
  }

  /**
   * Find original node connections from a collapsed group's saved data
   * Returns the original node IDs that connect to/from a given node
   */
  _getOriginalNodesFromCollapsedGroup(collapsedGroupId, direction, externalNodeId) {
    const group = this.groups.get(collapsedGroupId);
    if (!group || !group.savedConnections) return [];
    
    const externalIdStr = String(externalNodeId);
    const originalNodes = [];
    
    group.savedConnections.forEach(conn => {
      if (direction === 'output' && conn.type === 'output') {
        // Looking for original nodes that OUTPUT TO externalNodeId
        if (conn.toNode === externalIdStr) {
          originalNodes.push({
            nodeId: conn.fromNode,
            output: conn.fromOutput,
            input: conn.toInput
          });
        }
      } else if (direction === 'input' && conn.type === 'input') {
        // Looking for original nodes that receive INPUT FROM externalNodeId  
        if (conn.fromNode === externalIdStr) {
          originalNodes.push({
            nodeId: conn.toNode,
            input: conn.toInput,
            output: conn.fromOutput
          });
        }
      }
    });
    return originalNodes;
  }

  /**
   * Collapse a group into a single node
   */
  _collapseGroup(groupId) {
    const group = this.groups.get(groupId);
    if (!group || group.collapsed) return;
    
    // Get group bounds for positioning the collapsed node
    const bounds = this._getGroupBounds(groupId);
    if (!bounds) return;
    
    const groupNodeIds = new Set(Array.from(group.nodeIds).map(id => String(id)));
    
    // STEP 1: Collect all connections to save (ALWAYS use original node IDs)
    const allConnections = [];
    
    group.nodeIds.forEach(nodeId => {
      const nodeIdStr = String(nodeId);
      const nodeData = this.drawflow.getNodeFromId(nodeId);
      if (!nodeData) return;
      
      // Check outputs (connections FROM this node)
      Object.entries(nodeData.outputs || {}).forEach(([outputKey, output]) => {
        output.connections.forEach(conn => {
          const targetId = String(conn.node);
          const targetInput = conn.output;
          const isInternal = groupNodeIds.has(targetId);
          
          // Check if target is a collapsed group placeholder
          const targetCollapsedGroupId = this._getGroupByCollapsedNodeId(targetId);
          if (targetCollapsedGroupId !== null) {
            // Resolve to original target nodes
            const originals = this._getOriginalNodesFromCollapsedGroup(targetCollapsedGroupId, 'input', nodeIdStr);
            if (originals.length > 0) {
              originals.forEach(orig => {
                allConnections.push({
                  type: 'output',
                  fromNode: nodeIdStr,
                  fromOutput: outputKey,
                  toNode: orig.nodeId,
                  toInput: orig.input
                });
              });
            } else {
              // Fallback: save connection to first node in that group's saved output connections
              const targetGroup = this.groups.get(targetCollapsedGroupId);
              if (targetGroup && targetGroup.savedConnections) {
                const inputConns = targetGroup.savedConnections.filter(c => c.type === 'input');
                if (inputConns.length > 0) {
                  allConnections.push({
                    type: 'output',
                    fromNode: nodeIdStr,
                    fromOutput: outputKey,
                    toNode: inputConns[0].toNode,
                    toInput: inputConns[0].toInput
                  });
                }
              }
            }
            return;
          }
          
          allConnections.push({
            type: isInternal ? 'internal' : 'output',
            fromNode: nodeIdStr,
            fromOutput: outputKey,
            toNode: targetId,
            toInput: targetInput
          });
        });
      });
      
      // Check inputs (connections TO this node)
      Object.entries(nodeData.inputs || {}).forEach(([inputKey, input]) => {
        input.connections.forEach(conn => {
          const sourceId = String(conn.node);
          const sourceOutput = conn.input;
          
          // Skip internal connections (already captured via outputs)
          if (groupNodeIds.has(sourceId)) return;
          
          // Check if source is a collapsed group placeholder
          const sourceCollapsedGroupId = this._getGroupByCollapsedNodeId(sourceId);
          if (sourceCollapsedGroupId !== null) {
            // Resolve to original source nodes
            const originals = this._getOriginalNodesFromCollapsedGroup(sourceCollapsedGroupId, 'output', nodeIdStr);
            if (originals.length > 0) {
              originals.forEach(orig => {
                allConnections.push({
                  type: 'input',
                  fromNode: orig.nodeId,
                  fromOutput: orig.output,
                  toNode: nodeIdStr,
                  toInput: inputKey
                });
              });
            } else {
              // Fallback: save connection from first output node in that group
              const sourceGroup = this.groups.get(sourceCollapsedGroupId);
              if (sourceGroup && sourceGroup.savedConnections) {
                const outputConns = sourceGroup.savedConnections.filter(c => c.type === 'output');
                if (outputConns.length > 0) {
                  allConnections.push({
                    type: 'input',
                    fromNode: outputConns[0].fromNode,
                    fromOutput: outputConns[0].fromOutput,
                    toNode: nodeIdStr,
                    toInput: inputKey
                  });
                }
              }
            }
            return;
          }
          
          allConnections.push({
            type: 'input',
            fromNode: sourceId,
            fromOutput: sourceOutput,
            toNode: nodeIdStr,
            toInput: inputKey
          });
        });
      });
    });
    
    // Save connections (deep copy)
    group.savedConnections = JSON.parse(JSON.stringify(allConnections));
    group.collapsed = true;
    
    // Calculate position for collapsed node
    const centerX = bounds.x + bounds.width / 2 - 75;
    const centerY = bounds.y + bounds.height / 2 - 30;
    
    // STEP 2: Collect ALL current connections to remove (don't remove during iteration)
    const connectionsToRemove = [];
    
    group.nodeIds.forEach(nodeId => {
      const nodeData = this.drawflow.getNodeFromId(nodeId);
      if (!nodeData) return;
      
      Object.entries(nodeData.outputs || {}).forEach(([outputKey, output]) => {
        output.connections.forEach(conn => {
          connectionsToRemove.push({
            from: parseInt(nodeId),
            to: parseInt(conn.node),
            output: outputKey,
            input: conn.output
          });
        });
      });
      
      Object.entries(nodeData.inputs || {}).forEach(([inputKey, input]) => {
        input.connections.forEach(conn => {
          connectionsToRemove.push({
            from: parseInt(conn.node),
            to: parseInt(nodeId),
            output: conn.input,
            input: inputKey
          });
        });
      });
    });
    
    // Remove connections (now safe to iterate)
    connectionsToRemove.forEach(conn => {
      try {
        this.drawflow.removeSingleConnection(conn.from, conn.to, conn.output, conn.input);
      } catch (e) {}
    });
    
    // STEP 3: Hide group box and nodes
    const groupBox = this.container.querySelector(`.group-box[data-group-id="${groupId}"]`);
    if (groupBox) {
      groupBox.style.display = 'none';
    }
    
    group.nodeIds.forEach(nodeId => {
      const nodeEl = this.container.querySelector(`#node-${nodeId}`);
      if (nodeEl) {
        nodeEl.style.display = 'none';
      }
    });
    
    // STEP 4: Create collapsed placeholder node
    const collapsedNodeId = this._createCollapsedNode(groupId, group.label, centerX, centerY, group.color);
    this.collapsedGroupNodes.set(groupId, collapsedNodeId);
    
    // STEP 5: Create connections to/from the collapsed node
    const externalInputs = allConnections.filter(c => c.type === 'input');
    const externalOutputs = allConnections.filter(c => c.type === 'output');
    
    const createdConnections = new Set();
    
    // Input connections (from outside -> collapsed node)
    externalInputs.forEach(conn => {
      let sourceNodeId = parseInt(conn.fromNode);
      let sourceOutput = conn.fromOutput;
      
      // If source is in another collapsed group, use that collapsed node
      const sourceCollapsedGroupId = this._getCollapsedGroupForNode(conn.fromNode);
      if (sourceCollapsedGroupId !== null && sourceCollapsedGroupId !== groupId) {
        const collNode = this.collapsedGroupNodes.get(sourceCollapsedGroupId);
        if (collNode) {
          sourceNodeId = collNode;
          sourceOutput = 'output_1';
        }
      }
      
      const connKey = `${sourceNodeId}-${collapsedNodeId}-${sourceOutput}-input_1`;
      if (!createdConnections.has(connKey) && sourceNodeId) {
        try {
          this.drawflow.addConnection(sourceNodeId, collapsedNodeId, sourceOutput, 'input_1');
          createdConnections.add(connKey);
        } catch (e) {}
      }
    });
    
    // Output connections (collapsed node -> outside)
    externalOutputs.forEach(conn => {
      let targetNodeId = parseInt(conn.toNode);
      let targetInput = conn.toInput;
      
      // If target is in another collapsed group, use that collapsed node
      const targetCollapsedGroupId = this._getCollapsedGroupForNode(conn.toNode);
      if (targetCollapsedGroupId !== null && targetCollapsedGroupId !== groupId) {
        const collNode = this.collapsedGroupNodes.get(targetCollapsedGroupId);
        if (collNode) {
          targetNodeId = collNode;
          targetInput = 'input_1';
        }
      }
      
      const connKey = `${collapsedNodeId}-${targetNodeId}-output_1-${targetInput}`;
      if (!createdConnections.has(connKey) && targetNodeId) {
        try {
          this.drawflow.addConnection(collapsedNodeId, targetNodeId, 'output_1', targetInput);
          createdConnections.add(connKey);
        } catch (e) {}
      }
    });
    
    this._saveToHistory();
    this._triggerChange();
    this._setStatus(`Collapsed ${group.label}`);
  }

  /**
   * Create a collapsed placeholder node
   */
  _createCollapsedNode(groupId, label, x, y, color) {
    const group = this.groups.get(groupId);
    const nodeCount = group ? group.nodeIds.size : 0;
    
    const html = `
      <div class="collapsed-group-content" style="border-left: 4px solid ${color};">
        <div class="collapsed-group-icon">G</div>
        <div class="collapsed-group-info">
          <div class="collapsed-group-label">${label}</div>
          <div class="collapsed-group-count">${nodeCount} nodes</div>
        </div>
        <button class="collapsed-group-expand" title="Expand">+</button>
      </div>
    `;
    
    // Create node with 1 input and 1 output
    const nodeId = this.drawflow.addNode(
      'collapsed-group',
      1, 1,  // inputs, outputs
      x, y,
      'collapsed-group-node',
      { groupId: groupId },
      html
    );
    
    // Add expand button event
    setTimeout(() => {
      const nodeEl = this.container.querySelector(`#node-${nodeId}`);
      if (nodeEl) {
        nodeEl.dataset.collapsedGroupId = groupId;
        const expandBtn = nodeEl.querySelector('.collapsed-group-expand');
        if (expandBtn) {
          expandBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._expandGroup(groupId);
          });
        }
      }
    }, 0);
    
    return nodeId;
  }

  /**
   * Expand a collapsed group back to its original nodes
   */
  _expandGroup(groupId) {
    const group = this.groups.get(groupId);
    if (!group || !group.collapsed) return;
    
    const collapsedNodeId = this.collapsedGroupNodes.get(groupId);
    
    // First, update state so _getCollapsedGroupForNode doesn't include this group
    group.collapsed = false;
    this.collapsedGroupNodes.delete(groupId);
    
    // Remove the collapsed node (this also removes its connections)
    if (collapsedNodeId) {
      try {
        this.drawflow.removeNodeId(`node-${collapsedNodeId}`);
      } catch (e) {
        console.warn('Could not remove collapsed node:', e);
      }
    }
    
    // Show all nodes in the group
    group.nodeIds.forEach(nodeId => {
      const nodeEl = this.container.querySelector(`#node-${nodeId}`);
      if (nodeEl) {
        nodeEl.style.display = '';
      }
    });
    
    // Track restored connections to avoid duplicates
    const restoredConnections = new Set();
    
    // Restore ALL saved connections
    if (group.savedConnections && group.savedConnections.length > 0) {
      group.savedConnections.forEach(conn => {
        try {
          let fromNode = parseInt(conn.fromNode);
          let toNode = parseInt(conn.toNode);
          let fromOutput = conn.fromOutput;
          let toInput = conn.toInput;
          
          // Check if fromNode is in a DIFFERENT collapsed group
          const fromCollapsedGroupId = this._getCollapsedGroupForNode(conn.fromNode);
          if (fromCollapsedGroupId !== null && fromCollapsedGroupId !== groupId) {
            const collNodeId = this.collapsedGroupNodes.get(fromCollapsedGroupId);
            if (collNodeId) {
              fromNode = collNodeId;
              fromOutput = 'output_1';
            }
          }
          
          // Check if toNode is in a DIFFERENT collapsed group
          const toCollapsedGroupId = this._getCollapsedGroupForNode(conn.toNode);
          if (toCollapsedGroupId !== null && toCollapsedGroupId !== groupId) {
            const collNodeId = this.collapsedGroupNodes.get(toCollapsedGroupId);
            if (collNodeId) {
              toNode = collNodeId;
              toInput = 'input_1';
            }
          }
          
          // Create unique key to avoid duplicate connections
          const connKey = `${fromNode}-${toNode}-${fromOutput}-${toInput}`;
          if (!restoredConnections.has(connKey) && fromNode && toNode) {
            this.drawflow.addConnection(fromNode, toNode, fromOutput, toInput);
            restoredConnections.add(connKey);
          }
        } catch (e) {
          console.warn('Could not restore connection:', conn, e);
        }
      });
    }
    
    // Show the group box again
    const groupBox = this.container.querySelector(`.group-box[data-group-id="${groupId}"]`);
    if (groupBox) {
      groupBox.style.display = '';
    }
    
    // Clear saved connections
    group.savedConnections = null;
    
    // Update group box position
    this._updateGroupBox(groupId);
    
    this._saveToHistory();
    this._triggerChange();
    this._setStatus(`Expanded ${group.label}`);
  }
  
  /**
   * Check if a node ID belongs to a currently collapsed group
   * Returns the groupId if collapsed, null otherwise
   */
  _getCollapsedGroupForNode(nodeId) {
    const nodeIdStr = String(nodeId);
    for (const [groupId, group] of this.groups) {
      if (group.collapsed) {
        if (group.nodeIds.has(nodeIdStr)) {
          return groupId;
        }
        // Also check with original type
        for (const id of group.nodeIds) {
          if (String(id) === nodeIdStr) {
            return groupId;
          }
        }
      }
    }
    return null;
  }

  /**
   * Hide all connections to/from a node
   */
  _hideNodeConnections(nodeId) {
    // Find all connections involving this node
    const connections = this.container.querySelectorAll(`.connection.node_in_node-${nodeId}, .connection.node_out_node-${nodeId}`);
    connections.forEach(conn => {
      conn.style.display = 'none';
    });
  }

  /**
   * Show all connections to/from a node
   */
  _showNodeConnections(nodeId) {
    // Find all connections involving this node
    const connections = this.container.querySelectorAll(`.connection.node_in_node-${nodeId}, .connection.node_out_node-${nodeId}`);
    connections.forEach(conn => {
      conn.style.display = '';
    });
  }

  /**
   * Hide ALL connections involving any node in the group
   */
  _hideGroupConnections(groupId) {
    const group = this.groups.get(groupId);
    if (!group) return;
    
    // Get all connections
    const allConnections = this.container.querySelectorAll('.connection');
    
    allConnections.forEach(conn => {
      const classList = conn.getAttribute('class') || '';
      
      // Extract node IDs from class names
      const inMatch = classList.match(/node_in_node-(\d+)/);
      const outMatch = classList.match(/node_out_node-(\d+)/);
      
      if (inMatch && outMatch) {
        const inNodeId = inMatch[1];
        const outNodeId = outMatch[1];
        
        // Hide if EITHER node is in this group
        if (group.nodeIds.has(inNodeId) || group.nodeIds.has(outNodeId)) {
          conn.style.display = 'none';
        }
      }
    });
  }

  /**
   * Show ALL connections involving any node in the group
   */
  _showGroupConnections(groupId) {
    const group = this.groups.get(groupId);
    if (!group) return;
    
    // Get all connections
    const allConnections = this.container.querySelectorAll('.connection');
    
    allConnections.forEach(conn => {
      const classList = conn.getAttribute('class') || '';
      
      // Extract node IDs from class names
      const inMatch = classList.match(/node_in_node-(\d+)/);
      const outMatch = classList.match(/node_out_node-(\d+)/);
      
      if (inMatch && outMatch) {
        const inNodeId = inMatch[1];
        const outNodeId = outMatch[1];
        
        // Show if either node is in this group
        if (group.nodeIds.has(inNodeId) || group.nodeIds.has(outNodeId)) {
          conn.style.display = '';
        }
      }
    });
  }

  /**
   * Find the position of the entry node in a group (node with external inputs)
   */
  _findGroupEntryNodePosition(groupId) {
    const group = this.groups.get(groupId);
    if (!group) return null;
    
    // Get all connections to find which grouped node has external inputs
    const allConnections = this.container.querySelectorAll('.connection');
    let entryNodeId = null;
    
    allConnections.forEach(conn => {
      if (entryNodeId) return; // Already found
      
      const classList = conn.getAttribute('class') || '';
      const inMatch = classList.match(/node_in_node-(\d+)/);
      const outMatch = classList.match(/node_out_node-(\d+)/);
      
      if (inMatch && outMatch) {
        const inNodeId = inMatch[1];
        const outNodeId = outMatch[1];
        
        // Check if this is an external connection INTO the group
        // (source node is outside group, target node is inside group)
        if (group.nodeIds.has(inNodeId) && !group.nodeIds.has(outNodeId)) {
          entryNodeId = inNodeId;
        }
      }
    });
    
    // If found an entry node, get its position
    if (entryNodeId) {
      const nodeData = this.drawflow.getNodeFromId(entryNodeId);
      if (nodeData) {
        return { x: nodeData.pos_x, y: nodeData.pos_y };
      }
    }
    
    // Fallback: use the leftmost node in the group
    let leftmostX = Infinity;
    let leftmostY = 0;
    
    group.nodeIds.forEach(nodeId => {
      const nodeData = this.drawflow.getNodeFromId(nodeId);
      if (nodeData && nodeData.pos_x < leftmostX) {
        leftmostX = nodeData.pos_x;
        leftmostY = nodeData.pos_y;
      }
    });
    
    if (leftmostX !== Infinity) {
      return { x: leftmostX, y: leftmostY };
    }
    
    return null;
  }

  /**
   * Create visual group box
   */
  _createGroupBox(groupId) {
    const group = this.groups.get(groupId);
    if (!group) {
      console.warn('[VizFlow] Group not found:', groupId);
      return;
    }
    
    // Find the Drawflow canvas element - it has class 'drawflow'
    // Try multiple selectors for compatibility
    let canvas = this.container.querySelector('#drawflow-canvas .drawflow');
    if (!canvas) {
      canvas = this.container.querySelector('.drawflow');
    }
    if (!canvas) {
      canvas = this.container.querySelector('#drawflow-canvas');
    }
    if (!canvas) {
      console.warn('[VizFlow] Canvas not found for group box');
      return;
    }
    
    // Calculate bounding box
    const bounds = this._getGroupBounds(groupId);
    if (!bounds) {
      console.warn('[VizFlow] Could not calculate group bounds');
      return;
    }
    
    // Create group box element
    const groupBox = document.createElement('div');
    groupBox.className = 'group-box';
    groupBox.dataset.groupId = groupId;
    groupBox.innerHTML = `
      <div class="group-header">
        <input type="text" class="group-label" value="${group.label}" placeholder="Group name">
        <button class="group-collapse-btn" title="Collapse group">−</button>
        <button class="group-ungroup-btn" title="Ungroup">×</button>
      </div>
    `;
    
    // Position and style
    groupBox.style.left = `${bounds.x - 15}px`;
    groupBox.style.top = `${bounds.y - 35}px`;
    groupBox.style.width = `${bounds.width + 30}px`;
    groupBox.style.height = `${bounds.height + 50}px`;
    groupBox.style.borderColor = group.color;
    groupBox.style.setProperty('--group-color', group.color);
    
    canvas.appendChild(groupBox);
    
    // Setup events
    const labelInput = groupBox.querySelector('.group-label');
    labelInput.addEventListener('input', (e) => {
      group.label = e.target.value;
      this._triggerChange();
    });
    labelInput.addEventListener('mousedown', (e) => e.stopPropagation());
    
    // Collapse button
    const collapseBtn = groupBox.querySelector('.group-collapse-btn');
    collapseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._collapseGroup(groupId);
    });
    
    const ungroupBtn = groupBox.querySelector('.group-ungroup-btn');
    ungroupBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._dissolveGroup(groupId);
      this._saveToHistory();
      this._triggerChange();
      this._setStatus('Group removed');
    });
    
    // Allow dragging group box to move all nodes
    this._setupGroupDrag(groupId, groupBox);
  }

  /**
   * Update group box position and size
   */
  _updateGroupBox(groupId) {
    const groupBox = this.container.querySelector(`.group-box[data-group-id="${groupId}"]`);
    if (!groupBox) return;
    
    const bounds = this._getGroupBounds(groupId);
    if (!bounds) {
      groupBox.remove();
      return;
    }
    
    groupBox.style.left = `${bounds.x - 15}px`;
    groupBox.style.top = `${bounds.y - 35}px`;
    groupBox.style.width = `${bounds.width + 30}px`;
    groupBox.style.height = `${bounds.height + 50}px`;
  }

  /**
   * Get bounding box for a group
   */
  _getGroupBounds(groupId) {
    const group = this.groups.get(groupId);
    if (!group || group.nodeIds.size === 0) return null;
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    group.nodeIds.forEach(nodeId => {
      const nodeEl = this.container.querySelector(`#node-${nodeId}`);
      if (nodeEl) {
        const nodeData = this.drawflow.getNodeFromId(nodeId);
        if (nodeData) {
          minX = Math.min(minX, nodeData.pos_x);
          minY = Math.min(minY, nodeData.pos_y);
          maxX = Math.max(maxX, nodeData.pos_x + nodeEl.offsetWidth);
          maxY = Math.max(maxY, nodeData.pos_y + nodeEl.offsetHeight);
        }
      }
    });
    
    if (minX === Infinity) return null;
    
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  /**
   * Setup drag behavior for group box
   */
  _setupGroupDrag(groupId, groupBox) {
    let isDragging = false;
    let startX, startY;
    let nodeStartPositions = new Map();
    
    const header = groupBox.querySelector('.group-header');
    
    header.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
      
      e.preventDefault();
      e.stopPropagation();
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      
      // Store starting positions of all nodes in group
      const group = this.groups.get(groupId);
      if (group) {
        group.nodeIds.forEach(nodeId => {
          const nodeData = this.drawflow.getNodeFromId(nodeId);
          if (nodeData) {
            nodeStartPositions.set(nodeId, { x: nodeData.pos_x, y: nodeData.pos_y });
          }
        });
      }
      
      groupBox.classList.add('dragging');
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const dx = (e.clientX - startX) / this.drawflow.zoom;
      const dy = (e.clientY - startY) / this.drawflow.zoom;
      
      const group = this.groups.get(groupId);
      if (group) {
        group.nodeIds.forEach(nodeId => {
          const startPos = nodeStartPositions.get(nodeId);
          if (startPos) {
            const newX = startPos.x + dx;
            const newY = startPos.y + dy;
            
            // Update node position
            const nodeEl = this.container.querySelector(`#node-${nodeId}`);
            if (nodeEl) {
              nodeEl.style.left = `${newX}px`;
              nodeEl.style.top = `${newY}px`;
            }
            
            // Update Drawflow data
            try {
              const internalData = this.drawflow.drawflow.drawflow.Home.data[nodeId];
              if (internalData) {
                internalData.pos_x = newX;
                internalData.pos_y = newY;
              }
            } catch (err) {}
          }
        });
        
        // Update connections
        this.drawflow.updateConnectionNodes(`node-${[...group.nodeIds][0]}`);
        
        // Update group box position
        this._updateGroupBox(groupId);
      }
    });
    
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        nodeStartPositions.clear();
        groupBox.classList.remove('dragging');
        this._saveToHistory();
        this._triggerChange();
      }
    });
  }

  /**
   * Get next available group number (fills gaps from deleted groups)
   */
  _getNextAvailableGroupNumber() {
    // If no groups exist, start at 1
    if (this.groups.size === 0) {
      return 1;
    }
    
    // Find the smallest unused number
    const usedIds = Array.from(this.groups.keys()).sort((a, b) => a - b);
    let nextId = 1;
    
    for (const id of usedIds) {
      if (id === nextId) {
        nextId++;
      } else if (id > nextId) {
        // Found a gap
        break;
      }
    }
    
    return nextId;
  }

  /**
   * Get color for a group based on ID
   */
  _getGroupColor(groupId) {
    const colors = [
      '#02514a', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ];
    return colors[(groupId - 1) % colors.length];
  }

  /**
   * Update all group boxes (call after node moves)
   */
  _updateAllGroupBoxes() {
    this.groups.forEach((group, groupId) => {
      this._updateGroupBox(groupId);
    });
  }

  /**
   * --------------------------------------------------------------------------
   * PUBLIC: ADD COMMENT
   * --------------------------------------------------------------------------
   * 
   * Adds a sticky note / comment node at the specified position.
   * 
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {string} text - Initial comment text
   * @returns {number} Node ID
   * 
   * --------------------------------------------------------------------------
   */
  addComment(x, y, text = '') {
    // Create comment node HTML - simple sticky note
    const commentHtml = `
      <div class="workflow-node comment-node">
        <button class="comment-delete" title="Delete note">×</button>
        <textarea class="comment-text" placeholder="Type a note...">${text}</textarea>
        <div class="comment-resize-handle"></div>
      </div>
    `;
    
    // Add node to drawflow
    const nodeId = this.drawflow.addNode(
      'comment',
      0, // inputs
      0, // outputs
      x,
      y,
      'comment-node-wrapper',
      { _text: text, _isComment: true },
      commentHtml
    );
    
    // Setup textarea and delete button events
    setTimeout(() => {
      const node = this.container.querySelector(`#node-${nodeId}`);
      const textarea = node?.querySelector('.comment-text');
      const deleteBtn = node?.querySelector('.comment-delete');
      
      if (textarea) {
        textarea.addEventListener('input', (e) => {
          // Update internal data directly (getNodeFromId returns a copy)
          try {
            const internalData = this.drawflow.drawflow.drawflow.Home.data[nodeId];
            if (internalData) {
              internalData.data._text = e.target.value;
            }
          } catch (err) {
            console.warn('[VizFlow] Could not save comment text:', err);
          }
          this._triggerChange();
        });
        
        // Prevent drag when typing
        textarea.addEventListener('mousedown', (e) => {
          e.stopPropagation();
        });
        
        // Auto-focus when created
        textarea.focus();
      }
      
      // Delete button handler
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.drawflow.removeNodeId(`node-${nodeId}`);
        });
      }
      
      // Setup resize handle
      this._setupCommentResize(nodeId);
    }, 0);
    
    this._setStatus('Comment added');
    return nodeId;
  }

  /**
   * Setup resize functionality for comment nodes
   */
  _setupCommentResize(nodeId) {
    const node = this.container.querySelector(`#node-${nodeId}`);
    if (!node) return;
    
    const handle = node.querySelector('.comment-resize-handle');
    const commentNode = node.querySelector('.comment-node');
    if (!handle || !commentNode) return;
    
    let isResizing = false;
    let startWidth, startHeight, startX, startY;
    
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      isResizing = true;
      startWidth = commentNode.offsetWidth;
      startHeight = commentNode.offsetHeight;
      startX = e.clientX;
      startY = e.clientY;
      
      document.body.style.cursor = 'nwse-resize';
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      
      const newWidth = Math.max(150, startWidth + (e.clientX - startX) / this.drawflow.zoom);
      const newHeight = Math.max(100, startHeight + (e.clientY - startY) / this.drawflow.zoom);
      
      commentNode.style.width = `${newWidth}px`;
      commentNode.style.height = `${newHeight}px`;
    });
    
    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.cursor = '';
      }
    });
  }

  // ============================================================================
  // AUTO-SAVE & STORAGE
  // ============================================================================

  /**
   * Storage key for localStorage
   */
  get _storageKey() {
    return 'flowkit_workflow_draft';
  }
  
  get _recentKey() {
    return 'flowkit_recent_workflows';
  }

  /**
   * Setup auto-save functionality
   */
  _setupAutoSave() {
    // Save every 30 seconds if there are changes
    this._autoSaveInterval = setInterval(() => {
      if (this.hasUnsavedChanges) {
        this._saveToStorage();
      }
    }, 30000);
    
    // Save on node changes
    this.drawflow.on('nodeCreated', () => this._markUnsaved());
    this.drawflow.on('nodeRemoved', () => this._markUnsaved());
    this.drawflow.on('connectionCreated', () => this._markUnsaved());
    this.drawflow.on('connectionRemoved', () => this._markUnsaved());
    this.drawflow.on('nodeMoved', () => this._markUnsaved());
    
    // Auto-save before unload (silent, no confirmation)
    window.addEventListener('beforeunload', () => {
      if (this.hasUnsavedChanges) {
        this._saveToStorage();
      }
    });
  }

  /**
   * Mark workflow as having unsaved changes
   */
  _markUnsaved() {
    this.hasUnsavedChanges = true;
    this._updateSaveIndicator();
  }

  /**
   * Update save indicator in UI
   */
  _updateSaveIndicator() {
    // Indicator disabled - keeping the method for API compatibility
  }

  /**
   * Save workflow to localStorage
   */
  _saveToStorage() {
    try {
      const workflow = this.export();
      if (workflow) {
        // Include execution state if available
        const executionState = this.executor ? this.executor.exportState() : null;
        
        localStorage.setItem(this._storageKey, JSON.stringify({
          workflow,
          executionState,
          timestamp: Date.now()
        }));
        this.hasUnsavedChanges = false;
        this._updateSaveIndicator();
        this._setStatus('Draft saved');
      }
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }

  /**
   * Load workflow from localStorage
   */
  _loadFromStorage() {
    try {
      const saved = localStorage.getItem(this._storageKey);
      if (saved) {
        const { workflow, executionState, timestamp } = JSON.parse(saved);
        const age = Date.now() - timestamp;
        const hours = Math.floor(age / (1000 * 60 * 60));
        
        // Only offer to restore if less than 24 hours old
        if (age < 24 * 60 * 60 * 1000) {
          const timeAgo = hours > 0 ? `${hours}h ago` : 'recently';
          this._showConfirmModal('Restore Draft', `Restore unsaved workflow from ${timeAgo}?`, () => {
            this.import(workflow);
            // Color condition connections after restore
            setTimeout(() => this._colorConditionConnections(), 100);
            
            // Restore execution state if available
            if (executionState && this.executor) {
              setTimeout(() => {
                this.executor.importState(executionState);
                this._updateExecutionLog();
              }, 200);
            }
            
            this._setStatus('Draft restored');
          });
        }
      }
    } catch (e) {
      console.warn('Failed to load from localStorage:', e);
    }
  }

  /**
   * Clear saved draft
   */
  _clearStorage() {
    localStorage.removeItem(this._storageKey);
    this.hasUnsavedChanges = false;
    this._updateSaveIndicator();
  }

  /**
   * Add to recent workflows
   */
  _addToRecent(name, workflow) {
    try {
      let recent = JSON.parse(localStorage.getItem(this._recentKey) || '[]');
      recent.unshift({
        name: name || 'Untitled',
        timestamp: Date.now(),
        nodeCount: Object.keys(workflow.drawflow?.Home?.data || {}).length
      });
      // Keep only last 10
      recent = recent.slice(0, 10);
      localStorage.setItem(this._recentKey, JSON.stringify(recent));
    } catch (e) {
      console.warn('Failed to save recent:', e);
    }
  }

  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================

  /**
   * Setup keyboard shortcuts for navigation and actions
   */
  _setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Skip if typing in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      
      // Cmd/Ctrl + S - Save
      if (cmdOrCtrl && e.key === 's') {
        e.preventDefault();
        this._saveToStorage();
        this._setStatus('Saved!');
      }
      
      // Cmd/Ctrl + E - Export
      if (cmdOrCtrl && e.key === 'e') {
        e.preventDefault();
        this._exportWorkflow();
      }
      
      // Cmd/Ctrl + I - Import
      if (cmdOrCtrl && e.key === 'i') {
        e.preventDefault();
        // Trigger file input click
        const fileInput = this.container.querySelector('#import-file');
        if (fileInput) fileInput.click();
      }
      
      // Cmd/Ctrl + Enter - Run workflow
      if (cmdOrCtrl && e.key === 'Enter') {
        e.preventDefault();
        this._executeWorkflow();
      }
      
      // Delete/Backspace - Delete selected node
      if ((e.key === 'Delete' || e.key === 'Backspace') && this.drawflow.node_selected) {
        e.preventDefault();
        this.removeNode(this.drawflow.node_selected);
      }
      
      // Escape - Deselect / Close modals
      if (e.key === 'Escape') {
        this._closeAllModals();
        this._toggleExamplesDropdown(true);
        if (this.drawflow.node_selected) {
          this._deselectNode();
        }
      }
      
      // Arrow keys - Navigate between nodes
      if (e.key.startsWith('Arrow') && this.drawflow.node_selected) {
        e.preventDefault();
        this._navigateToAdjacentNode(e.key);
      }
      
      // F - Fit to screen
      if (e.key === 'f' && !cmdOrCtrl) {
        this.fitToScreen();
      }
      
      // + / = - Zoom in
      if ((e.key === '+' || e.key === '=') && !cmdOrCtrl) {
        e.preventDefault();
        this.zoomIn();
      }
      
      // - - Zoom out
      if (e.key === '-' && !cmdOrCtrl) {
        e.preventDefault();
        this.zoomOut();
      }
      
      // ? - Show keyboard shortcuts
      if (e.key === '?' && e.shiftKey) {
        e.preventDefault();
        this._showKeyboardShortcuts();
      }
    });
  }

  /**
   * Navigate to adjacent node using arrow keys
   */
  _navigateToAdjacentNode(direction) {
    const selectedId = this.drawflow.node_selected;
    if (!selectedId) return;
    
    const currentNode = this.drawflow.getNodeFromId(selectedId);
    if (!currentNode) return;
    
    const currentX = currentNode.pos_x;
    const currentY = currentNode.pos_y;
    
    const nodes = Object.values(this.drawflow.export().drawflow.Home.data);
    let bestNode = null;
    let bestDistance = Infinity;
    
    nodes.forEach(node => {
      if (node.id === parseInt(selectedId)) return;
      
      const dx = node.pos_x - currentX;
      const dy = node.pos_y - currentY;
      
      let matches = false;
      switch (direction) {
        case 'ArrowRight': matches = dx > 50; break;
        case 'ArrowLeft': matches = dx < -50; break;
        case 'ArrowDown': matches = dy > 50; break;
        case 'ArrowUp': matches = dy < -50; break;
      }
      
      if (matches) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestNode = node;
        }
      }
    });
    
    if (bestNode) {
      // Programmatically select the node
      const nodeEl = this.container.querySelector(`#node-${bestNode.id}`);
      if (nodeEl) {
        // Deselect current
        this.container.querySelectorAll('.drawflow-node.selected').forEach(n => n.classList.remove('selected'));
        // Select new
        nodeEl.classList.add('selected');
        this.drawflow.node_selected = bestNode.id;
        this._showProperties(bestNode.id);
      }
      this._panToNode(bestNode.id);
    }
  }

  /**
   * Pan canvas to center on a node
   */
  _panToNode(nodeId) {
    const node = this.container.querySelector(`#node-${nodeId}`);
    if (!node) return;
    
    const canvas = this.container.querySelector('#drawflow');
    if (!canvas) return;
    
    const nodeRect = node.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    
    const centerX = canvasRect.width / 2;
    const centerY = canvasRect.height / 2;
    const nodeX = nodeRect.left - canvasRect.left + nodeRect.width / 2;
    const nodeY = nodeRect.top - canvasRect.top + nodeRect.height / 2;
    
    // Adjust canvas position if node is near edge
    if (nodeX < 100 || nodeX > canvasRect.width - 100 || 
        nodeY < 100 || nodeY > canvasRect.height - 100) {
      const offsetX = centerX - nodeX;
      const offsetY = centerY - nodeY;
      this.drawflow.canvas_x += offsetX;
      this.drawflow.canvas_y += offsetY;
      this.drawflow.precanvas.style.transform = 
        `translate(${this.drawflow.canvas_x}px, ${this.drawflow.canvas_y}px) scale(${this.drawflow.zoom})`;
    }
  }

  /**
   * Deselect current node
   */
  _deselectNode() {
    const selectedNodeId = this.drawflow.node_selected;
    if (selectedNodeId) {
      const node = this.container.querySelector(`#node-${selectedNodeId}`);
      if (node) node.classList.remove('selected');
      this.drawflow.node_selected = null;
      this._hideProperties();
    }
  }

  /**
   * Close all open modals
   */
  _closeAllModals() {
    const modals = this.container.querySelectorAll('.modal');
    modals.forEach(modal => modal.classList.remove('active'));
  }

  /**
   * Show a generic modal with title and content
   */
  _showModal(title, content) {
    // Remove existing generic modal
    const existing = this.container.querySelector('#generic-modal');
    if (existing) existing.remove();
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'generic-modal';
    modal.className = 'modal active';
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close" data-action="close-modal">&times;</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
      </div>
    `;
    
    this.container.appendChild(modal);
    
    // Close handlers
    modal.querySelector('.modal-overlay').addEventListener('click', () => modal.remove());
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
  }

  /**
   * Show keyboard shortcuts modal
   */
  _showKeyboardShortcuts() {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmd = isMac ? '⌘' : 'Ctrl';
    
    const shortcuts = `
      <div class="shortcuts-grid">
        <div class="shortcut"><kbd>${cmd}</kbd> + <kbd>S</kbd><span>Save draft</span></div>
        <div class="shortcut"><kbd>${cmd}</kbd> + <kbd>E</kbd><span>Export</span></div>
        <div class="shortcut"><kbd>${cmd}</kbd> + <kbd>I</kbd><span>Import</span></div>
        <div class="shortcut"><kbd>${cmd}</kbd> + <kbd>↵</kbd><span>Run workflow</span></div>
        <div class="shortcut"><kbd>⌫</kbd><span>Delete node</span></div>
        <div class="shortcut"><kbd>Esc</kbd><span>Deselect / Close</span></div>
        <div class="shortcut"><kbd>←↑↓→</kbd><span>Navigate nodes</span></div>
        <div class="shortcut"><kbd>F</kbd><span>Fit to screen</span></div>
        <div class="shortcut"><kbd>+</kbd> / <kbd>-</kbd><span>Zoom in/out</span></div>
        <div class="shortcut"><kbd>?</kbd><span>Show shortcuts</span></div>
      </div>
    `;
    
    this._showModal('Keyboard Shortcuts', shortcuts);
  }

  // ============================================================================
  // EXAMPLE WORKFLOWS
  // ============================================================================

  /**
   * Toggle the examples dropdown menu
   */
  _toggleExamplesDropdown(forceClose = null) {
    const menu = this.container.querySelector('#examples-menu');
    const dropdown = this.container.querySelector('#examples-dropdown');
    if (!menu || !dropdown) return;
    
    const isOpen = menu.classList.contains('visible');
    
    // forceClose: true = close, null = toggle
    if (forceClose === true || (forceClose === null && isOpen)) {
      menu.classList.remove('visible');
      dropdown.classList.remove('open');
    } else if (forceClose === null && !isOpen) {
      menu.classList.add('visible');
      dropdown.classList.add('open');
    }
  }

  /**
   * Load an example workflow
   */
  _loadExample(exampleId) {
    const examples = this._getExampleWorkflows();
    const example = examples[exampleId];
    
    if (!example) {
      this._setStatus('Example not found');
      return;
    }
    
    // Track current example and update active state immediately
    this._currentExample = exampleId;
    const menuItems = this.container.querySelectorAll('#examples-menu .dropdown-item[data-example]');
    menuItems.forEach(item => {
      item.classList.remove('active');
      if (item.dataset.example === exampleId) {
        item.classList.add('active');
      }
    });
    
    const doLoad = () => {
      // Clear without confirm
      this.clear(true);
      
      // Create nodes
      const nodeIdMap = {}; // oldId -> newId
      example.nodes.forEach(node => {
        const definition = this.nodeRegistry.get(node.type);
        
        const id = this.drawflow.addNode(
          node.type,
          node.inputs || 1,
          node.outputs || 1,
          node.x,
          node.y,
          node.type,
          {},
          this._createNodeTemplate(node.type, definition)
        );
        nodeIdMap[node.id] = id;
      
        // Set config
        if (node.config) {
          this.setNodeConfig(id, node.config);
        }
      });
      
      // Create connections
      example.connections.forEach(conn => {
        const fromId = nodeIdMap[conn.from];
        const toId = nodeIdMap[conn.to];
        if (fromId && toId) {
          this.drawflow.addConnection(fromId, toId, conn.fromOutput || 'output_1', conn.toInput || 'input_1');
        }
      });
      
      // Ensure data-type attributes are set on all nodes
      Object.values(nodeIdMap).forEach(nodeId => {
        const nodeEl = this.container.querySelector(`#node-${nodeId}`);
        if (nodeEl) {
          const nodeData = this.drawflow.getNodeFromId(nodeId);
          if (nodeData && nodeData.class) {
            nodeEl.setAttribute('data-type', nodeData.class);
          }
        }
      });
      
      // Color condition connections
      setTimeout(() => this._colorConditionConnections(), 50);
      
      this._updateStats();
      this._saveToHistory();
      this._setStatus(`Loaded: ${example.name}`);
    };
    
    // Confirm if there's existing work
    const nodes = this.drawflow.export()?.drawflow?.Home?.data || {};
    if (Object.keys(nodes).length > 0) {
      this._showConfirmModal('Load Example', `Load "${example.name}" example? This will clear your current workflow.`, doLoad);
    } else {
      doLoad();
    }
  }

  /**
   * Get example workflow definitions
   */
  _getExampleWorkflows() {
    return {
      'api-test': {
        name: 'API Request Test',
        description: 'Simple API call with response handling',
        nodes: [
          { id: 1, type: 'trigger', x: 100, y: 200, inputs: 0, outputs: 1, config: { triggerType: 'manual' } },
          { id: 2, type: 'http', x: 400, y: 200, inputs: 1, outputs: 1, config: {
            method: 'GET',
            url: 'https://jsonplaceholder.typicode.com/todos/1',
            headers: '{"Accept": "application/json"}'
          }},
          { id: 3, type: 'transform', x: 700, y: 200, inputs: 1, outputs: 1, config: {
            transformType: 'javascript',
            code: 'return { title: data.title, completed: data.completed };'
          }},
          { id: 4, type: 'end', x: 1000, y: 200, inputs: 1, outputs: 0 }
        ],
        connections: [
          { from: 1, to: 2 },
          { from: 2, to: 3 },
          { from: 3, to: 4 }
        ]
      },
      
      'data-pipeline': {
        name: 'Data Pipeline',
        description: 'Fetch, transform, and filter data',
        nodes: [
          { id: 1, type: 'trigger', x: 100, y: 250, inputs: 0, outputs: 1 },
          { id: 2, type: 'http', x: 380, y: 250, inputs: 1, outputs: 1, config: {
            method: 'GET',
            url: 'https://jsonplaceholder.typicode.com/users'
          }},
          { id: 3, type: 'filter', x: 660, y: 250, inputs: 1, outputs: 1, config: {
            filterType: 'field_match',
            field: 'address.city',
            operator: 'not_empty'
          }},
          { id: 4, type: 'transform', x: 940, y: 250, inputs: 1, outputs: 1, config: {
            transformType: 'javascript',
            code: 'return data.map(u => ({ name: u.name, email: u.email, city: u.address.city }));'
          }},
          { id: 5, type: 'end', x: 1220, y: 250, inputs: 1, outputs: 0 }
        ],
        connections: [
          { from: 1, to: 2 },
          { from: 2, to: 3 },
          { from: 3, to: 4 },
          { from: 4, to: 5 }
        ]
      },
      
      'condition-flow': {
        name: 'Conditional Flow',
        description: 'Branch workflow based on API response',
        nodes: [
          { id: 1, type: 'trigger', x: 100, y: 300, inputs: 0, outputs: 1 },
          { id: 2, type: 'http', x: 380, y: 300, inputs: 1, outputs: 1, config: {
            method: 'GET',
            url: 'https://jsonplaceholder.typicode.com/todos/1'
          }},
          { id: 3, type: 'condition', x: 660, y: 300, inputs: 1, outputs: 2, config: {
            conditionType: 'javascript',
            js_condition: 'return ctx.lastResult?.data?.completed === true;'
          }},
          { id: 4, type: 'action', x: 940, y: 180, inputs: 1, outputs: 1, config: {} },
          { id: 5, type: 'action', x: 940, y: 420, inputs: 1, outputs: 1, config: {} },
          { id: 6, type: 'end', x: 1220, y: 300, inputs: 1, outputs: 0 }
        ],
        connections: [
          { from: 1, to: 2 },
          { from: 2, to: 3 },
          { from: 3, to: 4, fromOutput: 'output_1' },
          { from: 3, to: 5, fromOutput: 'output_2' },
          { from: 4, to: 6 },
          { from: 5, to: 6 }
        ]
      },
      
      'loop-example': {
        name: 'Loop Through Data',
        description: 'Iterate over array items',
        nodes: [
          { id: 1, type: 'trigger', x: 100, y: 280, inputs: 0, outputs: 1, config: {
            initialData: '{"items": [1, 2, 3, 4, 5]}'
          }},
          { id: 2, type: 'loop', x: 400, y: 280, inputs: 1, outputs: 2, config: {
            source: '{{lastResult.data.items}}'
          }},
          { id: 3, type: 'transform', x: 700, y: 180, inputs: 1, outputs: 1, config: {
            transformType: 'javascript',
            code: 'return { value: ctx.item * 2, original: ctx.item };'
          }},
          { id: 4, type: 'end', x: 700, y: 400, inputs: 1, outputs: 0 }
        ],
        connections: [
          { from: 1, to: 2 },
          { from: 2, to: 3, fromOutput: 'output_1' },
          { from: 2, to: 4, fromOutput: 'output_2' },
          { from: 3, to: 2 }
        ]
      },
      
      'notification-flow': {
        name: 'Notification Flow',
        description: 'Send email/Slack based on API data',
        nodes: [
          { id: 1, type: 'trigger', x: 100, y: 280, inputs: 0, outputs: 1 },
          { id: 2, type: 'http', x: 400, y: 280, inputs: 1, outputs: 2, config: {
            method: 'GET',
            url: 'https://jsonplaceholder.typicode.com/posts/1'
          }},
          { id: 3, type: 'email', x: 700, y: 150, inputs: 1, outputs: 1, config: {
            to: 'user@example.com',
            subject: 'New Post: {{lastResult.data.title}}',
            body: '{{lastResult.data.body}}'
          }},
          { id: 4, type: 'slack', x: 700, y: 410, inputs: 1, outputs: 1, config: {
            channel: '#notifications',
            message: 'New post created: {{lastResult.data.title}}'
          }},
          { id: 5, type: 'end', x: 1000, y: 280, inputs: 1, outputs: 0 }
        ],
        connections: [
          { from: 1, to: 2 },
          { from: 2, to: 3, fromOutput: 'output_1' },
          { from: 2, to: 4, fromOutput: 'output_2' },
          { from: 3, to: 5 },
          { from: 4, to: 5 }
        ]
      },
      
      'error-handling': {
        name: 'Error Handling',
        description: 'Handle API errors gracefully',
        nodes: [
          { id: 1, type: 'trigger', x: 100, y: 280, inputs: 0, outputs: 1 },
          { id: 2, type: 'http', x: 400, y: 280, inputs: 1, outputs: 2, config: {
            method: 'GET',
            url: 'https://httpstat.us/500',
            ignore_errors: false
          }},
          { id: 3, type: 'action', x: 700, y: 150, inputs: 1, outputs: 1, config: {} },
          { id: 4, type: 'action', x: 700, y: 410, inputs: 1, outputs: 1, config: {} },
          { id: 5, type: 'end', x: 1000, y: 280, inputs: 1, outputs: 0 }
        ],
        connections: [
          { from: 1, to: 2 },
          { from: 2, to: 3, fromOutput: 'output_1' },
          { from: 2, to: 4, fromOutput: 'output_2' },
          { from: 3, to: 5 },
          { from: 4, to: 5 }
        ]
      },
      
      // Complex Examples
      'full-api-workflow': {
        name: 'Full API Workflow',
        description: 'Complete API integration with auth, retry, and data processing',
        nodes: [
          { id: 1, type: 'trigger', x: 100, y: 300, inputs: 0, outputs: 1, config: {
            triggerType: 'manual',
            initialData: '{"userId": 1}'
          }},
          { id: 2, type: 'http', x: 380, y: 300, inputs: 1, outputs: 1, config: {
            method: 'GET',
            url: 'https://jsonplaceholder.typicode.com/users/{{data.userId}}',
            headers: '{"Authorization": "Bearer token123", "Accept": "application/json"}'
          }},
          { id: 3, type: 'condition', x: 660, y: 300, inputs: 1, outputs: 2, config: {
            conditionType: 'field',
            field: 'company.name',
            operator: 'not_empty'
          }},
          { id: 4, type: 'http', x: 940, y: 180, inputs: 1, outputs: 1, config: {
            method: 'GET',
            url: 'https://jsonplaceholder.typicode.com/posts?userId={{node_2.data.id}}'
          }},
          { id: 5, type: 'transform', x: 1220, y: 180, inputs: 1, outputs: 1, config: {
            transformType: 'javascript',
            code: 'return { user: context.node_2.data, posts: data, postCount: data.length };'
          }},
          { id: 6, type: 'filter', x: 1500, y: 180, inputs: 1, outputs: 1, config: {
            source: '{{lastResult.data.posts}}',
            filter_type: 'javascript',
            filter_code: 'return item.title && item.title.length > 20;'
          }},
          { id: 7, type: 'action', x: 940, y: 420, inputs: 1, outputs: 1, config: {
            actionName: 'Log Invalid User'
          }},
          { id: 8, type: 'end', x: 1780, y: 300, inputs: 1, outputs: 0 }
        ],
        connections: [
          { from: 1, to: 2 },
          { from: 2, to: 3 },
          { from: 3, to: 4, fromOutput: 'output_1' },
          { from: 3, to: 7, fromOutput: 'output_2' },
          { from: 4, to: 5 },
          { from: 5, to: 6 },
          { from: 6, to: 8 },
          { from: 7, to: 8 }
        ]
      },
      
      'data-enrichment': {
        name: 'Data Enrichment Pipeline',
        description: 'Fetch data from multiple sources and merge',
        nodes: [
          { id: 1, type: 'trigger', x: 100, y: 280, inputs: 0, outputs: 1, config: {
            triggerType: 'manual'
          }},
          { id: 2, type: 'http', x: 380, y: 280, inputs: 1, outputs: 1, config: {
            method: 'GET',
            url: 'https://jsonplaceholder.typicode.com/users'
          }},
          { id: 3, type: 'loop', x: 660, y: 280, inputs: 1, outputs: 2, config: {
            source: '{{lastResult.data}}'
          }},
          { id: 4, type: 'http', x: 940, y: 160, inputs: 1, outputs: 1, config: {
            method: 'GET',
            url: 'https://jsonplaceholder.typicode.com/posts?userId={{item.id}}'
          }},
          { id: 5, type: 'http', x: 940, y: 400, inputs: 1, outputs: 1, config: {
            method: 'GET',
            url: 'https://jsonplaceholder.typicode.com/todos?userId={{item.id}}'
          }},
          { id: 6, type: 'transform', x: 1220, y: 280, inputs: 1, outputs: 1, config: {
            transformType: 'javascript',
            code: 'return { user: ctx.item, posts: ctx.node_4?.data, todos: data };'
          }},
          { id: 7, type: 'end', x: 1500, y: 280, inputs: 1, outputs: 0 }
        ],
        connections: [
          { from: 1, to: 2 },
          { from: 2, to: 3 },
          { from: 3, to: 4, fromOutput: 'output_1' },
          { from: 4, to: 5 },
          { from: 5, to: 6 },
          { from: 6, to: 3 },
          { from: 3, to: 7, fromOutput: 'output_2' }
        ]
      },
      
      'multi-channel-notify': {
        name: 'Multi-Channel Alert System',
        description: 'Monitor API and send alerts via multiple channels',
        nodes: [
          { id: 1, type: 'trigger', x: 100, y: 320, inputs: 0, outputs: 1, config: {
            triggerType: 'schedule',
            cronExpression: '*/5 * * * *'
          }},
          { id: 2, type: 'http', x: 380, y: 320, inputs: 1, outputs: 2, config: {
            method: 'GET',
            url: 'https://api.example.com/health',
            timeout_seconds: 5
          }},
          { id: 3, type: 'condition', x: 660, y: 320, inputs: 1, outputs: 2, config: {
            conditionType: 'field',
            field: 'status',
            operator: 'equals',
            value: 'healthy'
          }},
          { id: 4, type: 'action', x: 940, y: 140, inputs: 1, outputs: 1, config: {
            actionName: 'Log Success'
          }},
          { id: 5, type: 'email', x: 940, y: 320, inputs: 1, outputs: 1, config: {
            to: 'ops-team@example.com',
            subject: 'API Alert: Service Unhealthy',
            body: 'The health check failed at {{timestamp}}. Status: {{lastResult.data.status}}'
          }},
          { id: 6, type: 'slack', x: 940, y: 500, inputs: 1, outputs: 1, config: {
            channel: '#alerts',
            message: 'API DOWN - Health check failed! Status: {{lastResult.data.status}} Time: {{timestamp}}'
          }},
          { id: 7, type: 'http', x: 1220, y: 410, inputs: 1, outputs: 1, config: {
            method: 'POST',
            url: 'https://api.pagerduty.com/incidents',
            body: '{"title": "Service Down", "severity": "critical"}'
          }},
          { id: 8, type: 'end', x: 1500, y: 320, inputs: 1, outputs: 0 }
        ],
        connections: [
          { from: 1, to: 2 },
          { from: 2, to: 3 },
          { from: 3, to: 4, fromOutput: 'output_1' },
          { from: 3, to: 5, fromOutput: 'output_2' },
          { from: 3, to: 6, fromOutput: 'output_2' },
          { from: 5, to: 7 },
          { from: 6, to: 7 },
          { from: 4, to: 8 },
          { from: 7, to: 8 }
        ]
      },
      
      'etl-pipeline': {
        name: 'ETL Pipeline',
        description: 'Extract, Transform, Load data pipeline',
        nodes: [
          { id: 1, type: 'trigger', x: 100, y: 280, inputs: 0, outputs: 1, config: {
            triggerType: 'schedule',
            cronExpression: '0 2 * * *'
          }},
          { id: 2, type: 'http', x: 340, y: 280, inputs: 1, outputs: 1, config: {
            method: 'GET',
            url: 'https://jsonplaceholder.typicode.com/posts'
          }},
          { id: 3, type: 'filter', x: 580, y: 280, inputs: 1, outputs: 1, config: {
            source: '{{lastResult.data}}',
            filterType: 'javascript',
            code: 'return item.userId <= 2;'
          }},
          { id: 4, type: 'transform', x: 820, y: 280, inputs: 1, outputs: 1, config: {
            transformType: 'javascript',
            code: 'return data.map(p => ({ id: p.id, title: p.title.toUpperCase(), author: p.userId, wordCount: p.body.split(" ").length }));'
          }},
          { id: 5, type: 'loop', x: 1060, y: 280, inputs: 1, outputs: 2, config: {
            source: '{{lastResult.data}}'
          }},
          { id: 6, type: 'condition', x: 1300, y: 180, inputs: 1, outputs: 2, config: {
            conditionType: 'field',
            field: 'wordCount',
            operator: 'greater_than',
            value: '10'
          }},
          { id: 7, type: 'database', x: 1540, y: 100, inputs: 1, outputs: 1, config: {
            operation: 'insert',
            table: 'long_posts',
            data: '{{item}}'
          }},
          { id: 8, type: 'database', x: 1540, y: 260, inputs: 1, outputs: 1, config: {
            operation: 'insert',
            table: 'short_posts',
            data: '{{item}}'
          }},
          { id: 9, type: 'transform', x: 1300, y: 420, inputs: 1, outputs: 1, config: {
            transformType: 'javascript',
            code: 'return { processed: ctx.index + 1, timestamp: new Date().toISOString() };'
          }},
          { id: 10, type: 'email', x: 1540, y: 420, inputs: 1, outputs: 1, config: {
            to: 'data-team@example.com',
            subject: 'ETL Pipeline Complete',
            body: 'Processed {{lastResult.data.processed}} records at {{lastResult.data.timestamp}}'
          }},
          { id: 11, type: 'end', x: 1780, y: 280, inputs: 1, outputs: 0 }
        ],
        connections: [
          { from: 1, to: 2 },
          { from: 2, to: 3 },
          { from: 3, to: 4 },
          { from: 4, to: 5 },
          { from: 5, to: 6, fromOutput: 'output_1' },
          { from: 6, to: 7, fromOutput: 'output_1' },
          { from: 6, to: 8, fromOutput: 'output_2' },
          { from: 7, to: 5 },
          { from: 8, to: 5 },
          { from: 5, to: 9, fromOutput: 'output_2' },
          { from: 9, to: 10 },
          { from: 10, to: 11 }
        ]
      }
    };
  }
}
