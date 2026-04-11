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
            <span class="workflow-icon">W</span>
            <h1>Workflow Builder</h1>
          </div>
          <div class="workflow-actions">
            <button class="btn btn-secondary" data-action="validate">Validate</button>
            <button class="btn btn-secondary" data-action="clear">Clear</button>
            <button class="btn btn-secondary" data-action="import">Import</button>
            <button class="btn btn-secondary" data-action="export-image">Image</button>
            <button class="btn btn-primary" data-action="export">Export</button>
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
                <button class="toolbar-btn" data-action="zoom-in" title="Zoom In">
                  <span>+</span>
                </button>
                <span class="zoom-level">100%</span>
                <button class="toolbar-btn" data-action="zoom-out" title="Zoom Out">
                  <span>−</span>
                </button>
                <button class="toolbar-btn" data-action="zoom-reset" title="Reset Zoom">
                  <span>⟲</span>
                </button>
                <button class="toolbar-btn" data-action="fit-view" title="Fit All Nodes">
                  <span>⊡</span>
                </button>
              </div>
              <div class="toggle-controls">
                <button class="toolbar-btn toggle-btn" data-action="toggle-minimap" title="Toggle Minimap">
                  <span>🗺</span>
                </button>
                <button class="toolbar-btn toggle-btn" data-action="toggle-snap" title="Toggle Snap to Grid">
                  <span>⊞</span>
                </button>
                <button class="toolbar-btn toggle-btn" data-action="toggle-animate" title="Toggle Animated Edges">
                  <span>⟿</span>
                </button>
              </div>
              <div class="history-controls">
                <button class="toolbar-btn" data-action="undo" title="Undo (Ctrl+Z)" disabled>
                  <span>↶</span>
                </button>
                <button class="toolbar-btn" data-action="redo" title="Redo (Ctrl+Y)" disabled>
                  <span>↷</span>
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
              <!-- Selection Box for Multi-select (inside canvas for positioning) -->
              <div class="selection-box" id="selection-box"></div>
            </div>
            
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
      const canvasRect = canvas.getBoundingClientRect();
      const x = (event.clientX - canvasRect.left) / this.drawflow.zoom - this.drawflow.canvas_x / this.drawflow.zoom;
      const y = (event.clientY - canvasRect.top) / this.drawflow.zoom - this.drawflow.canvas_y / this.drawflow.zoom;

      /**
       * Add the node to the workflow
       */
      this.addNode(nodeType, x, y);
    });
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
      }
    });

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
       * Ctrl+A: Select all (prevent default, we don't support multi-select yet)
       */
      if (isCtrl && event.key === 'a' && !isTyping) {
        event.preventDefault();
      }
      
      /**
       * Escape: Deselect all
       */
      if (event.key === 'Escape') {
        this.deselectAll();
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
     * Node selected event
     */
    this.drawflow.on('nodeSelected', (nodeId) => {
      this._showProperties(nodeId);
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

    propertiesContent.innerHTML = `
      <div class="properties-node-info">
        <span class="properties-icon">${definition.icon}</span>
        <span class="properties-name">${definition.label}</span>
      </div>
      <div class="properties-fields">
        ${fieldsHtml || '<p class="no-properties">No configurable properties</p>'}
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
     * Setup delete button
     */
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
   * Asks for confirmation before clearing.
   * 
   * --------------------------------------------------------------------------
   */
  clear() {
    if (confirm('Are you sure you want to clear the entire workflow?')) {
      this.drawflow.clear();
      this._updateStats();
      this._saveToHistory();
      this._hideProperties();
      this._setStatus('Workflow cleared');
    }
  }


  /**
   * --------------------------------------------------------------------------
   * PUBLIC: DELETE SELECTED
   * --------------------------------------------------------------------------
   * 
   * Deletes the currently selected node.
   * 
   * --------------------------------------------------------------------------
   */
  deleteSelected() {
    const selectedNode = this.container.querySelector('.drawflow-node.selected');
    if (selectedNode) {
      const nodeId = selectedNode.id.replace('node-', '');
      this.drawflow.removeNodeId(`node-${nodeId}`);
    }
  }


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
    return this.drawflow.export();
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
    this.drawflow.import(data);
    this._updateStats();
    this._saveToHistory();
    this._setStatus('Workflow imported');
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
   * Clear multi-selection
   */
  clearSelection() {
    this.container.querySelectorAll('.multi-selected').forEach(node => {
      node.classList.remove('multi-selected');
    });
    this.selectedNodes.clear();
  }

  /**
   * Delete all selected nodes
   */
  deleteSelected() {
    // First try multi-selected nodes
    if (this.selectedNodes.size > 0) {
      const count = this.selectedNodes.size;
      this.selectedNodes.forEach(id => {
        this.drawflow.removeNodeId(`node-${id}`);
      });
      this.clearSelection();
      this._setStatus(`${count} nodes deleted`);
      this._pushHistory();
      return;
    }
    
    // Then try single selected node
    const selectedNode = this.container.querySelector('.drawflow-node.selected');
    if (selectedNode) {
      const nodeId = selectedNode.id.replace('node-', '');
      this.drawflow.removeNodeId(selectedNode.id);
      this._setStatus('Node deleted');
      this._pushHistory();
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
      { name: 'Blue', value: '#2563EB' },
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
            <input type="color" id="custom-node-color" value="#2563EB">
            <span>Custom</span>
          </div>
        </div>
      </div>
      <div class="context-menu-item" data-action="add-comment">Add Comment</div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" data-action="disconnect">Disconnect All</div>
      <div class="context-menu-item context-menu-danger" data-action="delete">Delete</div>
      <div class="context-menu-item context-menu-danger" data-action="delete-connection" style="display:none;">Delete Connection</div>
      <div class="context-menu-item context-menu-submenu" data-submenu="conn-color" style="display:none;">
        Connection Color
        <span class="submenu-arrow">▶</span>
        <div class="context-submenu" id="conn-color-submenu">
          <div class="color-picker-grid">${colorSwatches}</div>
        </div>
      </div>
    `;
    this.container.appendChild(menu);
    this.contextMenu = menu;
    this.selectedConnection = null;
    this.contextMenuNodeId = null;  // Track which node the context menu is for
    this.contextMenuPosition = { x: 0, y: 0 };  // Track where menu was opened

    // Handle right-click on canvas
    const canvas = this.container.querySelector('#drawflow-canvas');
    canvas.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      
      // Store position for adding comments
      const canvasRect = canvas.getBoundingClientRect();
      this.contextMenuPosition = {
        x: (event.clientX - canvasRect.left) / this.drawflow.zoom - this.drawflow.canvas_x / this.drawflow.zoom,
        y: (event.clientY - canvasRect.top) / this.drawflow.zoom - this.drawflow.canvas_y / this.drawflow.zoom
      };
      
      // Check if right-clicking on a connection
      const connection = event.target.closest('.connection');
      if (connection) {
        // Store the connection info for deletion
        const connectionClass = connection.classList[1]; // e.g., "node_in_node-2"
        this.selectedConnection = connection;
        this.contextMenuNodeId = null;
        this._showContextMenu(event.clientX, event.clientY, false, true);
        return;
      }
      
      // Check if right-clicking on a node
      const node = event.target.closest('.drawflow-node');
      if (node) {
        // Select the node and store its ID
        node.classList.add('selected');
        this.contextMenuNodeId = node.id.replace('node-', '');
        this._showProperties(this.contextMenuNodeId);
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
    
    // Handle color swatch clicks for connections
    menu.querySelectorAll('#conn-color-submenu .color-swatch').forEach(swatch => {
      swatch.addEventListener('click', (event) => {
        event.stopPropagation();
        const color = swatch.dataset.color;
        if (this.selectedConnection) {
          this.setConnectionColor(this.selectedConnection, color);
        }
        this._hideContextMenu();
      });
    });

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
    
    // Show/hide connection color submenu
    const connColorSubmenu = this.contextMenu.querySelector('[data-submenu="conn-color"]');
    if (connColorSubmenu) {
      connColorSubmenu.style.display = isConnection ? 'block' : 'none';
    }
    
    // Show/hide node color submenu
    const nodeColorSubmenu = this.contextMenu.querySelector('[data-submenu="node-color"]');
    if (nodeColorSubmenu) {
      nodeColorSubmenu.style.display = hasNode ? 'block' : 'none';
      nodeColorSubmenu.classList.toggle('disabled', !hasNode);
    }
    
    // Show add-comment always (on canvas or node)
    const addCommentItem = this.contextMenu.querySelector('[data-action="add-comment"]');
    if (addCommentItem) {
      addCommentItem.style.display = isConnection ? 'none' : 'block';
    }
    
    // Enable/disable items based on selection
    const items = this.contextMenu.querySelectorAll('.context-menu-item');
    items.forEach(item => {
      const action = item.dataset.action;
      const submenu = item.dataset.submenu;
      
      if (['copy', 'duplicate', 'disconnect', 'delete'].includes(action)) {
        item.classList.toggle('disabled', !hasNode);
        item.style.display = isConnection ? 'none' : 'block';
      }
      if (action === 'paste') {
        item.classList.toggle('disabled', !this.clipboard);
        item.style.display = isConnection ? 'none' : 'block';
      }
    });
    
    // Hide dividers for connection menu
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
   * Initializes advanced features like multi-select and snap-to-grid.
   * 
   * --------------------------------------------------------------------------
   */
  _setupAdvancedFeatures() {
    const canvas = this.container.querySelector('#drawflow-canvas');
    if (!canvas) return;

    // Selection box for multi-select
    const selectionBox = this.container.querySelector('.selection-box');
    
    // State for drag selection
    let isDragging = false;
    let startX = 0, startY = 0;
    let canvasRect = null;
    
    // Multi-select with shift+click - use mousedown to catch before Drawflow
    canvas.addEventListener('mousedown', (e) => {
      const nodeEl = e.target.closest('.drawflow-node');
      
      // Shift+click on node - toggle selection
      if (nodeEl && e.shiftKey) {
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
      
      // Shift+drag on empty area - start selection box
      if (e.shiftKey && !nodeEl && e.button === 0) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        isDragging = true;
        canvasRect = canvas.getBoundingClientRect();
        startX = e.clientX - canvasRect.left;
        startY = e.clientY - canvasRect.top;
        
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

    // Clear selection on regular click (non-shift)
    canvas.addEventListener('click', (e) => {
      const nodeEl = e.target.closest('.drawflow-node');
      if (!nodeEl && !e.shiftKey) {
        this.clearSelection();
      }
    });

    // Track mouse movement for selection box
    const onMouseMove = (e) => {
      if (!isDragging || !selectionBox || !canvasRect) return;
      
      e.preventDefault();
      
      const currentX = e.clientX - canvasRect.left;
      const currentY = e.clientY - canvasRect.top;
      
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
      
      if (selectionBox && canvasRect) {
        const boxLeft = parseFloat(selectionBox.style.left) || 0;
        const boxTop = parseFloat(selectionBox.style.top) || 0;
        const boxWidth = parseFloat(selectionBox.style.width) || 0;
        const boxHeight = parseFloat(selectionBox.style.height) || 0;
        
        selectionBox.classList.remove('active');
        
        // Only select if box has some size
        if (boxWidth > 10 && boxHeight > 10) {
          const boxScreenRect = {
            left: canvasRect.left + boxLeft,
            top: canvasRect.top + boxTop,
            right: canvasRect.left + boxLeft + boxWidth,
            bottom: canvasRect.top + boxTop + boxHeight
          };
          
          const nodeIds = this.getNodesInRect(boxScreenRect);
          
          if (nodeIds.length > 0) {
            this.selectNodes(nodeIds);
          }
        }
      }
      canvasRect = null;
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
    if (!nodeElement) return;
    
    // Apply color to the node
    nodeElement.style.setProperty('--node-color', color);
    nodeElement.classList.add('custom-color');
    
    // Store color in node data for export/import
    const nodeData = this.drawflow.getNodeFromId(nodeId);
    if (nodeData) {
      nodeData.data._nodeColor = color;
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
   * Changes the color of a specific connection line.
   * 
   * @param {SVGElement} connectionEl - SVG connection element
   * @param {string} color - Hex color value
   * 
   * --------------------------------------------------------------------------
   */
  setConnectionColor(connectionEl, color) {
    if (!connectionEl) return;
    
    // Apply color to the connection path
    const path = connectionEl.querySelector('.main-path');
    if (path) {
      path.style.stroke = color;
      path.dataset.customColor = color;
    }
    
    this._saveToHistory();
    this._triggerChange();
    this._setStatus(`Connection color changed`);
    
    return this;
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
    // Create comment node HTML
    const commentHtml = `
      <div class="workflow-node comment-node">
        <div class="comment-header">
          <span class="comment-icon">📝</span>
          <span class="comment-title">Note</span>
        </div>
        <textarea class="comment-text" placeholder="Add your note here...">${text}</textarea>
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
    
    // Setup textarea change event
    setTimeout(() => {
      const textarea = this.container.querySelector(`#node-${nodeId} .comment-text`);
      if (textarea) {
        textarea.addEventListener('input', (e) => {
          const nodeData = this.drawflow.getNodeFromId(nodeId);
          if (nodeData) {
            nodeData.data._text = e.target.value;
          }
          this._triggerChange();
        });
        
        // Prevent drag when typing
        textarea.addEventListener('mousedown', (e) => {
          e.stopPropagation();
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
}
