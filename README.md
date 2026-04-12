# FlowKit

A powerful visual workflow builder with execution engine, API testing, and full request/response visibility. Build, test, and export automation workflows in the browser.

**[Live Demo](https://viz-flow.netlify.app/)**

## Features

### Core Workflow Builder
- **Drag & Drop Interface** - Intuitive node placement and connection drawing
- **60+ SVG Icons** - Beautiful, scalable vector icons for all node types
- **80+ Pre-built Node Types** - HTTP, API, Database, AWS, Docker, Slack, Email, and more
- **Custom Nodes** - Create your own node types at runtime
- **Node Grouping** - Group nodes together, collapse/expand groups
- **Dark/Light Themes** - Built-in theme support

### Workflow Execution
- **Real Execution Engine** - Actually runs your workflows
- **HTTP Requests** - Make real API calls with full request/response capture
- **Variable Interpolation** - Use `{{node_1.data}}` or `{{lastResult.field}}`
- **Conditional Branching** - Route flows based on conditions
- **Loops** - Iterate over arrays
- **Code Execution** - Run JavaScript code in nodes
- **State Persistence** - Execution state auto-saves and restores on page reload

### Debugging & Testing
- **Test Single Node** - Right-click → "Test This Node Only"
- **Run From Node** - Right-click → "Run Workflow From Here"
- **Full Execution Log** - See every request/response with headers
- **Request Echo** - See exactly what was sent
- **Response Headers** - View all HTTP response headers
- **Expandable Details** - Click log entries to see full JSON

### Import/Export
- **JSON Export** - Download workflows as JSON files
- **JSON Import** - Load workflows from files
- **Includes Configs** - Node configurations are preserved
- **Image Export** - Export canvas as PNG

## Installation

```bash
npm install flowkit
```

## Quick Start

```html
<div id="app"></div>

<script type="module">
  import { WorkflowBuilder } from 'flowkit';

  const workflow = new WorkflowBuilder('#app', {
    theme: 'light',
    nodes: ['trigger', 'http', 'condition', 'email', 'slack', 'end']
  });
</script>
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `theme` | `string` | `'light'` | `'light'` or `'dark'` |
| `nodes` | `array` | All nodes | Node types to show in sidebar |
| `onChange` | `function` | `null` | Callback when workflow changes |
| `onSave` | `function` | `null` | Callback on export |
| `customNodes` | `object` | `{}` | Custom node definitions |

## Node Types

### Core Workflow
| Node | Purpose | Inputs | Outputs |
|------|---------|--------|---------|
| `trigger` | Start workflow | 0 | 1 |
| `action` | Generic action | 1 | 1 |
| `condition` | If/else branch | 1 | 2 |
| `loop` | For each item | 1 | 2 |
| `delay` | Wait seconds | 1 | 1 |
| `end` | End workflow | 1 | 0 |

### HTTP & API
| Node | Purpose |
|------|---------|
| `http` | HTTP requests (GET, POST, PUT, DELETE) |
| `api` | REST API with auth |
| `webhook` | Incoming webhooks |

### Communication
| Node | Purpose |
|------|---------|
| `email` | Send emails |
| `slack` | Post to Slack |

### Data & Code
| Node | Purpose |
|------|---------|
| `code` | Execute JavaScript |
| `transform` | Transform data |
| `filter` | Filter arrays |
| `database` | SQL queries |
| `mongodb` | MongoDB operations |
| `redis` | Redis commands |

### Cloud & DevOps
| Node | Purpose |
|------|---------|
| `aws` | AWS services |
| `lambda` | AWS Lambda |
| `s3` | AWS S3 |
| `docker` | Docker operations |
| `kubernetes` | K8s resources |
| `github` | GitHub API |

## API Methods

### Execution

```javascript
// Run entire workflow
workflow.runWorkflow();

// Run single node (for testing)
workflow.runSingleNode(nodeId);

// Run from specific node
workflow.runFromNode(nodeId);

// Pause/Resume
workflow.pauseWorkflow();

// Stop execution
workflow.stopWorkflow();

// Reset execution state
workflow.resetWorkflow();

// Get execution state (for custom persistence)
const state = workflow.getExecutionState();

// Restore execution state
workflow.setExecutionState(state);

// Get execution log
const log = workflow.getExecutionLog();

// Get execution context (data between nodes)
const ctx = workflow.getExecutionContext();
```

### Data

```javascript
// Export workflow data
const data = workflow.export();

// Import workflow
workflow.import(data);

// Download as JSON file
workflow.exportWorkflow();

// Export as image
workflow.exportAsImage();
```

### Node Configuration

```javascript
// Get node config
const config = workflow.getNodeConfig(nodeId);

// Set node config
workflow.setNodeConfig(nodeId, {
  url: 'https://api.example.com',
  method: 'POST',
  headers: { 'Authorization': 'Bearer ...' }
});
```

## Variable Interpolation

Use `{{variable}}` syntax to reference data from previous nodes:

```javascript
// Reference last result
"{{lastResult.data.userId}}"

// Reference specific node
"{{node_1.data.email}}"

// In HTTP body
{
  "userId": "{{lastResult.data.id}}",
  "action": "approve"
}
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Delete` | Delete selected |
| `Ctrl+C` | Copy |
| `Ctrl+V` | Paste |
| `Ctrl+D` | Duplicate |
| `Ctrl+A` | Select all |
| `Ctrl+G` | Group selected |

## Documentation

| Document | Description |
|----------|-------------|
| [EXAMPLES.md](./EXAMPLES.md) | Detailed walkthrough of every example workflow with diagrams, step-by-step explanations, and context variable reference |
| [DOCUMENTATION.md](./DOCUMENTATION.md) | Complete API documentation, node types, executors, and configuration options |

## What's Next (Roadmap)

### Client-Side (Coming Soon)
- [ ] Workflow templates library
- [ ] Copy/paste between workflows  
- [ ] Minimap improvements
- [ ] Node search/filter

### Requires Backend (Future)
- [ ] Real webhook listeners
- [ ] Scheduled execution (cron)
- [ ] OAuth authentication flows
- [ ] Persistent storage
- [ ] Team collaboration
- [ ] Error retry with backoff
- [ ] Execution queue

## Tech Stack

- **Frontend**: Vanilla JS, Drawflow, Vite
- **Icons**: 60+ custom SVGs
- **Styling**: CSS variables, dark/light themes

## License

MIT

---

**FlowKit** - Build, test, and visualize workflows in the browser.
