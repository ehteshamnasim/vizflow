# Workflow Builder

A powerful, customizable workflow builder for creating visual workflows with drag-and-drop nodes. Built on top of [Drawflow](https://github.com/jerosoler/Drawflow) with a modern, polished UI and 60+ SVG icons.

![Workflow Builder Demo](https://via.placeholder.com/800x400?text=Workflow+Builder+Demo)

## Features

- **Drag & Drop Interface** - Intuitive node placement and connection drawing
- **60+ SVG Icons** - Beautiful, scalable vector icons for all node types
- **80+ Pre-built Node Types** - Trigger, Action, Condition, Database, AWS, Docker, and more
- **Icon-Only Mode** - Compact icon-only nodes for flowchart symbols (diamond, circle, star, etc.)
- **Custom Nodes** - Easily create your own node types with custom icons
- **Dark/Light Themes** - Built-in theme support with CSS variables
- **Undo/Redo** - Full history with keyboard shortcuts (Ctrl+Z, Ctrl+Y)
- **Import/Export** - Save and load workflows as JSON files
- **Zoom & Pan** - Navigate large workflows (100% to 200% zoom)
- **Responsive** - Works on tablets and desktops
- **Zero Framework** - Pure JavaScript, works with any project

## Installation

```bash
npm install @yourcompany/workflow-builder
```

## Quick Start

### HTML

```html
<div id="workflow-container"></div>
```

### JavaScript

```javascript
import { WorkflowBuilder } from '@yourcompany/workflow-builder';

const workflow = new WorkflowBuilder('#workflow-container', {
  theme: 'light',
  nodes: ['trigger', 'action', 'condition', 'email', 'api', 'diamond', 'star'],
  onChange: (data) => {
    console.log('Workflow updated:', data);
  }
});
```

That's it! You now have a fully functional workflow builder.

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `theme` | `string` | `'light'` | Visual theme: `'light'` or `'dark'` |
| `nodes` | `array` | All nodes | Node types to show in palette |
| `onChange` | `function` | `null` | Callback when workflow changes |
| `onSave` | `function` | `null` | Callback when user exports |
| `customNodes` | `object` | `{}` | Custom node type definitions |

## Exports

```javascript
import { 
  WorkflowBuilder,     // Main class
  NodeRegistry,        // For custom node management
  defaultNodeTypes,    // All built-in node definitions
  icons,               // 60+ SVG icons library
  
  // Utilities
  validateWorkflow,
  workflowToMermaid,
  createWorkflowMetadata,
  cloneWorkflow,
  generateWorkflowId
} from '@yourcompany/workflow-builder';
```

## Using the Icons Library

The package exports a library of 60+ SVG icons you can use with custom nodes:

```javascript
import { icons } from '@yourcompany/workflow-builder';

// Available icons:
// - Shapes: circle, square, diamond, hexagon, triangle, star, heart
// - Actions: play, stop, download, upload, search, edit, copy, trash, refresh
// - Arrows: arrowRight, arrowLeft, arrowUp, arrowDown
// - Status: check, x, alert, info, bell
// - Cloud: aws, lambda, s3, cloud, server, docker, kubernetes
// - Code: code, nodejs, python, github, terminal
// - Data: database, mongodb, redis, json, file, folder
// - Comms: email, slack, webhook, http, api
// - UI: user, users, settings, lock, unlock, key, globe, home, bookmark, flag
// - Charts: activity, pie, chart, layers, cpu, box, zap
// - And many more...

console.log(icons.star);    // Returns SVG string
console.log(icons.diamond); // Returns SVG string
```

## API Methods

### Adding Nodes

```javascript
// Add a node programmatically
const nodeId = workflow.addNode('email', 300, 200, {
  to: 'user@example.com',
  subject: 'Hello!'
});
```

### Export & Import

```javascript
// Get workflow data
const data = workflow.export();

// Load workflow data
workflow.import(data);

// Export as downloadable JSON file
workflow.exportWorkflow();
```

### Zoom Controls

```javascript
workflow.zoomIn();
workflow.zoomOut();
workflow.zoomReset();  // Returns to 100%
// Max zoom: 200%
```

### Theme

```javascript
workflow.setTheme('dark');
workflow.setTheme('light');
```

### Other Methods

```javascript
workflow.clear();          // Clear all nodes
workflow.deleteSelected(); // Delete selected node
workflow.undo();           // Undo last action
workflow.redo();           // Redo
workflow.destroy();        // Cleanup
```

## Built-in Node Types

### Core Workflow Nodes
| Node | Purpose | Inputs | Outputs |
|------|---------|--------|---------|
| `trigger` | Start workflow | 0 | 1 |
| `action` | Perform task | 1 | 1 |
| `condition` | Branch logic | 1 | 2 |
| `loop` | Iterate array | 1 | 2 |
| `delay` | Wait time | 1 | 1 |
| `end` | End workflow | 1 | 0 |

### Database & Storage
| Node | Purpose |
|------|---------|
| `database` | SQL queries |
| `mongodb` | MongoDB operations |
| `redis` | Redis commands |
| `s3` | AWS S3 bucket |

### Cloud & DevOps
| Node | Purpose |
|------|---------|
| `aws` | AWS services |
| `lambda` | AWS Lambda |
| `docker` | Docker containers |
| `kubernetes` | K8s resources |
| `github` | GitHub repos |
| `server` | Server operations |
| `cloud` | Cloud providers |

### Code & API
| Node | Purpose |
|------|---------|
| `code` | Generic code |
| `nodejs` | Node.js scripts |
| `python` | Python scripts |
| `http` | HTTP requests |
| `webhook` | Webhook endpoints |
| `api` | API calls |

### Communication
| Node | Purpose |
|------|---------|
| `email` | Send emails |
| `slack` | Slack messages |
| `notification` | Notifications |

### Shape Nodes (Icon-Only Mode)
These display as compact 79x79px boxes with just the icon:

| Node | Shape |
|------|-------|
| `circle` | ● Circle |
| `square` | ■ Square |
| `diamond` | ◆ Diamond |
| `hexagon` | ⬡ Hexagon |
| `triangle` | ▲ Triangle |
| `star` | ★ Star |
| `heart` | ♥ Heart |

### Status Nodes (Icon-Only Mode)
| Node | Purpose |
|------|---------|
| `success` | ✓ Checkmark |
| `error` | ✕ X mark |
| `warning` | ⚠ Alert |
| `info` | ℹ Info |

### Arrow Nodes (Icon-Only Mode)
| Node | Direction |
|------|-----------|
| `arrowRight` | → Right |
| `arrowLeft` | ← Left |
| `arrowUp` | ↑ Up |
| `arrowDown` | ↓ Down |

### More Icon-Only Nodes
`trash`, `edit`, `copy`, `refresh`, `zap`, `lock`, `unlock`, `globe`, `home`, `bookmark`, `flag`, `layers`, `box`, `cpu`, `activity`, `pieChart`, `barChart`, `users`

## Custom Node Types

Create your own node types with SVG icons:

```javascript
import { WorkflowBuilder, icons } from '@yourcompany/workflow-builder';

const workflow = new WorkflowBuilder('#app', {
  customNodes: {
    // Standard node with label and fields
    slack: {
      label: 'Send to Slack',
      icon: icons.slack,  // Use built-in icon
      color: '#4A154B',
      description: 'Post message to Slack channel',
      inputs: 1,
      outputs: 1,
      fields: [
        {
          name: 'channel',
          label: 'Channel',
          type: 'text',
          placeholder: '#general'
        },
        {
          name: 'message',
          label: 'Message',
          type: 'textarea',
          placeholder: 'Enter your message...'
        }
      ]
    },
    
    // Icon-only node (compact, no label)
    myIcon: {
      label: 'My Icon',
      icon: icons.star,
      color: '#FFD700',
      inputs: 1,
      outputs: 1,
      fields: [],
      iconOnly: true  // Displays as 79x79px icon box
    },
    
    // Custom SVG icon
    custom: {
      label: 'Custom',
      icon: '<svg viewBox="0 0 24 24" fill="currentColor">...</svg>',
      color: '#FF5722',
      inputs: 1,
      outputs: 1,
      fields: []
    }
  }
});
```

### Field Types

| Type | Description |
|------|-------------|
| `text` | Single line text input |
| `textarea` | Multi-line text input |
| `number` | Numeric input |
| `select` | Dropdown selection |
| `checkbox` | Boolean toggle |

### Select Field Example

```javascript
{
  name: 'priority',
  label: 'Priority',
  type: 'select',
  default: 'medium',
  options: [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' }
  ]
}
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + Z` | Undo |
| `Ctrl + Y` | Redo |
| `Ctrl + S` | Export |
| `Delete` | Delete selected node |
| `Backspace` | Delete selected node |

## Theming

The workflow builder uses CSS custom properties for easy theming:

```css
.workflow-builder {
  --primary-color: #4F46E5;
  --bg-primary: #FFFFFF;
  --text-primary: #111827;
  /* ... see main.css for all variables */
}
```

## Utility Functions

```javascript
import { 
  validateWorkflow,
  workflowToMermaid,
  createWorkflowMetadata 
} from '@yourcompany/workflow-builder';

// Validate workflow
const result = validateWorkflow(data);
console.log(result.isValid, result.errors, result.warnings);

// Convert to Mermaid diagram
const mermaid = workflowToMermaid(data);
console.log(mermaid);

// Wrap with metadata for saving
const saved = createWorkflowMetadata(data, {
  name: 'My Workflow',
  description: 'Handles signups'
});
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## License

MIT License - see LICENSE file for details.

## Credits

Built on top of [Drawflow](https://github.com/jerosoler/Drawflow) by jerosoler.
