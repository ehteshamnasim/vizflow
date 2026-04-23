/**
 * NodeExecutors - Registry of node executors
 * Each node type has its own executor that handles its specific logic
 * 
 * This is a GENERIC system - you can define any configuration for nodes
 * and create custom executors for any behavior
 * 
 * SECURITY NOTE: 
 * This module uses eval() and new Function() for JavaScript expression execution.
 * This is intentional for full JavaScript support in workflow conditions.
 * For production use with untrusted input, consider:
 * - Using a sandboxed expression parser (e.g., expr-eval, mathjs)
 * - Running in a Web Worker with restricted APIs
 * - Validating/whitelisting allowed expressions
 */

import { logger } from '../utils/logger.js';

/**
 * Base Node Executor - All executors extend this
 */
class BaseNodeExecutor {
  /**
   * Get the configuration schema for this node type
   * Returns array of field definitions for the config panel
   */
  static getConfigSchema() {
    return [];
  }

  /**
   * Execute the node
   * @param {Object} node - Node data from Drawflow
   * @param {Object} config - User-defined configuration
   * @param {Object} context - Execution context (data from previous nodes)
   * @param {AbortSignal} signal - Abort signal for cancellation
   * @returns {Promise<Object>} - Execution result
   */
  static async execute(node, config, context, signal) {
    return { output: 'output_1', data: null };
  }

  /**
   * Interpolate variables in a string using context
   * Supports {{variable}} and {{node_1.field}} syntax
   * If the entire string is just a single {{...}} reference, returns the actual value (preserving type)
   */
  static interpolate(str, context) {
    if (typeof str !== 'string') return str;
    
    // Special case: if entire string is a single template reference, return the actual value
    const fullMatch = str.match(/^\{\{([^}]+)\}\}$/);
    if (fullMatch) {
      const parts = fullMatch[1].trim().split('.');
      let value = context;
      for (const part of parts) {
        if (value === undefined || value === null) return str;
        value = value[part];
      }
      return value !== undefined ? value : str;
    }
    
    // Otherwise, do string substitution
    return str.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const parts = key.trim().split('.');
      let value = context;
      
      for (const part of parts) {
        if (value === undefined || value === null) return match;
        value = value[part];
      }
      
      // For embedded templates, convert to string representation
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      
      return value !== undefined ? value : match;
    });
  }

  /**
   * Get a nested value from an object by path
   */
  static getByPath(obj, path) {
    if (!path || !obj) return obj;
    const parts = path.split('.');
    let value = obj;
    
    for (const part of parts) {
      // Handle array notation like items[0]
      const match = part.match(/^(\w+)\[(\d+)\]$/);
      if (match) {
        value = value?.[match[1]]?.[parseInt(match[2])];
      } else {
        value = value?.[part];
      }
      if (value === undefined) return undefined;
    }
    
    return value;
  }

  /**
   * Deep interpolate all string values in an object
   */
  static interpolateObject(obj, context) {
    if (typeof obj === 'string') {
      return this.interpolate(obj, context);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.interpolateObject(item, context));
    }
    
    if (obj && typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.interpolateObject(value, context);
      }
      return result;
    }
    
    return obj;
  }
}

/**
 * Trigger Node Executor
 * Starting point of workflow, can have initial data
 */
class TriggerExecutor extends BaseNodeExecutor {
  static getConfigSchema() {
    return [
      {
        key: 'triggerType',
        label: 'Trigger Type',
        type: 'select',
        options: ['manual', 'webhook', 'schedule', 'event'],
        default: 'manual'
      },
      {
        key: 'initialData',
        label: 'Initial Data (JSON)',
        type: 'json',
        default: '{}'
      },
      {
        key: 'description',
        label: 'Description',
        type: 'textarea',
        default: ''
      }
    ];
  }

  static async execute(node, config, context, signal) {
    let initialData = {};
    
    try {
      if (config.initialData) {
        initialData = typeof config.initialData === 'string' 
          ? JSON.parse(config.initialData) 
          : config.initialData;
      }
    } catch (e) {
      logger.warn('Invalid initial data JSON:', e);
    }
    
    return {
      output: 'output_1',
      data: initialData,
      triggerType: config.triggerType || 'manual',
      triggeredAt: new Date().toISOString()
    };
  }
}

/**
 * Action Node Executor
 * Performs an action - generic, can be HTTP, function, etc.
 */
class ActionExecutor extends BaseNodeExecutor {
  static getConfigSchema() {
    return [
      {
        key: 'actionType',
        label: 'Action Type',
        type: 'select',
        options: ['http_request', 'javascript', 'log', 'set_variable', 'delay'],
        default: 'log'
      },
      // HTTP Request fields
      {
        key: 'http_method',
        label: 'HTTP Method',
        type: 'select',
        options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        default: 'GET',
        showIf: { actionType: 'http_request' }
      },
      {
        key: 'http_url',
        label: 'URL',
        type: 'text',
        placeholder: 'https://api.example.com/endpoint',
        showIf: { actionType: 'http_request' }
      },
      {
        key: 'http_headers',
        label: 'Headers (JSON)',
        type: 'json',
        default: '{}',
        showIf: { actionType: 'http_request' }
      },
      {
        key: 'http_body',
        label: 'Body (JSON)',
        type: 'json',
        default: '{}',
        showIf: { actionType: 'http_request' }
      },
      // JavaScript execution
      {
        key: 'js_code',
        label: 'JavaScript Code',
        type: 'code',
        language: 'javascript',
        placeholder: '// Access context with `ctx`\n// Return value becomes node output\nreturn ctx.lastResult;',
        showIf: { actionType: 'javascript' }
      },
      // Log
      {
        key: 'log_message',
        label: 'Log Message',
        type: 'textarea',
        placeholder: 'Message to log. Use {{variable}} for interpolation.',
        showIf: { actionType: 'log' }
      },
      // Set Variable
      {
        key: 'var_name',
        label: 'Variable Name',
        type: 'text',
        showIf: { actionType: 'set_variable' }
      },
      {
        key: 'var_value',
        label: 'Value',
        type: 'textarea',
        showIf: { actionType: 'set_variable' }
      },
      // Delay
      {
        key: 'delay_ms',
        label: 'Delay (milliseconds)',
        type: 'number',
        default: 1000,
        showIf: { actionType: 'delay' }
      }
    ];
  }

  static async execute(node, config, context, signal) {
    const actionType = config.actionType || 'log';
    
    switch (actionType) {
      case 'http_request':
        return await this.executeHttpRequest(config, context, signal);
      
      case 'javascript':
        return await this.executeJavaScript(config, context);
      
      case 'log':
        return this.executeLog(config, context);
      
      case 'set_variable':
        return this.executeSetVariable(config, context);
      
      case 'delay':
        return await this.executeDelay(config, signal);
      
      default:
        return { output: 'output_1', data: null };
    }
  }

  static async executeHttpRequest(config, context, signal) {
    const url = this.interpolate(config.http_url || '', context);
    
    if (!url) {
      return {
        output: 'output_2',
        error: 'URL is required',
        ok: false
      };
    }
    
    const method = config.http_method || 'GET';
    
    let headers = {};
    try {
      headers = typeof config.http_headers === 'string' 
        ? JSON.parse(config.http_headers) 
        : (config.http_headers || {});
      headers = this.interpolateObject(headers, context);
    } catch (e) {
      logger.warn('Invalid headers JSON:', e);
    }
    
    let body = null;
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        body = typeof config.http_body === 'string'
          ? config.http_body
          : JSON.stringify(config.http_body);
        body = this.interpolate(body, context);
      } catch (e) {
        logger.warn('Invalid body:', e);
      }
    }
    
    const fetchOptions = {
      method,
      headers,
      signal
    };
    
    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      fetchOptions.body = body;
    }
    
    try {
      const response = await fetch(url, fetchOptions);
      const responseHeaders = Object.fromEntries(response.headers.entries());
      
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
      
      return {
        output: response.ok ? 'output_1' : 'output_2',
        data,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        ok: response.ok
      };
    } catch (error) {
      // Handle fetch errors (network, CORS, etc.)
      return {
        output: 'output_2',
        error: error.message,
        errorType: error.name,
        ok: false
      };
    }
  }

  static async executeJavaScript(config, context) {
    const code = config.js_code || 'return null;';
    
    try {
      // Create a function with context available as 'ctx'
      const fn = new Function('ctx', `
        const { lastResult, lastNodeId, ...rest } = ctx;
        ${code}
      `);
      
      const result = await fn(context);
      
      return {
        output: 'output_1',
        data: result
      };
    } catch (error) {
      return {
        output: 'output_2',
        error: error.message
      };
    }
  }

  static executeLog(config, context) {
    const message = this.interpolate(config.log_message || '', context);
    logger.log('[Workflow Log]:', message);
    
    return {
      output: 'output_1',
      data: { message, timestamp: new Date().toISOString() }
    };
  }

  static executeSetVariable(config, context) {
    const name = config.var_name || 'variable';
    const value = this.interpolate(config.var_value || '', context);
    
    // Modify context directly
    context[name] = value;
    
    return {
      output: 'output_1',
      data: { [name]: value }
    };
  }

  static async executeDelay(config, signal) {
    const ms = parseInt(config.delay_ms) || 1000;
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, ms);
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Aborted'));
        });
      }
    });
    
    return {
      output: 'output_1',
      data: { delayed: ms }
    };
  }
}

/**
 * Condition Node Executor
 * Evaluates a condition and branches execution
 */
class ConditionExecutor extends BaseNodeExecutor {
  static getConfigSchema() {
    return [
      {
        key: 'conditionType',
        label: 'Condition Type',
        type: 'select',
        options: ['expression', 'compare', 'field', 'exists', 'javascript'],
        default: 'expression'
      },
      // Expression
      {
        key: 'expression',
        label: 'Expression',
        type: 'text',
        placeholder: '{{lastResult.status}} == 200',
        showIf: { conditionType: 'expression' }
      },
      // Compare
      {
        key: 'compare_left',
        label: 'Left Value',
        type: 'text',
        placeholder: '{{lastResult.value}}',
        showIf: { conditionType: 'compare' }
      },
      {
        key: 'compare_operator',
        label: 'Operator',
        type: 'select',
        options: ['==', '!=', '>', '<', '>=', '<=', 'contains', 'startsWith', 'endsWith'],
        default: '==',
        showIf: { conditionType: 'compare' }
      },
      {
        key: 'compare_right',
        label: 'Right Value',
        type: 'text',
        placeholder: 'expected value',
        showIf: { conditionType: 'compare' }
      },
      // Field (for checking data fields)
      {
        key: 'field',
        label: 'Field Name',
        type: 'text',
        placeholder: 'status',
        showIf: { conditionType: 'field' }
      },
      {
        key: 'operator',
        label: 'Operator',
        type: 'select',
        options: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'contains', 'not_contains', 'is_empty', 'is_not_empty'],
        default: 'equals',
        showIf: { conditionType: 'field' }
      },
      {
        key: 'value',
        label: 'Value',
        type: 'text',
        placeholder: 'expected value',
        showIf: { conditionType: 'field' }
      },
      // Exists
      {
        key: 'exists_path',
        label: 'Variable Path',
        type: 'text',
        placeholder: 'lastResult.data.id',
        showIf: { conditionType: 'exists' }
      },
      // JavaScript
      {
        key: 'js_condition',
        label: 'JavaScript Condition',
        type: 'code',
        language: 'javascript',
        placeholder: '// Return true or false\nreturn ctx.lastResult?.status === 200;',
        showIf: { conditionType: 'javascript' }
      }
    ];
  }

  static async execute(node, config, context, signal) {
    const conditionType = config.conditionType || 'expression';
    let result = false;
    
    try {
      switch (conditionType) {
        case 'expression':
          result = this.evaluateExpression(config.expression || '', context);
          break;
        
        case 'compare':
          result = this.evaluateCompare(config, context);
          break;
        
        case 'field':
          // Field comparison: check a field in lastResult or item
          result = this.evaluateFieldCondition(config, context);
          break;
        
        case 'exists':
          result = this.evaluateExists(config.exists_path || '', context);
          break;
        
        case 'javascript':
          result = await this.evaluateJavaScript(config.js_condition || '', context);
          break;
      }
    } catch (error) {
      logger.error('Condition evaluation error:', error);
      result = false;
    }
    
    return {
      output: result ? 'output_1' : 'output_2',
      branch: result ? 'true' : 'false',
      data: { condition: result }
    };
  }
  
  static evaluateFieldCondition(config, context) {
    const fieldPath = config.field || '';
    const operator = config.operator || 'equals';
    const value = config.value || '';
    
    // Get field value from context (check item first for loops, then lastResult)
    let fieldValue;
    if (context.item && this.getByPath({ item: context.item }, `item.${fieldPath}`) !== undefined) {
      fieldValue = this.getByPath({ item: context.item }, `item.${fieldPath}`);
    } else if (context.lastResult?.data) {
      fieldValue = this.getByPath(context.lastResult.data, fieldPath);
    } else {
      fieldValue = this.getByPath(context, fieldPath);
    }
    
    // Convert value for numeric comparisons
    const numFieldValue = parseFloat(fieldValue);
    const numValue = parseFloat(value);
    
    switch (operator) {
      case 'equals': return fieldValue == value;
      case 'not_equals': return fieldValue != value;
      case 'greater_than': return !isNaN(numFieldValue) && !isNaN(numValue) && numFieldValue > numValue;
      case 'less_than': return !isNaN(numFieldValue) && !isNaN(numValue) && numFieldValue < numValue;
      case 'greater_equal': return !isNaN(numFieldValue) && !isNaN(numValue) && numFieldValue >= numValue;
      case 'less_equal': return !isNaN(numFieldValue) && !isNaN(numValue) && numFieldValue <= numValue;
      case 'contains': return String(fieldValue).includes(String(value));
      case 'not_contains': return !String(fieldValue).includes(String(value));
      case 'is_empty': return !fieldValue || fieldValue === '' || (Array.isArray(fieldValue) && fieldValue.length === 0);
      case 'is_not_empty': return fieldValue && fieldValue !== '' && (!Array.isArray(fieldValue) || fieldValue.length > 0);
      default: return fieldValue == value;
    }
  }

  static evaluateExpression(expression, context) {
    const interpolated = this.interpolate(expression, context);
    
    try {
      // Simple expression evaluation
      // WARNING: This uses eval - in production, use a proper expression parser
      return Boolean(eval(interpolated));
    } catch (e) {
      logger.warn('Expression evaluation failed:', e);
      return false;
    }
  }

  static evaluateCompare(config, context) {
    const left = this.interpolate(config.compare_left || '', context);
    const right = this.interpolate(config.compare_right || '', context);
    const op = config.compare_operator || '==';
    
    switch (op) {
      case '==': return left == right;
      case '!=': return left != right;
      case '>': return parseFloat(left) > parseFloat(right);
      case '<': return parseFloat(left) < parseFloat(right);
      case '>=': return parseFloat(left) >= parseFloat(right);
      case '<=': return parseFloat(left) <= parseFloat(right);
      case 'contains': return String(left).includes(String(right));
      case 'startsWith': return String(left).startsWith(String(right));
      case 'endsWith': return String(left).endsWith(String(right));
      default: return false;
    }
  }

  static evaluateExists(path, context) {
    const parts = path.split('.');
    let value = context;
    
    for (const part of parts) {
      if (value === undefined || value === null) return false;
      value = value[part];
    }
    
    return value !== undefined && value !== null;
  }

  static async evaluateJavaScript(code, context) {
    try {
      const fn = new Function('ctx', code);
      return Boolean(await fn(context));
    } catch (e) {
      logger.warn('JavaScript condition failed:', e);
      return false;
    }
  }
}

/**
 * Loop Node Executor
 * Iterates over an array
 */
class LoopExecutor extends BaseNodeExecutor {
  static getConfigSchema() {
    return [
      {
        key: 'source',
        label: 'Array Source',
        type: 'text',
        placeholder: '{{lastResult.items}}',
        default: '{{lastResult}}'
      },
      {
        key: 'itemVariable',
        label: 'Item Variable Name',
        type: 'text',
        default: 'item'
      },
      {
        key: 'indexVariable',
        label: 'Index Variable Name',
        type: 'text',
        default: 'index'
      }
    ];
  }

  static async execute(node, config, context, signal) {
    // Note: Full loop implementation requires special handling in executor
    // This returns the array for the workflow executor to iterate
    // Support both 'source' and 'arrayPath' config fields
    let sourcePath = config.source || config.arrayPath || '{{lastResult}}';
    
    logger.debug('[LoopExecutor] source path:', sourcePath, 'lastResult:', context.lastResult);
    
    // If it's a plain path without {{}} template, treat it as a context path
    // e.g., 'data' becomes lookup of context.data or context.lastResult.data
    let items = [];
    
    if (!sourcePath.includes('{{')) {
      // Plain path - try direct lookup first, then lastResult.path, then lastResult.data.path
      items = this.getByPath(context, sourcePath) || 
              this.getByPath(context, `lastResult.${sourcePath}`) ||
              this.getByPath(context, `lastResult.data.${sourcePath}`) ||
              context.lastResult?.data ||
              context.lastResult;
    } else {
      // Template path - interpolate and parse
      const source = this.interpolate(sourcePath, context);
      logger.debug('[LoopExecutor] interpolated source:', source, 'type:', typeof source);
      try {
        items = typeof source === 'string' ? JSON.parse(source) : source;
      } catch (e) {
        items = source;
      }
    }
    
    logger.debug('[LoopExecutor] items before object check:', items, 'isArray:', Array.isArray(items));
    
    // If items is an object with a 'data' property that's an array, use that
    if (items && typeof items === 'object' && !Array.isArray(items)) {
      if (Array.isArray(items.data)) {
        items = items.data;
      } else if (items.data && typeof items.data === 'object') {
        // If data is an object, try to extract array from it
        const dataKeys = Object.keys(items.data);
        if (dataKeys.length === 1 && Array.isArray(items.data[dataKeys[0]])) {
          items = items.data[dataKeys[0]];
        }
      }
    }
    
    // Ensure items is an array
    if (!Array.isArray(items)) items = items ? [items] : [];
    
    logger.debug('[LoopExecutor] final items:', items.length, 'first:', items[0]);
    
    return {
      output: 'output_1',
      data: items,
      isLoop: true,
      itemVariable: config.itemVariable || 'item',
      indexVariable: config.indexVariable || 'index'
    };
  }
}

/**
 * Transform Node Executor
 * Transforms data using mapping or JavaScript
 */
class TransformExecutor extends BaseNodeExecutor {
  static getConfigSchema() {
    return [
      {
        key: 'transformType',
        label: 'Transform Type',
        type: 'select',
        options: ['javascript', 'json_path', 'template'],
        default: 'javascript'
      },
      {
        key: 'js_transform',
        label: 'JavaScript Transform',
        type: 'code',
        language: 'javascript',
        placeholder: '// Transform data\nreturn ctx.lastResult.data.map(item => item.name);',
        showIf: { transformType: 'javascript' }
      },
      {
        key: 'json_path',
        label: 'JSON Path',
        type: 'text',
        placeholder: 'lastResult.data.items[0].name',
        showIf: { transformType: 'json_path' }
      },
      {
        key: 'template',
        label: 'Output Template (JSON)',
        type: 'json',
        placeholder: '{"name": "{{lastResult.name}}", "id": "{{lastResult.id}}"}',
        showIf: { transformType: 'template' }
      }
    ];
  }

  static async execute(node, config, context, signal) {
    const transformType = config.transformType || 'javascript';
    
    logger.debug('[TransformExecutor] type:', transformType, 'lastResult:', context.lastResult);
    
    try {
      let result;
      
      switch (transformType) {
        case 'javascript':
          // Support both 'code' and 'js_transform' field names
          const jsCode = config.code || config.js_transform || 'return ctx.lastResult;';
          const fn = new Function('ctx', 'data', jsCode);
          result = await fn(context, context.lastResult?.data);
          break;
        
        case 'json_path':
          result = this.getByPath(context, config.json_path || 'lastResult');
          break;
        
        case 'template':
          let template = config.template || '{}';
          if (typeof template === 'string') {
            template = JSON.parse(template);
          }
          result = this.interpolateObject(template, context);
          break;
      }
      
      return {
        output: 'output_1',
        data: result
      };
    } catch (error) {
      // Transform only has 1 output, so error still goes to output_1
      // but we include the error info in the result
      return {
        output: 'output_1',
        data: context.lastResult?.data || null,
        error: error.message
      };
    }
  }

  static getByPath(obj, path) {
    const parts = path.split('.');
    let value = obj;
    
    for (const part of parts) {
      // Handle array notation like items[0]
      const match = part.match(/^(\w+)\[(\d+)\]$/);
      if (match) {
        value = value[match[1]][parseInt(match[2])];
      } else {
        value = value[part];
      }
      if (value === undefined) return undefined;
    }
    
    return value;
  }
}

/**
 * End Node Executor
 * Marks end of workflow, can return final result
 */
class EndExecutor extends BaseNodeExecutor {
  static getConfigSchema() {
    return [
      {
        key: 'returnValue',
        label: 'Return Value',
        type: 'textarea',
        placeholder: '{{lastResult}}',
        default: '{{lastResult}}'
      },
      {
        key: 'status',
        label: 'Final Status',
        type: 'select',
        options: ['success', 'error', 'custom'],
        default: 'success'
      }
    ];
  }

  static async execute(node, config, context, signal) {
    const returnValue = this.interpolate(config.returnValue || '{{lastResult}}', context);
    
    return {
      output: null, // End node has no output
      data: returnValue,
      status: config.status || 'success',
      isEnd: true
    };
  }
}

/**
 * Generic/Custom Node Executor
 * For any node type not specifically handled
 */
class GenericExecutor extends BaseNodeExecutor {
  static getConfigSchema() {
    return [
      {
        key: 'label',
        label: 'Label',
        type: 'text',
        placeholder: 'Node label...'
      },
      {
        key: 'description',
        label: 'Description',
        type: 'textarea',
        placeholder: 'Description of what this node does...'
      },
      {
        key: 'custom_data',
        label: 'Custom Data (JSON)',
        type: 'json',
        default: '{}',
        placeholder: '{"key": "value"}'
      },
      {
        key: 'pass_through',
        label: 'Pass Through Input',
        type: 'checkbox',
        default: true
      }
    ];
  }

  static async execute(node, config, context, signal) {
    let customData = {};
    try {
      customData = typeof config.custom_data === 'string'
        ? JSON.parse(config.custom_data)
        : (config.custom_data || {});
      customData = this.interpolateObject(customData, context);
    } catch (e) {
      // Invalid JSON, use empty object
    }
    
    // If pass_through is enabled, merge with last result
    const data = config.pass_through 
      ? { ...context.lastResult?.data, ...customData }
      : customData;
    
    return {
      output: 'output_1',
      data,
      label: config.label || node.name,
      nodeType: node.name
    };
  }
}

/**
 * Email Node Executor
 * Sends emails (simulated - logs to console)
 */
class EmailExecutor extends BaseNodeExecutor {
  static getConfigSchema() {
    return [
      {
        key: 'to',
        label: 'To (Email)',
        type: 'text',
        placeholder: 'recipient@example.com'
      },
      {
        key: 'cc',
        label: 'CC',
        type: 'text',
        placeholder: 'cc@example.com'
      },
      {
        key: 'subject',
        label: 'Subject',
        type: 'text',
        placeholder: 'Email subject...'
      },
      {
        key: 'body',
        label: 'Body',
        type: 'textarea',
        placeholder: 'Email body. Use {{variable}} for dynamic values.'
      },
      {
        key: 'isHtml',
        label: 'HTML Body',
        type: 'checkbox',
        default: false
      }
    ];
  }

  static async execute(node, config, context, signal) {
    const to = this.interpolate(config.to || '', context);
    const cc = this.interpolate(config.cc || '', context);
    const subject = this.interpolate(config.subject || '', context);
    const body = this.interpolate(config.body || '', context);
    
    // Simulate sending email (in real impl, use email service)
    logger.debug('[Email]:', { to, cc, subject, bodyLength: body.length });
    
    return {
      output: 'output_1',
      data: {
        to, cc, subject, body,
        sent: true,
        sentAt: new Date().toISOString()
      }
    };
  }
}

/**
 * Delay Node Executor
 * Waits for specified time
 */
class DelayExecutor extends BaseNodeExecutor {
  static getConfigSchema() {
    return [
      {
        key: 'delayType',
        label: 'Delay Type',
        type: 'select',
        options: ['seconds', 'minutes', 'hours', 'until_time'],
        default: 'seconds'
      },
      {
        key: 'seconds',
        label: 'Seconds',
        type: 'number',
        default: 5,
        showIf: { delayType: 'seconds' }
      },
      {
        key: 'minutes',
        label: 'Minutes',
        type: 'number',
        default: 1,
        showIf: { delayType: 'minutes' }
      },
      {
        key: 'hours',
        label: 'Hours',
        type: 'number',
        default: 1,
        showIf: { delayType: 'hours' }
      },
      {
        key: 'until_time',
        label: 'Wait Until (ISO time)',
        type: 'text',
        placeholder: '2024-12-31T23:59:59Z',
        showIf: { delayType: 'until_time' }
      }
    ];
  }

  static async execute(node, config, context, signal) {
    const delayType = config.delayType || 'seconds';
    let ms = 0;
    
    switch (delayType) {
      case 'seconds':
        ms = (parseInt(config.seconds) || 5) * 1000;
        break;
      case 'minutes':
        ms = (parseInt(config.minutes) || 1) * 60 * 1000;
        break;
      case 'hours':
        ms = (parseInt(config.hours) || 1) * 60 * 60 * 1000;
        break;
      case 'until_time':
        const targetTime = new Date(config.until_time).getTime();
        ms = Math.max(0, targetTime - Date.now());
        break;
    }
    
    // Cap at 1 hour for safety in demo
    ms = Math.min(ms, 3600000);
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, ms);
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Aborted'));
        });
      }
    });
    
    return {
      output: 'output_1',
      data: {
        delayed: ms,
        delayType,
        completedAt: new Date().toISOString()
      }
    };
  }
}

/**
 * HTTP Node Executor
 * Makes HTTP requests
 */
class HttpExecutor extends BaseNodeExecutor {
  static getConfigSchema() {
    return [
      {
        key: 'method',
        label: 'HTTP Method',
        type: 'select',
        options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
        default: 'GET'
      },
      {
        key: 'url',
        label: 'URL',
        type: 'text',
        placeholder: 'https://api.example.com/endpoint'
      },
      {
        key: 'headers',
        label: 'Headers (JSON)',
        type: 'json',
        default: '{"Content-Type": "application/json"}'
      },
      {
        key: 'body',
        label: 'Request Body (JSON)',
        type: 'json',
        default: '{}'
      },
      {
        key: 'timeout_seconds',
        label: 'Timeout (seconds)',
        type: 'number',
        default: 30
      },
      {
        key: 'ignore_errors',
        label: 'Continue on Error',
        type: 'checkbox',
        default: false
      }
    ];
  }

  static async execute(node, config, context, signal) {
    const url = this.interpolate(config.url || '', context);
    
    if (!url) {
      return { output: 'output_2', error: 'URL is required', ok: false };
    }
    
    const method = config.method || 'GET';
    
    let headers = {};
    try {
      headers = typeof config.headers === 'string' 
        ? JSON.parse(config.headers) 
        : (config.headers || {});
      headers = this.interpolateObject(headers, context);
    } catch (e) {}
    
    let body = null;
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        body = typeof config.body === 'string' ? config.body : JSON.stringify(config.body);
        body = this.interpolate(body, context);
      } catch (e) {}
    }
    
    // Set up timeout
    const timeoutMs = (parseInt(config.timeout_seconds) || parseInt(config.timeout) || 30) * 1000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    // Combine with parent signal if provided
    const combinedSignal = signal 
      ? { signal: controller.signal }  // Use our timeout signal
      : { signal: controller.signal };
    
    // If parent signal aborts, also abort our controller
    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }
    
    try {
      const response = await fetch(url, { method, headers, body, ...combinedSignal });
      clearTimeout(timeoutId);
      
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
      
      // Extract response headers
      const responseHeaders = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      
      return {
        output: response.ok ? 'output_1' : 'output_2',
        data,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: responseHeaders,
        url: response.url,  // Final URL after redirects
        request: { method, url, headers, body }  // Echo request for debugging
      };
    } catch (error) {
      clearTimeout(timeoutId);
      const isTimeout = error.name === 'AbortError' && !signal?.aborted;
      const errorMessage = isTimeout ? `Request timed out after ${timeoutMs/1000}s` : error.message;
      
      if (config.ignore_errors) {
        return { output: 'output_1', data: null, error: errorMessage, timedOut: isTimeout };
      }
      return { output: 'output_2', error: errorMessage, ok: false, timedOut: isTimeout, request: { method, url, headers, body } };
    }
  }
}

/**
 * API Node Executor
 * For REST API calls with more options
 */
class ApiExecutor extends HttpExecutor {
  static getConfigSchema() {
    return [
      {
        key: 'base_url',
        label: 'Base URL',
        type: 'text',
        placeholder: 'https://api.example.com'
      },
      {
        key: 'endpoint',
        label: 'Endpoint',
        type: 'text',
        placeholder: '/users/{{userId}}'
      },
      {
        key: 'method',
        label: 'Method',
        type: 'select',
        options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        default: 'GET'
      },
      {
        key: 'auth_type',
        label: 'Authentication',
        type: 'select',
        options: ['none', 'bearer', 'basic', 'api_key'],
        default: 'none'
      },
      {
        key: 'auth_token',
        label: 'Bearer Token',
        type: 'text',
        showIf: { auth_type: 'bearer' }
      },
      {
        key: 'auth_username',
        label: 'Username',
        type: 'text',
        showIf: { auth_type: 'basic' }
      },
      {
        key: 'auth_password',
        label: 'Password',
        type: 'text',
        showIf: { auth_type: 'basic' }
      },
      {
        key: 'api_key_header',
        label: 'API Key Header',
        type: 'text',
        placeholder: 'X-API-Key',
        showIf: { auth_type: 'api_key' }
      },
      {
        key: 'api_key_value',
        label: 'API Key Value',
        type: 'text',
        showIf: { auth_type: 'api_key' }
      },
      {
        key: 'headers',
        label: 'Additional Headers (JSON)',
        type: 'json',
        default: '{}'
      },
      {
        key: 'body',
        label: 'Request Body (JSON)',
        type: 'json',
        default: '{}'
      }
    ];
  }

  static async execute(node, config, context, signal) {
    const baseUrl = this.interpolate(config.base_url || '', context);
    const endpoint = this.interpolate(config.endpoint || '', context);
    const url = baseUrl + endpoint;
    
    let headers = {};
    try {
      headers = typeof config.headers === 'string' 
        ? JSON.parse(config.headers) 
        : (config.headers || {});
      headers = this.interpolateObject(headers, context);
    } catch (e) {}
    
    // Add authentication
    const authType = config.auth_type || 'none';
    switch (authType) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${this.interpolate(config.auth_token || '', context)}`;
        break;
      case 'basic':
        const credentials = btoa(`${config.auth_username}:${config.auth_password}`);
        headers['Authorization'] = `Basic ${credentials}`;
        break;
      case 'api_key':
        const keyHeader = config.api_key_header || 'X-API-Key';
        headers[keyHeader] = this.interpolate(config.api_key_value || '', context);
        break;
    }
    
    // Delegate to parent HttpExecutor
    return super.execute(node, { ...config, url, headers }, context, signal);
  }
}

/**
 * Slack Node Executor
 * Sends Slack messages
 */
class SlackExecutor extends BaseNodeExecutor {
  static getConfigSchema() {
    return [
      {
        key: 'webhook_url',
        label: 'Webhook URL',
        type: 'text',
        placeholder: 'https://hooks.slack.com/services/...'
      },
      {
        key: 'channel',
        label: 'Channel',
        type: 'text',
        placeholder: '#general'
      },
      {
        key: 'message',
        label: 'Message',
        type: 'textarea',
        placeholder: 'Hello from workflow! {{lastResult.data}}'
      },
      {
        key: 'username',
        label: 'Bot Username',
        type: 'text',
        default: 'Workflow Bot'
      },
      {
        key: 'icon_emoji',
        label: 'Icon Emoji',
        type: 'text',
        default: ':robot_face:'
      }
    ];
  }

  static async execute(node, config, context, signal) {
    const webhookUrl = config.webhook_url;
    const message = this.interpolate(config.message || '', context);
    
    const payload = {
      channel: config.channel,
      text: message,
      username: config.username || 'Workflow Bot',
      icon_emoji: config.icon_emoji || ':robot_face:'
    };
    
    // Simulate Slack message (in real impl, POST to webhook)
    logger.debug('[Slack]:', payload);
    
    return {
      output: 'output_1',
      data: {
        channel: config.channel,
        message,
        sent: true,
        sentAt: new Date().toISOString()
      }
    };
  }
}

/**
 * Database Node Executor
 * Executes database queries (simulated)
 */
class DatabaseExecutor extends BaseNodeExecutor {
  static getConfigSchema() {
    return [
      {
        key: 'db_type',
        label: 'Database Type',
        type: 'select',
        options: ['mysql', 'postgresql', 'mongodb', 'sqlite'],
        default: 'postgresql'
      },
      {
        key: 'connection_string',
        label: 'Connection String',
        type: 'text',
        placeholder: 'postgresql://user:pass@localhost:5432/db'
      },
      {
        key: 'operation',
        label: 'Operation',
        type: 'select',
        options: ['query', 'insert', 'update', 'delete'],
        default: 'query'
      },
      {
        key: 'table',
        label: 'Table / Collection',
        type: 'text',
        placeholder: 'users'
      },
      {
        key: 'query',
        label: 'Query (for query operation)',
        type: 'textarea',
        placeholder: 'SELECT * FROM users WHERE id = {{userId}}',
        showIf: { operation: 'query' }
      },
      {
        key: 'data',
        label: 'Data (JSON)',
        type: 'json',
        default: '{}',
        placeholder: '{{item}}'
      },
      {
        key: 'params',
        label: 'Parameters (JSON)',
        type: 'json',
        default: '[]'
      }
    ];
  }

  static async execute(node, config, context, signal) {
    const operation = config.operation || 'query';
    const table = this.interpolate(config.table || '', context);
    const query = this.interpolate(config.query || '', context);
    
    // Parse and interpolate data
    let data = {};
    try {
      const dataStr = this.interpolate(config.data || '{}', context);
      data = typeof dataStr === 'string' ? JSON.parse(dataStr) : dataStr;
    } catch (e) {
      data = config.data || {};
    }
    
    // Simulate database operation
    // In production, this would connect to actual database
    logger.debug(`[Database] ${operation.toUpperCase()} on ${table || 'table'}:`, { query, data });
    
    // Return simulated result based on operation
    const result = {
      operation,
      table,
      executedAt: new Date().toISOString()
    };
    
    switch (operation) {
      case 'insert':
        result.inserted = data;
        result.insertedId = Math.floor(Math.random() * 10000);
        break;
      case 'update':
        result.updated = data;
        result.affectedRows = 1;
        break;
      case 'delete':
        result.affectedRows = 1;
        break;
      case 'query':
      default:
        result.query = query;
        result.rows = [];
        result.rowCount = 0;
        break;
    }
    
    return {
      output: 'output_1',
      data: result
    };
  }
}

/**
 * Code Node Executor
 * Executes custom JavaScript code
 */
class CodeExecutor extends BaseNodeExecutor {
  static getConfigSchema() {
    return [
      {
        key: 'language',
        label: 'Language',
        type: 'select',
        options: ['javascript', 'python'],
        default: 'javascript'
      },
      {
        key: 'code',
        label: 'Code',
        type: 'code',
        language: 'javascript',
        placeholder: '// Access context via `ctx`\n// Access lastResult via `ctx.lastResult`\nconst data = ctx.lastResult?.data;\nreturn data;'
      }
    ];
  }

  static async execute(node, config, context, signal) {
    if (config.language !== 'javascript') {
      return {
        output: 'output_2',
        error: 'Only JavaScript is supported in browser'
      };
    }
    
    try {
      const fn = new Function('ctx', config.code || 'return null;');
      const result = await fn(context);
      
      return {
        output: 'output_1',
        data: result
      };
    } catch (error) {
      return {
        output: 'output_2',
        error: error.message
      };
    }
  }
}

/**
 * Filter Node Executor
 * Filters arrays based on conditions
 */
class FilterExecutor extends BaseNodeExecutor {
  static getConfigSchema() {
    return [
      {
        key: 'source',
        label: 'Array Source',
        type: 'text',
        placeholder: '{{lastResult.data}}',
        default: '{{lastResult}}'
      },
      {
        key: 'filter_type',
        label: 'Filter Type',
        type: 'select',
        options: ['javascript', 'property_match'],
        default: 'property_match'
      },
      {
        key: 'property',
        label: 'Property Name',
        type: 'text',
        placeholder: 'status',
        showIf: { filter_type: 'property_match' }
      },
      {
        key: 'operator',
        label: 'Operator',
        type: 'select',
        options: ['==', '!=', '>', '<', '>=', '<=', 'contains', 'exists'],
        default: '==',
        showIf: { filter_type: 'property_match' }
      },
      {
        key: 'value',
        label: 'Value',
        type: 'text',
        showIf: { filter_type: 'property_match' }
      },
      {
        key: 'filter_code',
        label: 'Filter Function',
        type: 'code',
        placeholder: '// item is each element\nreturn item.active === true;',
        showIf: { filter_type: 'javascript' }
      }
    ];
  }

  static async execute(node, config, context, signal) {
    // Default to lastResult.data since that's where actual data is stored
    let source = this.interpolate(config.source || '{{lastResult.data}}', context);
    
    logger.debug('[FilterExecutor] raw source:', source, 'type:', typeof source);
    
    try {
      if (typeof source === 'string') source = JSON.parse(source);
      if (!Array.isArray(source)) source = [source];
    } catch (e) {
      source = [source];
    }
    
    logger.debug('[FilterExecutor] parsed source length:', source.length);
    
    let filtered;
    
    // Support both field naming conventions
    const filterType = config.filter_type || config.filterType || 'property_match';
    const filterCode = config.filter_code || config.code || 'return true;';
    
    if (filterType === 'javascript') {
      const fn = new Function('item', 'index', 'data', filterCode);
      filtered = source.filter((item, index) => fn(item, index, source));
    } else {
      const property = config.property || config.field;
      const operator = config.operator || '==';
      const value = config.value;
      
      filtered = source.filter(item => {
        const itemValue = this.getNestedValue(item, property);
        switch (operator) {
          case '==':
          case 'equals': return itemValue == value;
          case '!=':
          case 'not_equals': return itemValue != value;
          case '>':
          case 'greater_than': return itemValue > value;
          case '<':
          case 'less_than': return itemValue < value;
          case '>=': return itemValue >= value;
          case '<=': return itemValue <= value;
          case 'contains': return String(itemValue).includes(value);
          case 'exists':
          case 'not_empty': return itemValue !== undefined && itemValue !== null && itemValue !== '';
          default: return true;
        }
      });
    }
    
    return {
      output: 'output_1',
      data: filtered,
      originalCount: source.length,
      filteredCount: filtered.length
    };
  }
  
  static getNestedValue(obj, path) {
    if (!path) return obj;
    return path.split('.').reduce((curr, key) => curr?.[key], obj);
  }
}

/**
 * Webhook Node Executor
 * Registers/handles webhooks
 */
class WebhookExecutor extends BaseNodeExecutor {
  static getConfigSchema() {
    return [
      {
        key: 'webhook_type',
        label: 'Webhook Type',
        type: 'select',
        options: ['receive', 'send'],
        default: 'send'
      },
      {
        key: 'url',
        label: 'Webhook URL',
        type: 'text',
        placeholder: 'https://example.com/webhook'
      },
      {
        key: 'method',
        label: 'HTTP Method',
        type: 'select',
        options: ['POST', 'GET', 'PUT'],
        default: 'POST',
        showIf: { webhook_type: 'send' }
      },
      {
        key: 'payload',
        label: 'Payload (JSON)',
        type: 'json',
        default: '{{lastResult}}',
        showIf: { webhook_type: 'send' }
      },
      {
        key: 'headers',
        label: 'Headers (JSON)',
        type: 'json',
        default: '{}',
        showIf: { webhook_type: 'send' }
      }
    ];
  }

  static async execute(node, config, context, signal) {
    if (config.webhook_type === 'receive') {
      // In a real implementation, this would set up a webhook listener
      return {
        output: 'output_1',
        data: {
          type: 'webhook_registered',
          url: config.url
        }
      };
    }
    
    // Send webhook
    const url = this.interpolate(config.url || '', context);
    let payload = config.payload || '{}';
    payload = this.interpolate(payload, context);
    
    try {
      if (typeof payload === 'string') payload = JSON.parse(payload);
    } catch (e) {}
    
    let headers = config.headers || {};
    try {
      if (typeof headers === 'string') headers = JSON.parse(headers);
      headers = this.interpolateObject(headers, context);
    } catch (e) {}
    
    try {
      const response = await fetch(url, {
        method: config.method || 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(payload),
        signal
      });
      
      return {
        output: 'output_1',
        data: await response.json().catch(() => response.text()),
        status: response.status
      };
    } catch (error) {
      return {
        output: 'output_2',
        error: error.message
      };
    }
  }
}

/**
 * API Data Node Executor
 * Fetches data from API and stores in localStorage with visual preview in node
 */
class ApiDataExecutor extends BaseNodeExecutor {
  static getConfigSchema() {
    return [
      {
        key: 'url',
        label: 'API URL',
        type: 'text',
        placeholder: 'https://api.example.com/data'
      },
      {
        key: 'method',
        label: 'HTTP Method',
        type: 'select',
        options: ['GET', 'POST'],
        default: 'GET'
      },
      {
        key: 'headers',
        label: 'Headers (JSON)',
        type: 'json',
        default: '{"Content-Type": "application/json"}'
      },
      {
        key: 'body',
        label: 'Request Body (JSON)',
        type: 'json',
        default: '{}'
      },
      {
        key: 'storageKey',
        label: 'LocalStorage Key',
        type: 'text',
        default: 'api_data',
        placeholder: 'unique_storage_key'
      },
      {
        key: 'autoFetch',
        label: 'Auto-fetch on load',
        type: 'checkbox',
        default: false
      },
      {
        key: 'showPreview',
        label: 'Show data preview in node',
        type: 'checkbox',
        default: true
      },
      {
        key: 'previewMaxLength',
        label: 'Preview max characters',
        type: 'number',
        default: 200
      }
    ];
  }

  static async execute(node, config, context, signal) {
    const url = this.interpolate(config.url || '', context);
    const storageKey = config.storageKey || `api_data_${node.id}`;
    
    if (!url) {
      return { 
        output: 'output_2', 
        error: 'API URL is required', 
        ok: false,
        storageKey 
      };
    }
    
    const method = config.method || 'GET';
    
    let headers = {};
    try {
      headers = typeof config.headers === 'string' 
        ? JSON.parse(config.headers) 
        : (config.headers || {});
      headers = this.interpolateObject(headers, context);
    } catch (e) {}
    
    let body = null;
    if (method === 'POST') {
      try {
        body = typeof config.body === 'string' ? config.body : JSON.stringify(config.body);
        body = this.interpolate(body, context);
      } catch (e) {}
    }
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      if (signal) {
        signal.addEventListener('abort', () => controller.abort());
      }
      
      const response = await fetch(url, { 
        method, 
        headers, 
        body,
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
      
      // Store in localStorage
      const storageData = {
        data,
        fetchedAt: new Date().toISOString(),
        url,
        status: response.status
      };
      
      try {
        localStorage.setItem(storageKey, JSON.stringify(storageData));
      } catch (e) {
        console.warn('[ApiData] Failed to save to localStorage:', e.message);
      }
      
      return {
        output: response.ok ? 'output_1' : 'output_2',
        data,
        storageKey,
        status: response.status,
        ok: response.ok,
        cached: false,
        fetchedAt: storageData.fetchedAt
      };
    } catch (error) {
      // Try to return cached data if available
      try {
        const cached = localStorage.getItem(storageKey);
        if (cached) {
          const cachedData = JSON.parse(cached);
          return {
            output: 'output_1',
            data: cachedData.data,
            storageKey,
            cached: true,
            cachedAt: cachedData.fetchedAt,
            error: error.message
          };
        }
      } catch (e) {}
      
      return { 
        output: 'output_2', 
        error: error.message, 
        ok: false,
        storageKey 
      };
    }
  }
  
  /**
   * Get stored data from localStorage
   */
  static getStoredData(storageKey) {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}
    return null;
  }
  
  /**
   * Clear stored data
   */
  static clearStoredData(storageKey) {
    try {
      localStorage.removeItem(storageKey);
      return true;
    } catch (e) {
      return false;
    }
  }
}

/**
 * Node Executor Registry
 * Maps node types to their executors
 */
export class NodeExecutorRegistry {
  static executors = {
    // Core nodes
    'trigger': TriggerExecutor,
    'action': ActionExecutor,
    'condition': ConditionExecutor,
    'loop': LoopExecutor,
    'transform': TransformExecutor,
    'end': EndExecutor,
    
    // Communication nodes
    'email': EmailExecutor,
    'slack': SlackExecutor,
    'notification': SlackExecutor,
    
    // Time/delay nodes
    'delay': DelayExecutor,
    'schedule': TriggerExecutor,
    
    // HTTP/API nodes
    'http': HttpExecutor,
    'api': ApiExecutor,
    'api_data': ApiDataExecutor,
    'webhook': WebhookExecutor,
    
    // Database nodes
    'database': DatabaseExecutor,
    'mongodb': DatabaseExecutor,
    'redis': DatabaseExecutor,
    'data': DatabaseExecutor,
    
    // Code execution
    'code': CodeExecutor,
    'nodejs': CodeExecutor,
    'python': CodeExecutor,
    'subprocess': CodeExecutor,
    
    // Data nodes
    'filter': FilterExecutor,
    'merge': TransformExecutor,
    'json': TransformExecutor,
    
    // Cloud/DevOps nodes - use GenericExecutor with proper schema
    'aws': ActionExecutor,
    'lambda': ActionExecutor,
    's3': ActionExecutor,
    'docker': ActionExecutor,
    'kubernetes': ActionExecutor,
    'github': ActionExecutor,
    'cloud': ActionExecutor,
    'server': ActionExecutor,
    
    // Utility nodes
    'file': ActionExecutor,
    'folder': ActionExecutor,
    'download': ActionExecutor,
    'upload': ActionExecutor,
    'search': ActionExecutor,
    'link': ActionExecutor,
    'settings': GenericExecutor,
    'note': GenericExecutor,
    
    // Visual/Shape nodes - pass through
    'image': GenericExecutor,
    'svg': GenericExecutor,
    'icon': GenericExecutor,
    'circle': GenericExecutor,
    'square': GenericExecutor,
    'diamond': ConditionExecutor,
    'hexagon': GenericExecutor,
    'triangle': GenericExecutor,
    'star': GenericExecutor,
    'heart': GenericExecutor,
    
    // Status/Action nodes
    'success': EndExecutor,
    'error': EndExecutor,
    'warning': GenericExecutor,
    'info': GenericExecutor,
    'user': GenericExecutor,
    'users': GenericExecutor,
    'trash': ActionExecutor,
    'edit': ActionExecutor,
    'copy': ActionExecutor,
    'refresh': ActionExecutor,
    
    // Process nodes
    'process': ActionExecutor,
    'decision': ConditionExecutor,
    'document': GenericExecutor,
    'connector': GenericExecutor,
    
    // Aliases
    'start': TriggerExecutor,
    'stop': EndExecutor,
    'if': ConditionExecutor,
    'switch': ConditionExecutor,
    'foreach': LoopExecutor,
    'map': TransformExecutor,
    'output': EndExecutor,
    'return': EndExecutor
  };

  /**
   * Get executor for a node type
   */
  static getExecutor(nodeType) {
    return this.executors[nodeType] || GenericExecutor;
  }

  /**
   * Register a custom executor
   */
  static register(nodeType, executor) {
    this.executors[nodeType] = executor;
  }

  /**
   * Get config schema for a node type
   */
  static getConfigSchema(nodeType) {
    const executor = this.getExecutor(nodeType);
    return executor.getConfigSchema();
  }

  /**
   * Get all registered node types
   */
  static getNodeTypes() {
    return Object.keys(this.executors);
  }
}

// Export individual executors for extension
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
