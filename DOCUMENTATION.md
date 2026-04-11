# FlowKit - Visual Workflow Builder

## Complete Documentation

FlowKit is a powerful visual workflow builder and execution engine that allows you to create, edit, and run workflows through a drag-and-drop interface.

---

## Table of Contents

1. [Installation & Quick Start](#installation--quick-start)
2. [WorkflowBuilder - Core API](#workflowbuilder---core-api)
3. [Node Types](#node-types)
4. [Node Executors](#node-executors)
5. [WorkflowExecutor - Execution Engine](#workflowexecutor---execution-engine)
6. [Keyboard Shortcuts](#keyboard-shortcuts)
7. [Variable Interpolation](#variable-interpolation)
8. [Events & Callbacks](#events--callbacks)
9. [Configuration Options](#configuration-options)
10. [Export/Import Formats](#exportimport-formats)
11. [Custom Nodes](#custom-nodes)
12. [Examples](#examples)

---

## Installation & Quick Start

### NPM Installation
```bash
npm install flowkit
```

### Basic Usage
```javascript
import { WorkflowBuilder } from 'flowkit';

const container = document.getElementById('workflow-container');
const builder = new WorkflowBuilder(container, {
  theme: 'dark',
  background: 'dots',
  minimap: true
});

// Add nodes
builder.addNode('trigger', 100, 100, { label: 'Start' });
builder.addNode('action', 300, 100, { label: 'Process' });

// Connect nodes
builder.connect('1', '2');

// Run workflow
await builder.runWorkflow();
```

### Exports Available
```javascript
import {
  // Core Classes
  WorkflowBuilder,
  WorkflowExecutor,
  NodeRegistry,
  NodeExecutorRegistry,
  
  // Executor Classes
  BaseNodeExecutor,
  TriggerExecutor,
  ActionExecutor,
  ConditionExecutor,
  LoopExecutor,
  TransformExecutor,
  EndExecutor,
  GenericExecutor,
  
  // Utilities
  defaultNodeTypes,
  icons,
  validateWorkflow,
  getNodesFromWorkflow,
  getConnectionCount,
  findDisconnectedNodes,
  workflowToMermaid,
  cloneWorkflow,
  generateWorkflowId,
  createWorkflowMetadata,
  extractWorkflowData,
  
  // Helpers
  createNodeDefinition,
  createCustomExecutor
} from 'flowkit';
```

---

## WorkflowBuilder - Core API

### Constructor

```javascript
new WorkflowBuilder(container, options)
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `theme` | `'light' \| 'dark'` | `'light'` | Color theme |
| `mode` | `'edit' \| 'view'` | `'edit'` | Edit or view-only mode |
| `nodes` | `string[]` | All nodes | Array of node types to show |
| `customNodes` | `object` | `{}` | Custom node definitions |
| `background` | `'none' \| 'dots' \| 'lines' \| 'grid'` | `'dots'` | Canvas background |
| `edgeType` | `'bezier' \| 'straight' \| 'step'` | `'bezier'` | Connection line style |
| `minimap` | `boolean` | `true` | Show minimap |
| `snapToGrid` | `boolean` | `true` | Snap nodes to grid |
| `gridSize` | `number` | `20` | Grid snap size in pixels |
| `animatedEdges` | `boolean` | `false` | Animate connection lines |
| `showArrows` | `boolean` | `true` | Show arrows on connections |
| `onSave` | `function` | `null` | Callback when saved |
| `onChange` | `function` | `null` | Callback on changes |

---

### Node Management Methods

#### `addNode(type, x, y, data?)` / `createNode(type, x, y, data?)`
Adds a new node to the canvas.

```javascript
const nodeId = builder.addNode('action', 200, 150, {
  label: 'My Action',
  customField: 'value'
});
```

#### `removeNode(nodeId)`
Removes a node by ID.

```javascript
builder.removeNode('3');
```

#### `getNode(nodeId)`
Returns node data.

```javascript
const node = builder.getNode('1');
// { id: '1', name: 'trigger', data: {...}, pos_x: 100, pos_y: 100, ... }
```

#### `getNodes()`
Returns all nodes.

```javascript
const allNodes = builder.getNodes();
// [{ id, name, data, pos_x, pos_y, ... }, ...]
```

#### `updateNodeData(nodeId, data)`
Updates a node's data.

```javascript
builder.updateNodeData('1', { label: 'New Label' });
```

#### `registerNode(name, definition)`
Registers a custom node type.

```javascript
builder.registerNode('myCustomNode', {
  label: 'Custom Node',
  icon: '<svg>...</svg>',
  color: '#FF5733',
  inputs: 1,
  outputs: 2,
  fields: [
    { name: 'setting', label: 'Setting', type: 'text' }
  ]
});
```

---

### Connection Methods

#### `connect(fromNodeId, toNodeId, outputIndex?, inputIndex?)`
Creates a connection between nodes.

```javascript
builder.connect('1', '2');           // Default (output_1 → input_1)
builder.connect('1', '2', 1, 0);     // output_2 → input_1
```

---

### Zoom & Pan Methods

| Method | Description |
|--------|-------------|
| `zoomIn()` | Increase zoom level |
| `zoomOut()` | Decrease zoom level |
| `zoomReset()` | Reset to 100% zoom |
| `fitView()` | Fit all nodes in viewport |

---

### Undo/Redo & Editing

| Method | Description |
|--------|-------------|
| `undo()` | Undo last action |
| `redo()` | Redo last undone action |
| `clear()` | Clear entire workflow |
| `copySelected()` | Copy selected node(s) |
| `paste()` | Paste copied node(s) |
| `deleteSelected()` | Delete selected node(s) |
| `duplicateSelected()` | Duplicate selected node(s) |
| `selectAllNodes()` | Select all nodes |
| `deselectAll()` | Deselect all |
| `moveSelected(dx, dy)` | Move selected by offset |

---

### Group Management

| Method | Description |
|--------|-------------|
| `toggleGroup()` | Create/toggle node group |
| `collapseSelectedGroup()` | Collapse group to placeholder |
| `expandGroup(groupId)` | Expand collapsed group |
| `dissolveGroup(groupId)` | Ungroup nodes |

---

### Import/Export Methods

#### `export()`
Returns workflow data as object.

```javascript
const data = builder.export();
// { drawflow: { Home: { data: {...} } } }
```

#### `import(data)`
Imports workflow from data object.

```javascript
builder.import(savedWorkflowData);
```

#### `exportWorkflow()`
Downloads workflow as JSON file.

#### `importWorkflow(file)`
Imports from uploaded file.

#### `exportAsImage()`
Exports workflow as PNG image.

---

### Execution Methods

| Method | Description |
|--------|-------------|
| `runWorkflow()` | Execute entire workflow |
| `runFromNode(nodeId)` | Run from specific node onwards |
| `runSingleNode(nodeId)` | Test single node only |
| `pauseWorkflow()` | Pause execution |
| `stopWorkflow()` | Stop execution |
| `resetWorkflow()` | Reset execution state |
| `toggleExecutionLog()` | Toggle log panel visibility |

---

### Node Configuration

| Method | Description |
|--------|-------------|
| `getNodeConfig(nodeId)` | Get executor config for node |
| `setNodeConfig(nodeId, config)` | Set executor config |
| `showNodeConfigPanel(nodeId)` | Open config panel |
| `hideNodeConfigPanel()` | Close config panel |

---

### Display Settings

| Method | Description |
|--------|-------------|
| `setTheme(theme)` | Change theme ('light'/'dark') |
| `toggleMinimap()` | Toggle minimap |
| `toggleSnap()` | Toggle snap-to-grid |
| `toggleAnimate()` | Toggle edge animation |
| `validate()` | Validate workflow structure |
| `destroy()` | Cleanup and destroy builder |

---

## Node Types

### 70+ Built-in Node Types

#### Core Workflow Nodes

| Type | Label | Inputs | Outputs | Description |
|------|-------|--------|---------|-------------|
| `trigger` | Trigger | 0 | 1 | Workflow entry point |
| `action` | Action | 1 | 1 | Generic action |
| `condition` | Condition | 1 | 2 | Branching logic (true/false) |
| `loop` | Loop | 1 | 2 | Iterate over arrays |
| `delay` | Delay | 1 | 1 | Wait/pause execution |
| `end` | End | 1 | 0 | Workflow terminator |
| `transform` | Transform | 1 | 1 | Data transformation |
| `filter` | Filter | 1 | 1 | Filter array items |
| `merge` | Merge | 2 | 1 | Merge multiple inputs |

#### Database Nodes

| Type | Description |
|------|-------------|
| `database` | Generic SQL database |
| `mongodb` | MongoDB operations |
| `redis` | Redis cache |

#### Cloud & DevOps

| Type | Description |
|------|-------------|
| `aws` | AWS services |
| `lambda` | AWS Lambda |
| `s3` | AWS S3 |
| `docker` | Docker containers |
| `kubernetes` | Kubernetes |
| `github` | GitHub operations |
| `cloud` | Generic cloud |
| `server` | Server operations |

#### Code Execution

| Type | Description |
|------|-------------|
| `code` | Generic code |
| `nodejs` | Node.js |
| `python` | Python |

#### API & HTTP

| Type | Description |
|------|-------------|
| `http` | HTTP requests |
| `webhook` | Webhooks |
| `api` | REST API |

#### Communication

| Type | Description |
|------|-------------|
| `email` | Send emails |
| `slack` | Slack messages |
| `notification` | Notifications |

#### Utility Nodes

| Type | Description |
|------|-------------|
| `note` | Comments/notes |
| `file` | File operations |
| `folder` | Folder operations |
| `settings` | Configuration |
| `schedule` | Cron scheduling |
| `json` | JSON manipulation |

#### Flowchart Shapes

| Type | Inputs | Outputs |
|------|--------|---------|
| `start` | 0 | 1 |
| `stop` | 1 | 0 |
| `process` | 1 | 1 |
| `decision` | 1 | 2 |
| `data` | 1 | 1 |
| `document` | 1 | 1 |
| `connector` | 1 | 1 |
| `subprocess` | 1 | 1 |

#### Visual/Shape Nodes (Icon-only)

| Type | Description |
|------|-------------|
| `circle` | Circle shape |
| `square` | Square shape |
| `diamond` | Diamond shape |
| `hexagon` | Hexagon shape |
| `triangle` | Triangle shape |
| `star` | Star shape |
| `heart` | Heart shape |

#### Status Indicators

| Type | Color |
|------|-------|
| `success` | Green |
| `error` | Red |
| `warning` | Orange |
| `info` | Blue |

#### Action Nodes

| Type | Description |
|------|-------------|
| `download` | Download files |
| `upload` | Upload files |
| `search` | Search operations |
| `link` | URL links |
| `trash` | Delete operations |
| `edit` | Edit operations |
| `copy` | Copy operations |
| `refresh` | Refresh/reload |
| `user` | User operations |
| `users` | Multi-user |

---

## Node Executors

Each node type maps to an executor that handles its execution logic.

### Executor Registry Mappings

| Node Type | Executor |
|-----------|----------|
| `trigger`, `start`, `schedule` | TriggerExecutor |
| `action`, `process`, `aws`, `docker`, `github`, etc. | ActionExecutor |
| `condition`, `decision`, `diamond`, `if`, `switch` | ConditionExecutor |
| `loop`, `foreach` | LoopExecutor |
| `transform`, `merge`, `json`, `map` | TransformExecutor |
| `end`, `stop`, `success`, `error`, `output`, `return` | EndExecutor |
| `email` | EmailExecutor |
| `slack`, `notification` | SlackExecutor |
| `delay` | DelayExecutor |
| `http` | HttpExecutor |
| `api` | ApiExecutor |
| `webhook` | WebhookExecutor |
| `database`, `mongodb`, `redis`, `data` | DatabaseExecutor |
| `code`, `nodejs`, `python`, `subprocess` | CodeExecutor |
| `filter` | FilterExecutor |
| Others | GenericExecutor |

---

### TriggerExecutor

Entry point for workflows.

**Config Schema:**

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `triggerType` | select | manual, webhook, schedule, event | Trigger type |
| `initialData` | json | - | Initial data for workflow |
| `description` | textarea | - | Trigger description |

**Output:**
```javascript
{
  output: 'output_1',
  data: { ...initialData },
  triggerType: 'manual',
  triggeredAt: '2024-01-01T00:00:00Z'
}
```

---

### ActionExecutor

Performs actions like HTTP requests, code execution, logging.

**Config Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `actionType` | select | http_request, javascript, log, set_variable, delay |

**HTTP Request Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `http_method` | select | GET, POST, PUT, PATCH, DELETE |
| `http_url` | text | URL (supports `{{variables}}`) |
| `http_headers` | json | Request headers |
| `http_body` | json | Request body |

**JavaScript Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `js_code` | code | JavaScript code (access context via `ctx`) |

**Log Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `log_message` | text | Message (supports `{{interpolation}}`) |

**Set Variable Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `var_name` | text | Variable name |
| `var_value` | text | Variable value |

**Delay Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `delay_ms` | number | Milliseconds to wait |

---

### ConditionExecutor

Branching logic with true/false outputs.

**Config Schema:**

| Field | Type | Options |
|-------|------|---------|
| `conditionType` | select | expression, compare, exists, javascript |

**Expression Mode:**

| Field | Description |
|-------|-------------|
| `expression` | Text expression like `{{status}} == 'active'` |

**Compare Mode:**

| Field | Type | Description |
|-------|------|-------------|
| `compare_left` | text | Left value |
| `compare_operator` | select | ==, !=, >, <, >=, <=, contains, startsWith, endsWith |
| `compare_right` | text | Right value |

**Exists Mode:**

| Field | Description |
|-------|-------------|
| `exists_path` | Path like `lastResult.data.id` |

**JavaScript Mode:**

| Field | Description |
|-------|-------------|
| `js_condition` | JS code returning boolean |

**Output:**
```javascript
{
  output: 'output_1',  // true branch
  // OR
  output: 'output_2',  // false branch
  branch: 'true' | 'false',
  data: { condition evaluation details }
}
```

---

### LoopExecutor

Iterates over arrays, executing downstream nodes for each item.

**Config Schema:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `source` | text | `{{lastResult}}` | Array source |
| `itemVariable` | text | `item` | Variable name for each item |
| `indexVariable` | text | `index` | Variable name for index |

**Output:**
```javascript
{
  output: 'output_1',
  data: [...items],
  isLoop: true,
  itemVariable: 'item',
  indexVariable: 'index'
}
```

---

### TransformExecutor

Transforms data using JavaScript, JSON paths, or templates.

**Config Schema:**

| Field | Type | Options |
|-------|------|---------|
| `transformType` | select | javascript, json_path, template |

**JavaScript Mode:**

| Field | Description |
|-------|-------------|
| `js_transform` | JS code (return transformed data) |

**JSON Path Mode:**

| Field | Description |
|-------|-------------|
| `json_path` | Path like `lastResult.data.items[0].name` |

**Template Mode:**

| Field | Description |
|-------|-------------|
| `template` | JSON with `{{variable}}` interpolation |

---

### EndExecutor

Terminates workflow execution.

**Config Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `returnValue` | text | Value to return (supports `{{interpolation}}`) |
| `status` | select | success, error, custom |

**Output:**
```javascript
{
  output: null,
  data: returnValue,
  status: 'success',
  isEnd: true
}
```

---

### HttpExecutor

Makes HTTP requests.

**Config Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `method` | select | GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS |
| `url` | text | URL with `{{interpolation}}` |
| `headers` | json | Request headers |
| `body` | json | Request body |
| `timeout_seconds` | number | Request timeout |
| `ignore_errors` | checkbox | Continue on error |

**Output:**
```javascript
{
  output: 'output_1',  // success
  // OR
  output: 'output_2',  // error (if 2 outputs)
  data: { ...responseBody },
  status: 200,
  statusText: 'OK',
  ok: true,
  headers: { ...responseHeaders },
  url: 'https://...',
  request: { method, url, headers, body }
}
```

---

### ApiExecutor

Extended HTTP executor for REST APIs with authentication.

**Additional Config:**

| Field | Type | Description |
|-------|------|-------------|
| `base_url` | text | API base URL |
| `endpoint` | text | Endpoint path |
| `auth_type` | select | none, bearer, basic, api_key |
| `auth_token` | text | Bearer token |
| `auth_username` | text | Basic auth username |
| `auth_password` | text | Basic auth password |
| `api_key_header` | text | API key header name |
| `api_key_value` | text | API key value |

---

### EmailExecutor

Sends emails (simulated in browser).

**Config Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `to` | text | Recipient email |
| `cc` | text | CC emails |
| `subject` | text | Subject (supports `{{vars}}`) |
| `body` | textarea | Body (supports `{{vars}}`) |
| `isHtml` | checkbox | HTML email |

---

### DelayExecutor

Pauses execution.

**Config Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `delayType` | select | seconds, minutes, hours, until_time |
| `seconds` | number | Seconds to wait |
| `minutes` | number | Minutes to wait |
| `hours` | number | Hours to wait |
| `until_time` | text | ISO timestamp |

---

### SlackExecutor

Sends Slack messages.

**Config Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `webhook_url` | text | Slack webhook URL |
| `channel` | text | Channel name |
| `message` | textarea | Message (supports `{{vars}}`) |
| `username` | text | Bot username |
| `icon_emoji` | text | Emoji like `:robot_face:` |

---

### DatabaseExecutor

Database operations.

**Config Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `db_type` | select | mysql, postgresql, mongodb, sqlite |
| `connection_string` | text | Connection string |
| `operation` | select | query, insert, update, delete |
| `query` | textarea | Query or collection |
| `params` | json | Query parameters |

---

### CodeExecutor

Executes code.

**Config Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `language` | select | javascript, python |
| `code` | code | Code to execute |

**Note:** Python requires server-side execution; JavaScript runs in browser.

---

### FilterExecutor

Filters arrays.

**Config Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `source` | text | Array source |
| `filter_type` | select | javascript, property_match |
| `property` | text | Property name (property_match) |
| `operator` | select | Comparison operator |
| `value` | text | Value to compare |
| `filter_code` | code | JS filter function |

---

### GenericExecutor

Fallback for custom/unregistered nodes.

**Config Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `label` | text | Custom label |
| `description` | textarea | Node description |
| `custom_data` | json | Any custom data |
| `pass_through` | checkbox | Merge with lastResult |

---

## WorkflowExecutor - Execution Engine

### Constructor

```javascript
const executor = new WorkflowExecutor(workflowBuilder);
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `isRunning` | boolean | Execution in progress |
| `isPaused` | boolean | Execution paused |
| `currentNodeId` | string | Currently executing node |
| `executionContext` | object | Data passed between nodes |
| `executionHistory` | array | Log of execution steps |
| `nodeStates` | Map | Node ID → state |
| `stepDelay` | number | Delay between steps (ms) |

### Node States

| State | Description |
|-------|-------------|
| `pending` | Not yet executed |
| `running` | Currently executing |
| `success` | Executed successfully |
| `failed` | Execution failed |
| `skipped` | Was skipped |
| `paused` | Paused mid-execution |

### Methods

| Method | Description |
|--------|-------------|
| `start(initialContext?)` | Start workflow execution |
| `pause()` | Pause execution |
| `resume()` | Resume paused execution |
| `stop()` | Stop execution |
| `reset()` | Reset execution state |
| `getNodes()` | Get all nodes |
| `findStartNodes()` | Find entry point nodes |
| `getNextNodes(nodeId, outputKey)` | Get downstream nodes |
| `executeNode(nodeId)` | Execute single node |
| `executeFromNode(startNodeId)` | Execute from node onwards |
| `setNodeState(nodeId, state)` | Set visual node state |
| `clearAllStates()` | Clear all states |
| `getLog()` | Get execution history |
| `getContext()` | Get execution context |

### Execution History Entry

```javascript
{
  nodeId: '1',
  nodeName: 'action',
  status: 'success' | 'failed',
  duration: 150,  // milliseconds
  result: { output: 'output_1', data: {...} },
  config: { /* node config used */ },
  input: { /* data passed in */ },
  error: 'Error message',  // if failed
  timestamp: '2024-01-01T00:00:00.000Z'
}
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Y` | Redo |
| `Ctrl/Cmd + Shift + Z` | Redo (alternative) |
| `Delete` / `Backspace` | Delete selected |
| `Ctrl/Cmd + S` | Export workflow |
| `Ctrl/Cmd + C` | Copy selected |
| `Ctrl/Cmd + V` | Paste |
| `Ctrl/Cmd + D` | Duplicate selected |
| `Ctrl/Cmd + A` | Select all |
| `Ctrl/Cmd + G` | Toggle group |
| `Ctrl/Cmd + Shift + G` | Collapse group |
| `Arrow Keys` | Move selected (5px) |
| `Shift + Arrow Keys` | Move selected (20px) |
| `Escape` | Deselect all |
| `Space + Drag` | Pan canvas |
| `Middle Mouse + Drag` | Pan canvas |
| `Mouse Wheel` | Zoom in/out |

---

## Variable Interpolation

Use `{{variable}}` syntax to insert dynamic values into any text field.

### Available Variables

| Variable | Description |
|----------|-------------|
| `{{lastResult}}` | Full result of previous node |
| `{{lastResult.data}}` | Data from previous node |
| `{{lastResult.data.fieldName}}` | Specific field |
| `{{node_1}}` | Result of node with ID 1 |
| `{{node_1.data.field}}` | Specific field from node 1 |
| `{{item}}` | Current item in loop |
| `{{index}}` | Current index in loop |
| `{{variableName}}` | Any set variable |

### Examples

```javascript
// In HTTP URL field
"https://api.example.com/users/{{lastResult.data.id}}"

// In condition expression
"{{lastResult.data.status}} == 'active'"

// In email body
"Hello {{lastResult.data.name}}, your order #{{node_1.data.orderId}} is ready."

// In transform code
const data = ctx.lastResult.data;
return data.items.filter(item => item.active);
```

---

## Events & Callbacks

### Builder Events

```javascript
// Constructor callbacks
new WorkflowBuilder(container, {
  onSave: (data) => console.log('Saved:', data),
  onChange: (data) => console.log('Changed:', data)
});
```

### Executor Callbacks

```javascript
executor.onNodeStart = (nodeId, node) => {
  console.log(`Starting node ${nodeId}`);
};

executor.onNodeComplete = (nodeId, node, result) => {
  console.log(`Node ${nodeId} completed:`, result);
};

executor.onNodeError = (nodeId, node, error) => {
  console.error(`Node ${nodeId} failed:`, error);
};

executor.onExecutionStart = () => {
  console.log('Workflow started');
};

executor.onExecutionComplete = (history, context) => {
  console.log('Workflow completed');
  console.log('History:', history);
  console.log('Final context:', context);
};

executor.onExecutionError = (error) => {
  console.error('Workflow failed:', error);
};
```

---

## Configuration Options

### Display Options

| Option | Values | Description |
|--------|--------|-------------|
| `theme` | light, dark | Color theme |
| `background` | none, dots, lines, grid | Canvas background |
| `edgeType` | bezier, straight, step | Connection style |
| `showArrows` | true, false | Arrow on connections |
| `animatedEdges` | true, false | Animate connections |
| `snapToGrid` | true, false | Snap to grid |
| `gridSize` | number | Grid size in pixels |
| `minimap` | true, false | Show minimap |

### Execution Options

| Option | Description |
|--------|-------------|
| `stepDelay` | Delay between node executions (ms) |
| `timeout_seconds` | Request timeout per node |
| `ignore_errors` | Continue workflow on error |

---

## Export/Import Formats

### Workflow JSON Structure

```javascript
{
  "drawflow": {
    "Home": {
      "data": {
        "1": {
          "id": 1,
          "name": "trigger",
          "data": { "label": "Start" },
          "class": "trigger",
          "html": "...",
          "typenode": false,
          "inputs": {},
          "outputs": {
            "output_1": {
              "connections": [
                { "node": "2", "output": "input_1" }
              ]
            }
          },
          "pos_x": 100,
          "pos_y": 100
        },
        "2": {
          "id": 2,
          "name": "action",
          "data": { "label": "Process" },
          // ...
        }
      }
    }
  }
}
```

### Mermaid Export

```javascript
const mermaid = workflowToMermaid(builder.export());
// flowchart TD
//   node1[Trigger]
//   node2[Action]
//   node1 --> node2
```

---

## Custom Nodes

### Creating Custom Node Types

```javascript
// Method 1: Via constructor
new WorkflowBuilder(container, {
  customNodes: {
    'myNode': {
      label: 'My Custom Node',
      icon: '<svg>...</svg>',
      color: '#FF5733',
      inputs: 1,
      outputs: 2,
      fields: [
        {
          name: 'option',
          label: 'Option',
          type: 'select',
          options: [
            { value: 'a', label: 'Option A' },
            { value: 'b', label: 'Option B' }
          ],
          default: 'a'
        }
      ]
    }
  }
});

// Method 2: Via registerNode
builder.registerNode('myNode', { ... });

// Method 3: Via helper function
import { createNodeDefinition } from 'flowkit';

const myNode = createNodeDefinition({
  label: 'My Node',
  icon: icons.zap,
  color: '#FF5733',
  inputs: 1,
  outputs: 1,
  fields: [...]
});
```

### Creating Custom Executors

```javascript
import { BaseNodeExecutor, createCustomExecutor } from 'flowkit';

// Method 1: Extend BaseNodeExecutor
class MyExecutor extends BaseNodeExecutor {
  static getConfigSchema() {
    return [
      { key: 'myField', label: 'My Field', type: 'text' }
    ];
  }

  static async execute(node, config, context, signal) {
    // Your logic here
    const result = await doSomething(config.myField);
    
    return {
      output: 'output_1',
      data: result
    };
  }
}

// Method 2: Use helper
const MyExecutor = createCustomExecutor({
  schema: [
    { key: 'myField', label: 'My Field', type: 'text' }
  ],
  execute: async (node, config, context) => {
    return { output: 'output_1', data: {} };
  }
});

// Register executor
NodeExecutorRegistry.register('myNode', MyExecutor);
```

### Field Types for Custom Nodes

| Type | Description |
|------|-------------|
| `text` | Single line text input |
| `textarea` | Multi-line text input |
| `number` | Numeric input |
| `select` | Dropdown with options |
| `checkbox` | Boolean checkbox |
| `json` | JSON editor |
| `code` | Code editor |

### Field Definition Structure

```javascript
{
  name: 'fieldName',        // Internal key (required)
  key: 'fieldName',         // Alternative to name
  label: 'Display Label',   // UI label (required)
  type: 'text',             // Field type (required)
  default: 'defaultValue',  // Default value
  placeholder: 'hint...',   // Placeholder text
  options: [                // For select type
    { value: 'a', label: 'Option A' }
  ],
  showIf: {                 // Conditional display
    otherField: 'value'
  },
  hint: 'Helper text'       // Help text below field
}
```

---

## Examples

### Basic Workflow

```javascript
const builder = new WorkflowBuilder(document.getElementById('app'), {
  theme: 'dark',
  background: 'dots'
});

// Add nodes
builder.addNode('trigger', 100, 100);
builder.addNode('action', 300, 100);
builder.addNode('end', 500, 100);

// Connect
builder.connect('1', '2');
builder.connect('2', '3');

// Configure action
builder.setNodeConfig('2', {
  actionType: 'log',
  log_message: 'Hello from {{lastResult.data}}!'
});

// Run
await builder.runWorkflow();
```

### Conditional Workflow

```javascript
builder.addNode('trigger', 100, 200);
builder.addNode('condition', 300, 200);
builder.addNode('action', 500, 100);   // True branch
builder.addNode('action', 500, 300);   // False branch
builder.addNode('end', 700, 200);

builder.connect('1', '2');
builder.connect('2', '3', 0, 0);  // output_1 (true)
builder.connect('2', '4', 1, 0);  // output_2 (false)
builder.connect('3', '5');
builder.connect('4', '5');

builder.setNodeConfig('2', {
  conditionType: 'compare',
  compare_left: '{{lastResult.data.value}}',
  compare_operator: '>',
  compare_right: '10'
});
```

### API Integration

```javascript
builder.addNode('trigger', 100, 150);
builder.addNode('http', 300, 150);
builder.addNode('transform', 500, 150);
builder.addNode('end', 700, 150);

builder.connect('1', '2');
builder.connect('2', '3');
builder.connect('3', '4');

// Configure HTTP
builder.setNodeConfig('2', {
  method: 'GET',
  url: 'https://api.example.com/users',
  headers: '{"Authorization": "Bearer {{token}}"}'
});

// Configure transform
builder.setNodeConfig('3', {
  transformType: 'javascript',
  js_transform: `
    return ctx.lastResult.data.map(user => ({
      id: user.id,
      name: user.name
    }));
  `
});

// Run with initial data
builder.executor.start({ token: 'abc123' });
```

### Loop Example

```javascript
builder.addNode('trigger', 100, 200);
builder.addNode('loop', 300, 200);
builder.addNode('action', 500, 150);   // Loop body
builder.addNode('end', 700, 200);

builder.connect('1', '2');
builder.connect('2', '3', 0, 0);  // Loop iteration
builder.connect('2', '4', 1, 0);  // Loop complete
builder.connect('3', '2');        // Back to loop

builder.setNodeConfig('1', {
  initialData: '{"items": [1, 2, 3, 4, 5]}'
});

builder.setNodeConfig('2', {
  source: '{{lastResult.data.items}}',
  itemVariable: 'item',
  indexVariable: 'idx'
});

builder.setNodeConfig('3', {
  actionType: 'log',
  log_message: 'Processing item {{item}} at index {{idx}}'
});
```

---

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

---

## License

MIT License

---

## Version

1.0.0
