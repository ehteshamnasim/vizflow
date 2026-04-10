/**
 * Workflow Builder - TypeScript Definitions
 * A powerful workflow builder built on top of Drawflow
 */

// ============================================================================
// OPTIONS & CONFIGURATION
// ============================================================================

export interface WorkflowBuilderOptions {
  /** Visual theme: 'light' or 'dark' */
  theme?: 'light' | 'dark';
  
  /** Mode: 'edit' or 'view' */
  mode?: 'edit' | 'view';
  
  /** Array of node types to show in the palette */
  nodes?: string[];
  
  /** Callback when workflow is exported/saved */
  onSave?: (data: WorkflowData) => void;
  
  /** Callback when workflow changes */
  onChange?: (data: WorkflowData) => void;
  
  /** Custom node type definitions */
  customNodes?: Record<string, NodeDefinition>;
  
  /** Background pattern: 'none', 'dots', 'lines', or 'grid' */
  background?: 'none' | 'dots' | 'lines' | 'grid';
  
  /** Edge/connection type: 'bezier', 'straight', or 'step' */
  edgeType?: 'bezier' | 'straight' | 'step';
  
  /** Show minimap navigation component */
  minimap?: boolean;
  
  /** Enable snap to grid */
  snapToGrid?: boolean;
  
  /** Grid size for snap (default: 20) */
  gridSize?: number;
  
  /** Enable animated edges */
  animatedEdges?: boolean;
  
  /** Show arrow markers on edges */
  showArrows?: boolean;
}

export interface NodeDefinition {
  /** Display label for the node */
  label: string;
  
  /** SVG icon string */
  icon: string;
  
  /** Color for the node (hex) */
  color: string;
  
  /** Short description */
  description?: string;
  
  /** Number of input connection points */
  inputs: number;
  
  /** Number of output connection points */
  outputs: number;
  
  /** Configurable fields for the node */
  fields: NodeField[];
  
  /** If true, shows only icon (no label) - 79x79px box */
  iconOnly?: boolean;
}

export interface NodeField {
  /** Unique identifier for the field */
  name: string;
  
  /** Display label */
  label: string;
  
  /** Field type */
  type: 'text' | 'textarea' | 'number' | 'select' | 'checkbox';
  
  /** Default value */
  default?: string | number | boolean;
  
  /** Placeholder text */
  placeholder?: string;
  
  /** Options for select type */
  options?: SelectOption[];
}

export interface SelectOption {
  value: string;
  label: string;
}

// ============================================================================
// WORKFLOW DATA
// ============================================================================

export interface WorkflowData {
  drawflow: {
    Home: {
      data: Record<string, DrawflowNode>;
    };
  };
}

export interface DrawflowNode {
  id: number;
  name: string;
  data: Record<string, any>;
  class: string;
  html: string;
  typenode: boolean;
  inputs: Record<string, { connections: Connection[] }>;
  outputs: Record<string, { connections: Connection[] }>;
  pos_x: number;
  pos_y: number;
}

export interface Connection {
  node: string;
  input?: string;
  output?: string;
}

// ============================================================================
// VALIDATION
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
}

export interface ValidationMessage {
  type: 'error' | 'warning';
  message: string;
  nodeId?: number;
}

// ============================================================================
// WORKFLOW METADATA
// ============================================================================

export interface WorkflowMetadata {
  id: string;
  name: string;
  description?: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  workflow: WorkflowData;
}

// ============================================================================
// MAIN CLASS
// ============================================================================

export class WorkflowBuilder {
  /**
   * Creates a new WorkflowBuilder instance
   * @param container - CSS selector or DOM element
   * @param options - Configuration options
   */
  constructor(container: string | HTMLElement, options?: WorkflowBuilderOptions);

  // Node Management
  
  /**
   * Add a node to the canvas
   * @param type - Node type (e.g., 'trigger', 'action')
   * @param x - X position
   * @param y - Y position
   * @param data - Optional node data
   * @returns Node ID
   */
  addNode(type: string, x: number, y: number, data?: Record<string, any>): number;
  
  /**
   * Delete selected node
   */
  deleteSelected(): void;
  
  /**
   * Register a custom node type at runtime
   * @param name - Unique node type identifier
   * @param definition - Node definition
   */
  registerNode(name: string, definition: NodeDefinition): this;

  // Export & Import
  
  /**
   * Export workflow data
   * @returns Workflow data object
   */
  export(): WorkflowData;
  
  /**
   * Import workflow data
   * @param data - Workflow data to import
   */
  import(data: WorkflowData): void;
  
  /**
   * Export workflow as downloadable JSON file
   */
  exportWorkflow(): void;
  
  /**
   * Clear all nodes from the canvas
   */
  clear(): void;

  // Zoom Controls
  
  /** Zoom in */
  zoomIn(): void;
  
  /** Zoom out */
  zoomOut(): void;
  
  /** Reset zoom to 100% */
  zoomReset(): void;

  // View Controls
  
  /**
   * Fit all nodes in the viewport
   * @param padding - Padding around nodes (default: 50)
   */
  fitView(padding?: number): void;
  
  /**
   * Toggle minimap visibility
   */
  toggleMinimap(): void;
  
  /**
   * Toggle snap to grid
   */
  toggleSnap(): void;
  
  /**
   * Toggle animated edges
   */
  toggleAnimate(): void;
  
  /**
   * Snap a position to the grid
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Snapped coordinates
   */
  snapToGrid(x: number, y: number): { x: number; y: number };

  // History
  
  /** Undo last action */
  undo(): void;
  
  /** Redo last undone action */
  redo(): void;

  // Copy/Paste
  
  /** Copy selected node to clipboard */
  copySelected(): void;
  
  /** Paste node from clipboard */
  paste(): void;
  
  /** Duplicate selected node */
  duplicateSelected(): void;

  // Multi-select
  
  /**
   * Select multiple nodes by ID
   * @param nodeIds - Array of node IDs to select
   */
  selectNodes(nodeIds: (string | number)[]): void;
  
  /**
   * Clear multi-selection
   */
  clearSelection(): void;
  
  /**
   * Get nodes within a rectangle
   * @param rect - Selection rectangle
   * @returns Array of node IDs
   */
  getNodesInRect(rect: DOMRect): string[];

  // Export
  
  /**
   * Export workflow as PNG image
   * @param format - Image format ('png' or 'jpg')
   */
  exportAsImage(format?: 'png' | 'jpg'): Promise<void>;

  // Theme
  
  /**
   * Set the theme
   * @param theme - 'light' or 'dark'
   */
  setTheme(theme: 'light' | 'dark'): void;

  // Mode
  
  /**
   * Set the mode
   * @param mode - 'edit' or 'view'
   */
  setMode(mode: 'edit' | 'view'): void;
  
  /**
   * Get current mode
   * @returns Current mode
   */
  getMode(): 'edit' | 'view';
  
  /**
   * Check if in view mode
   * @returns True if in view mode
   */
  isViewMode(): boolean;

  // Validation
  
  /**
   * Validate the workflow
   * @returns Validation result
   */
  validate(): ValidationResult;

  // Cleanup
  
  /**
   * Destroy the instance and cleanup
   */
  destroy(): void;
}

// ============================================================================
// NODE REGISTRY
// ============================================================================

export class NodeRegistry {
  /**
   * Register a node type
   * @param name - Unique identifier
   * @param definition - Node definition
   */
  register(name: string, definition: NodeDefinition): void;
  
  /**
   * Get a node definition by name
   * @param name - Node type name
   * @returns Node definition or null
   */
  get(name: string): NodeDefinition | null;
  
  /**
   * Get all registered node types
   * @returns Array of [name, definition] entries
   */
  getAll(): [string, NodeDefinition][];
  
  /**
   * Check if a node type exists
   * @param name - Node type name
   * @returns True if registered
   */
  has(name: string): boolean;
}

// ============================================================================
// ICONS LIBRARY
// ============================================================================

/**
 * SVG Icons Library
 * 60+ SVG icons as strings, ready to use in nodes or anywhere else
 */
export const icons: {
  // Actions
  play: string;
  stop: string;
  download: string;
  upload: string;
  search: string;
  edit: string;
  copy: string;
  trash: string;
  refresh: string;
  
  // Shapes
  circle: string;
  square: string;
  diamond: string;
  hexagon: string;
  triangle: string;
  star: string;
  heart: string;
  
  // Arrows
  arrowRight: string;
  arrowLeft: string;
  arrowUp: string;
  arrowDown: string;
  
  // Status
  check: string;
  x: string;
  alert: string;
  info: string;
  bell: string;
  
  // Cloud/DevOps
  aws: string;
  lambda: string;
  s3: string;
  cloud: string;
  server: string;
  docker: string;
  kubernetes: string;
  github: string;
  
  // Code
  code: string;
  nodejs: string;
  python: string;
  terminal: string;
  
  // Data
  database: string;
  mongodb: string;
  redis: string;
  json: string;
  file: string;
  folder: string;
  
  // Communication
  email: string;
  slack: string;
  webhook: string;
  http: string;
  api: string;
  
  // Flow
  branch: string;
  merge: string;
  filter: string;
  loop: string;
  clock: string;
  schedule: string;
  transform: string;
  
  // UI
  user: string;
  users: string;
  settings: string;
  lock: string;
  unlock: string;
  key: string;
  globe: string;
  home: string;
  bookmark: string;
  flag: string;
  tag: string;
  note: string;
  link: string;
  
  // Misc
  zap: string;
  layers: string;
  box: string;
  cpu: string;
  activity: string;
  pie: string;
  chart: string;
  image: string;
  svg: string;
  icon: string;
  
  [key: string]: string;
};

// ============================================================================
// DEFAULT NODE TYPES
// ============================================================================

/**
 * All built-in node type definitions
 * 80+ pre-configured node types
 */
export const defaultNodeTypes: Record<string, NodeDefinition>;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate a workflow data object
 * @param data - Workflow data to validate
 * @returns Validation result
 */
export function validateWorkflow(data: WorkflowData): ValidationResult;

/**
 * Get all nodes from a workflow
 * @param data - Workflow data
 * @returns Array of nodes
 */
export function getNodesFromWorkflow(data: WorkflowData): DrawflowNode[];

/**
 * Get total connection count
 * @param data - Workflow data
 * @returns Number of connections
 */
export function getConnectionCount(data: WorkflowData): number;

/**
 * Find nodes with no connections
 * @param data - Workflow data
 * @returns Array of disconnected node IDs
 */
export function findDisconnectedNodes(data: WorkflowData): number[];

/**
 * Convert workflow to Mermaid diagram syntax
 * @param data - Workflow data
 * @returns Mermaid diagram string
 */
export function workflowToMermaid(data: WorkflowData): string;

/**
 * Deep clone a workflow
 * @param data - Workflow data to clone
 * @returns Cloned workflow data
 */
export function cloneWorkflow(data: WorkflowData): WorkflowData;

/**
 * Generate a unique workflow ID
 * @returns UUID string
 */
export function generateWorkflowId(): string;

/**
 * Create workflow metadata wrapper
 * @param data - Workflow data
 * @param meta - Metadata options
 * @returns Workflow with metadata
 */
export function createWorkflowMetadata(
  data: WorkflowData,
  meta?: { name?: string; description?: string }
): WorkflowMetadata;

/**
 * Extract workflow data from metadata wrapper
 * @param wrapped - Workflow with metadata
 * @returns Raw workflow data
 */
export function extractWorkflowData(wrapped: WorkflowMetadata): WorkflowData;

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default WorkflowBuilder;
