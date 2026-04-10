/**
 * ============================================================================
 * NODE REGISTRY
 * ============================================================================
 * 
 * The NodeRegistry manages all available node types in the workflow builder.
 * It provides a centralized way to register, retrieve, and manage node
 * definitions.
 * 
 * RESPONSIBILITIES:
 *   - Store node type definitions
 *   - Validate node definitions on registration
 *   - Provide access to node definitions by name
 *   - Allow custom node types to be registered
 * 
 * NODE DEFINITION STRUCTURE:
 * 
 *   {
 *     label: string,        // Display name shown in UI
 *     icon: string,         // Text icon (single letter or short text)
 *     color: string,        // Hex color for the node
 *     description: string,  // Short description for tooltip
 *     inputs: number,       // Number of input connection points
 *     outputs: number,      // Number of output connection points
 *     fields: Array<Field>  // Configurable fields for the node
 *   }
 * 
 * FIELD STRUCTURE:
 * 
 *   {
 *     name: string,         // Unique identifier for the field
 *     label: string,        // Display label
 *     type: string,         // 'text', 'select', 'number', 'textarea', 'checkbox'
 *     default: any,         // Default value
 *     placeholder: string,  // Placeholder text (optional)
 *     options: Array        // Options for select type (optional)
 *   }
 * 
 * ============================================================================
 */

export class NodeRegistry {
  
  /**
   * --------------------------------------------------------------------------
   * CONSTRUCTOR
   * --------------------------------------------------------------------------
   * 
   * Initializes an empty registry.
   * 
   * --------------------------------------------------------------------------
   */
  constructor() {
    /**
     * Internal storage for node definitions
     * Map structure: { nodeName: nodeDefinition }
     */
    this._nodes = new Map();
  }


  /**
   * --------------------------------------------------------------------------
   * REGISTER
   * --------------------------------------------------------------------------
   * 
   * Registers a new node type with the registry.
   * 
   * @param {string} name - Unique identifier for the node type
   * @param {Object} definition - Node definition object
   * @throws {Error} If name is invalid or definition is malformed
   * 
   * EXAMPLE:
   *   registry.register('myCustomNode', {
   *     label: 'My Custom Node',
   *     icon: 'C',
   *     color: '#FF5722',
   *     description: 'Does something custom',
   *     inputs: 1,
   *     outputs: 2,
   *     fields: [
   *       { name: 'config', label: 'Configuration', type: 'text' }
   *     ]
   *   });
   * 
   * --------------------------------------------------------------------------
   */
  register(name, definition) {
    /**
     * Validate the node name
     */
    if (!name || typeof name !== 'string') {
      throw new Error('NodeRegistry: Node name must be a non-empty string');
    }

    /**
     * Validate the definition object
     */
    this._validateDefinition(name, definition);

    /**
     * Apply defaults to the definition
     */
    const normalizedDefinition = this._normalizeDefinition(definition);

    /**
     * Store in registry
     */
    this._nodes.set(name, normalizedDefinition);
  }


  /**
   * --------------------------------------------------------------------------
   * GET
   * --------------------------------------------------------------------------
   * 
   * Retrieves a node definition by name.
   * 
   * @param {string} name - Name of the node type to retrieve
   * @returns {Object|null} Node definition or null if not found
   * 
   * --------------------------------------------------------------------------
   */
  get(name) {
    return this._nodes.get(name) || null;
  }


  /**
   * --------------------------------------------------------------------------
   * GET ALL
   * --------------------------------------------------------------------------
   * 
   * Returns all registered node types as an array of [name, definition] pairs.
   * 
   * @returns {Array} Array of [name, definition] entries
   * 
   * --------------------------------------------------------------------------
   */
  getAll() {
    return Array.from(this._nodes.entries());
  }


  /**
   * --------------------------------------------------------------------------
   * HAS
   * --------------------------------------------------------------------------
   * 
   * Checks if a node type is registered.
   * 
   * @param {string} name - Name of the node type to check
   * @returns {boolean} True if registered, false otherwise
   * 
   * --------------------------------------------------------------------------
   */
  has(name) {
    return this._nodes.has(name);
  }


  /**
   * --------------------------------------------------------------------------
   * UNREGISTER
   * --------------------------------------------------------------------------
   * 
   * Removes a node type from the registry.
   * 
   * @param {string} name - Name of the node type to remove
   * @returns {boolean} True if removed, false if not found
   * 
   * --------------------------------------------------------------------------
   */
  unregister(name) {
    return this._nodes.delete(name);
  }


  /**
   * --------------------------------------------------------------------------
   * CLEAR
   * --------------------------------------------------------------------------
   * 
   * Removes all node types from the registry.
   * 
   * --------------------------------------------------------------------------
   */
  clear() {
    this._nodes.clear();
  }


  /**
   * --------------------------------------------------------------------------
   * PRIVATE: VALIDATE DEFINITION
   * --------------------------------------------------------------------------
   * 
   * Validates a node definition to ensure it has all required properties.
   * 
   * @param {string} name - Node name (for error messages)
   * @param {Object} definition - Definition to validate
   * @throws {Error} If validation fails
   * 
   * --------------------------------------------------------------------------
   */
  _validateDefinition(name, definition) {
    if (!definition || typeof definition !== 'object') {
      throw new Error(`NodeRegistry: Definition for "${name}" must be an object`);
    }

    /**
     * Required properties check
     */
    const requiredProps = ['label', 'icon', 'color'];
    for (const prop of requiredProps) {
      if (!definition[prop]) {
        throw new Error(
          `NodeRegistry: Definition for "${name}" is missing required property "${prop}"`
        );
      }
    }

    /**
     * Validate color format (should be hex)
     */
    if (!/^#[0-9A-Fa-f]{6}$/.test(definition.color)) {
      throw new Error(
        `NodeRegistry: Color for "${name}" must be a valid hex color (e.g., #FF5722)`
      );
    }

    /**
     * Validate fields array if present
     */
    if (definition.fields && !Array.isArray(definition.fields)) {
      throw new Error(`NodeRegistry: Fields for "${name}" must be an array`);
    }
  }


  /**
   * --------------------------------------------------------------------------
   * PRIVATE: NORMALIZE DEFINITION
   * --------------------------------------------------------------------------
   * 
   * Applies default values to a node definition.
   * 
   * @param {Object} definition - Definition to normalize
   * @returns {Object} Normalized definition
   * 
   * --------------------------------------------------------------------------
   */
  _normalizeDefinition(definition) {
    return {
      label: definition.label,
      icon: definition.icon,
      color: definition.color,
      description: definition.description || '',
      inputs: definition.inputs ?? 1,
      outputs: definition.outputs ?? 1,
      fields: (definition.fields || []).map(field => this._normalizeField(field)),
      iconOnly: definition.iconOnly || false
    };
  }


  /**
   * --------------------------------------------------------------------------
   * PRIVATE: NORMALIZE FIELD
   * --------------------------------------------------------------------------
   * 
   * Applies default values to a field definition.
   * 
   * @param {Object} field - Field to normalize
   * @returns {Object} Normalized field
   * 
   * --------------------------------------------------------------------------
   */
  _normalizeField(field) {
    return {
      name: field.name,
      label: field.label || field.name,
      type: field.type || 'text',
      default: field.default ?? '',
      placeholder: field.placeholder || '',
      options: field.options || []
    };
  }
}
