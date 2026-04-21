# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.0] - 2026-04-21

### Added
- Initial public release
- 80+ built-in node types (triggers, actions, conditions, loops, etc.)
- Visual drag-and-drop workflow builder
- Full workflow execution engine
- Variable interpolation with `{{variable}}` syntax
- Condition branching with multiple comparison modes
- Loop execution over arrays
- HTTP/API request nodes
- Email and Slack notification nodes
- Export workflows as JSON or PNG images
- Import/Export workflow data
- Undo/Redo support
- Copy/Paste nodes
- Multi-select with Ctrl/Shift+click
- Node grouping
- Minimap navigation
- Zoom and pan controls
- Dark/Light theme support
- TypeScript definitions
- ESM and UMD bundle outputs

### Security
- Added logger utility (dev-only console output)
- Added sanitizer utilities (escapeHtml, sanitizeAttribute)
- Documented security considerations for eval/Function usage

### Fixed
- Duplicate node creation on drag-and-drop (event propagation issue)

## [Unreleased]

### Planned
- Unit tests
- Accessibility improvements (ARIA labels)
- Mobile responsive design
- Code sandbox for safer JavaScript execution
- Integration with Shidoka design system
