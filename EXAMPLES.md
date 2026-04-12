# VizFlow Example Workflows

A comprehensive guide to all pre-built example workflows. Each example demonstrates different workflow patterns and capabilities.

---

## Table of Contents

1. [Basic Examples](#basic-examples)
   - [API Request Test](#1-api-request-test)
   - [Data Pipeline](#2-data-pipeline)
   - [Condition Flow](#3-condition-flow)
   - [Loop Example](#4-loop-example)
   - [Notification Flow](#5-notification-flow)
   - [Error Handling](#6-error-handling)
2. [Complex Examples](#complex-examples)
   - [Full API Workflow](#7-full-api-workflow)
   - [Data Enrichment Pipeline](#8-data-enrichment-pipeline)
   - [Multi-Channel Alert System](#9-multi-channel-alert-system)
   - [ETL Pipeline](#10-etl-pipeline)
3. [Context Variables Reference](#context-variables-reference)

---

## Basic Examples

---

### 1. API Request Test

**What it does:** The simplest possible workflow - makes one API call and transforms the response.

**Real-world use case:** Quick testing of an API endpoint, validating response format, debugging API integrations.

**ASCII Diagram:**
```
┌─────────┐    ┌──────┐    ┌───────────┐    ┌─────┐
│ Trigger │───▶│ HTTP │───▶│ Transform │───▶│ End │
└─────────┘    └──────┘    └───────────┘    └─────┘
```

**Step-by-step:**

| Step | Node | What Happens |
|------|------|--------------|
| 1 | **Trigger** | User clicks "Run" to start workflow |
| 2 | **HTTP** | Makes GET request to `/todos/1` |
| 3 | **Transform** | Extracts only `title` and `completed` fields |
| 4 | **End** | Workflow completes, result available in log |

**Node Configurations:**

```javascript
// HTTP Node Config
{
  method: 'GET',
  url: 'https://jsonplaceholder.typicode.com/todos/1',
  headers: '{"Accept": "application/json"}'
}

// Transform Node Config
{
  transformType: 'javascript',
  code: 'return { title: data.title, completed: data.completed };'
}
```

**Expected Output:**
```json
{
  "title": "delectus aut autem",
  "completed": false
}
```

**Key Concepts:**
- `data` in transform code = `ctx.lastResult.data` (the response body)
- Transform only has 1 output, so result always goes to `output_1`
- HTTP response includes `status`, `headers`, `ok` in addition to `data`

---

### 2. Data Pipeline

**What it does:** Fetches a list of users from an API, filters out invalid entries, and transforms to a clean format.

**Real-world use case:** Getting a clean contact list from a CRM API for a mailing list, data cleaning before import.

**ASCII Diagram:**
```
┌─────────┐    ┌──────┐    ┌────────┐    ┌───────────┐    ┌─────┐
│ Trigger │───▶│ HTTP │───▶│ Filter │───▶│ Transform │───▶│ End │
└─────────┘    └──────┘    └────────┘    └───────────┘    └─────┘
```

**Step-by-step:**

| Step | Node | What Happens |
|------|------|--------------|
| 1 | **Trigger** | Workflow starts manually |
| 2 | **HTTP** | Fetches 10 users with full profile data |
| 3 | **Filter** | Removes users without a city in address |
| 4 | **Transform** | Maps to `{name, email, city}` format |
| 5 | **End** | Clean data ready for export |

**Node Configurations:**

```javascript
// HTTP Node Config
{
  method: 'GET',
  url: 'https://jsonplaceholder.typicode.com/users'
}

// Filter Node Config
{
  filterType: 'field_match',
  field: 'address.city',
  operator: 'not_empty'
}

// Transform Node Config
{
  transformType: 'javascript',
  code: 'return data.map(u => ({ name: u.name, email: u.email, city: u.address.city }));'
}
```

**Expected Output:**
```json
[
  { "name": "Leanne Graham", "email": "Sincere@april.biz", "city": "Gwenborough" },
  { "name": "Ervin Howell", "email": "Shanna@melissa.tv", "city": "Wisokyburgh" },
  { "name": "Clementine Bauch", "email": "Nathan@yesenia.net", "city": "McKenziehaven" }
]
```

**Key Concepts:**
- Filter operates on each array item individually
- `filterType: 'field_match'` checks a field on each item
- `not_empty` operator returns true if field exists and has value
- Transform receives the filtered array as `data`

---

### 3. Condition Flow

**What it does:** Fetches a todo item and routes to different actions based on whether it's completed.

**Real-world use case:** Processing support tickets differently based on status, routing orders based on payment status.

**ASCII Diagram:**
```
                              ┌───────────────┐
                         ✓    │ Action        │
                       ┌─────▶│ (Completed)   │──────┐
┌─────────┐   ┌──────┐ │      └───────────────┘      │   ┌─────┐
│ Trigger │──▶│ HTTP │─┼─▶ CONDITION                 ├──▶│ End │
└─────────┘   └──────┘ │      ┌───────────────┐      │   └─────┘
                       └─────▶│ Action        │──────┘
                         ✗    │ (Incomplete)  │
                              └───────────────┘
```

**Step-by-step:**

| Step | Node | What Happens |
|------|------|--------------|
| 1 | **Trigger** | Workflow starts |
| 2 | **HTTP** | Fetches todo with `completed: true` or `false` |
| 3 | **Condition** | Checks: Is `completed === true`? |
| 4a | **Action (top)** | Runs if TRUE → marks as done |
| 4b | **Action (bottom)** | Runs if FALSE → needs work |
| 5 | **End** | Both paths merge here |

**Node Configurations:**

```javascript
// HTTP Node Config
{
  method: 'GET',
  url: 'https://jsonplaceholder.typicode.com/todos/1'
}

// Condition Node Config
{
  conditionType: 'javascript',
  js_condition: 'return ctx.lastResult?.data?.completed === true;'
}
```

**Expected Outputs:**

If `completed: true`:
```
→ output_1 (top branch) → Action "Completed" → End
```

If `completed: false`:
```
→ output_2 (bottom branch) → Action "Incomplete" → End
```

**Key Concepts:**
- Condition node has **2 outputs**: `output_1` (true) and `output_2` (false)
- Use `ctx.lastResult.data` to access previous node's response
- JavaScript condition must `return true` or `return false`
- Both branches can merge back to a single End node

---

### 4. Loop Example

**What it does:** Iterates over an array of numbers, processing each one individually.

**Real-world use case:** Processing each order in a batch, sending individual emails to a list of recipients.

**ASCII Diagram:**
```
┌─────────┐    ┌──────┐    ┌───────────┐
│ Trigger │───▶│ Loop │───▶│ Transform │──┐
│ [1,2,3] │    │      │    │  x * 2    │  │
└─────────┘    └──┬───┘    └───────────┘  │
                  │              ▲         │
                  │              └─────────┘
                  │           (loops back)
                  ▼
             ┌────────┐
             │  End   │
             │ (Done) │
             └────────┘
```

**Step-by-step:**

| Step | Node | What Happens |
|------|------|--------------|
| 1 | **Trigger** | Provides `{ items: [1, 2, 3, 4, 5] }` |
| 2 | **Loop** | Takes array, sets `ctx.item = 1`, `ctx.index = 0` |
| 3 | **Transform** | Returns `{ value: 2, original: 1 }` |
| 4 | _(back to Loop)_ | Sets `ctx.item = 2`, `ctx.index = 1` |
| 5 | **Transform** | Returns `{ value: 4, original: 2 }` |
| ... | ... | Continues for all items |
| N | **End** | After last item, exits via `output_2` |

**Node Configurations:**

```javascript
// Trigger Node Config
{
  triggerType: 'manual',
  initialData: '{"items": [1, 2, 3, 4, 5]}'
}

// Loop Node Config
{
  source: '{{lastResult.data.items}}'
}

// Transform Node Config
{
  transformType: 'javascript',
  code: 'return { value: ctx.item * 2, original: ctx.item };'
}
```

**Expected Output (per iteration):**
```json
// Iteration 1: ctx.item = 1, ctx.index = 0
{ "value": 2, "original": 1 }

// Iteration 2: ctx.item = 2, ctx.index = 1
{ "value": 4, "original": 2 }

// Iteration 3: ctx.item = 3, ctx.index = 2
{ "value": 6, "original": 3 }
```

**Key Concepts:**
- Loop has **2 outputs**: `output_1` (loop body) and `output_2` (done)
- `ctx.item` = current array element
- `ctx.index` = current iteration index (0-based)
- Connect loop body back to Loop node for iteration
- When array exhausted, flow goes to `output_2`

---

### 5. Notification Flow

**What it does:** Fetches a post and sends notifications via Email and Slack.

**Real-world use case:** Alerting multiple channels when an order comes in, notifying team of system events.

**ASCII Diagram:**
```
                              ┌───────────────┐
                         ✓    │ Email         │──────┐
                       ┌─────▶│ Notification  │      │
┌─────────┐   ┌──────┐ │      └───────────────┘      │   ┌─────┐
│ Trigger │──▶│ HTTP │─┤                             ├──▶│ End │
└─────────┘   └──────┘ │      ┌───────────────┐      │   └─────┘
                       └─────▶│ Slack         │──────┘
                              │ Notification  │
                              └───────────────┘
```

**Step-by-step:**

| Step | Node | What Happens |
|------|------|--------------|
| 1 | **Trigger** | Workflow starts |
| 2 | **HTTP** | Fetches post with title and body |
| 3a | **Email** | Sends email with post content |
| 3b | **Slack** | Posts message to #notifications |
| 4 | **End** | Both notifications sent |

**Node Configurations:**

```javascript
// HTTP Node Config
{
  method: 'GET',
  url: 'https://jsonplaceholder.typicode.com/posts/1'
}

// Email Node Config
{
  to: 'user@example.com',
  subject: 'New Post: {{lastResult.data.title}}',
  body: '{{lastResult.data.body}}'
}

// Slack Node Config
{
  channel: '#notifications',
  message: 'New post created: {{lastResult.data.title}}'
}
```

**Expected Output:**

Email sent:
```
To: user@example.com
Subject: New Post: sunt aut facere repellat provident...
Body: quia et suscipit suscipit recusandae...
```

Slack message:
```
#notifications: New post created: sunt aut facere repellat provident...
```

**Key Concepts:**
- `{{lastResult.data.title}}` = interpolation syntax
- Both Email and Slack are simulated in browser
- HTTP success (`output_1`) triggers both channels
- Multiple nodes can connect from same output

---

### 6. Error Handling

**What it does:** Makes a request to a URL that returns 500 error, demonstrating graceful failure handling.

**Real-world use case:** Gracefully handling API failures, logging errors, alerting when services are down.

**ASCII Diagram:**
```
                              ┌───────────────┐
                         ✓    │ Action        │──────┐
                       ┌─────▶│ (Success!)    │      │
┌─────────┐   ┌──────┐ │      └───────────────┘      │   ┌─────┐
│ Trigger │──▶│ HTTP │─┤                             ├──▶│ End │
└─────────┘   └──────┘ │      ┌───────────────┐      │   └─────┘
                       └─────▶│ Action        │──────┘
                     ERROR    │ (Handle Err)  │
                              └───────────────┘
```

**Step-by-step:**

| Step | Node | What Happens |
|------|------|--------------|
| 1 | **Trigger** | Workflow starts |
| 2 | **HTTP** | Calls httpstat.us/500 → returns 500 error |
| 3a | **Action (top)** | Would run on success (skipped here) |
| 3b | **Action (bottom)** | Runs because HTTP failed |
| 4 | **End** | Error was handled gracefully |

**Node Configurations:**

```javascript
// HTTP Node Config
{
  method: 'GET',
  url: 'https://httpstat.us/500',
  ignore_errors: false  // Important! Routes errors to output_2
}
```

**Expected Output:**

HTTP fails with 500:
```json
{
  "output": "output_2",
  "error": "500 Internal Server Error",
  "ok": false,
  "status": 500
}
```

Then flows to Action (bottom) for error handling.

**Key Concepts:**
- HTTP node has 2 outputs: `output_1` (success) and `output_2` (error)
- Success = status 200-299
- Error = status 400+, network error, timeout
- `ignore_errors: false` sends errors to `output_2`
- `ignore_errors: true` would continue to `output_1` with error info

---

## Complex Examples

---

### 7. Full API Workflow

**What it does:** Complete API integration with authentication, validation, multiple requests, and data filtering.

**Real-world use case:** Building a user dashboard that pulls and filters data based on user profile.

**ASCII Diagram:**
```
┌─────────┐   ┌──────┐   ┌───────────┐   ┌──────┐   ┌───────────┐   ┌────────┐   ┌─────┐
│ Trigger │──▶│ HTTP │──▶│ Condition │──▶│ HTTP │──▶│ Transform │──▶│ Filter │──▶│ End │
│ userId  │   │ User │   │ Has Co?   │   │Posts │   │  Merge    │   │ >20chr │   │     │
└─────────┘   └──────┘   └─────┬─────┘   └──────┘   └───────────┘   └────────┘   └──┬──┘
                               │                                                    │
                               │ (no company)                                       │
                               ▼                                                    │
                         ┌───────────┐                                              │
                         │  Action   │──────────────────────────────────────────────┘
                         │Log Invalid│
                         └───────────┘
```

**Step-by-step:**

| Step | Node | What Happens |
|------|------|--------------|
| 1 | **Trigger** | Starts with `{ userId: 1 }` |
| 2 | **HTTP #1** | GET `/users/1` with auth headers |
| 3 | **Condition** | Check if `company.name` exists |
| 4a | **HTTP #2** | If yes: GET user's posts |
| 4b | **Action** | If no: Log "Invalid User" |
| 5 | **Transform** | Combine: `{ user, posts, postCount }` |
| 6 | **Filter** | Keep posts where `title.length > 20` |
| 7 | **End** | Final filtered data |

**Node Configurations:**

```javascript
// Trigger Config
{
  triggerType: 'manual',
  initialData: '{"userId": 1}'
}

// HTTP #1 - User with Auth
{
  method: 'GET',
  url: 'https://jsonplaceholder.typicode.com/users/{{data.userId}}',
  headers: '{"Authorization": "Bearer token123", "Accept": "application/json"}'
}

// Condition - Check Company
{
  conditionType: 'field',
  field: 'company.name',
  operator: 'not_empty'
}

// HTTP #2 - Get Posts
{
  method: 'GET',
  url: 'https://jsonplaceholder.typicode.com/posts?userId={{node_2.data.id}}'
}

// Transform - Combine Data
{
  transformType: 'javascript',
  code: 'return { user: ctx.node_2.data, posts: data, postCount: data.length };'
}

// Filter - Title Length
{
  source: '{{lastResult.data.posts}}',
  filter_type: 'javascript',
  filter_code: 'return item.title && item.title.length > 20;'
}
```

**Expected Output:**
```json
{
  "data": [
    { "id": 1, "title": "sunt aut facere repellat provident occaecati excepturi optio reprehenderit", "userId": 1 },
    { "id": 2, "title": "qui est esse", "userId": 1 }
  ],
  "originalCount": 10,
  "filteredCount": 8
}
```

**Key Concepts:**
- `{{data.userId}}` accesses trigger's initialData
- `{{node_2.data.id}}` accesses a specific node's result by ID
- Nested field access: `company.name`
- Filter processes items one-by-one with `item`

---

### 8. Data Enrichment Pipeline

**What it does:** For each user, fetch their posts AND todos, then merge all data together.

**Real-world use case:** Building complete customer profiles from multiple microservices.

**ASCII Diagram:**
```
┌─────────┐   ┌──────┐   ┌──────┐   ┌──────────┐   ┌──────────┐   ┌───────────┐
│ Trigger │──▶│ HTTP │──▶│ Loop │──▶│ HTTP     │──▶│ HTTP     │──▶│ Transform │─┐
│         │   │Users │   │      │   │ Posts    │   │ Todos    │   │ Merge All │ │
└─────────┘   └──────┘   └──┬───┘   └──────────┘   └──────────┘   └───────────┘ │
                            │                                           │        │
                            │                                    ┌──────┘        │
                            │                                    │ (loop back)   │
                            ▼                                    │               │
                       ┌────────┐                                │               │
                       │  End   │◀───────────────────────────────┘               │
                       │ (Done) │                                                │
                       └────────┘
```

**Step-by-step:**

| Step | Node | What Happens |
|------|------|--------------|
| 1 | **Trigger** | Start workflow |
| 2 | **HTTP** | Fetch all 10 users |
| 3 | **Loop** | For each user: `ctx.item = user` |
| 4 | **HTTP** | GET `/posts?userId={{item.id}}` |
| 5 | **HTTP** | GET `/todos?userId={{item.id}}` |
| 6 | **Transform** | Merge: `{ user, posts, todos }` |
| 7 | _(loop back)_ | Continue with next user |
| 8 | **End** | After all users processed |

**Node Configurations:**

```javascript
// Loop Config
{
  source: '{{lastResult.data}}'
}

// HTTP Posts (inside loop)
{
  method: 'GET',
  url: 'https://jsonplaceholder.typicode.com/posts?userId={{item.id}}'
}

// HTTP Todos (inside loop)
{
  method: 'GET',
  url: 'https://jsonplaceholder.typicode.com/todos?userId={{item.id}}'
}

// Transform - Merge
{
  transformType: 'javascript',
  code: 'return { user: ctx.item, posts: ctx.node_4?.data, todos: data };'
}
```

**Expected Output (per iteration):**
```json
{
  "user": { "id": 1, "name": "Leanne Graham", "email": "..." },
  "posts": [ { "id": 1, "title": "..." }, { "id": 2, "title": "..." } ],
  "todos": [ { "id": 1, "completed": false }, { "id": 2, "completed": true } ]
}
```

**Key Concepts:**
- `{{item.id}}` accesses current loop item's property
- `ctx.node_4?.data` accesses specific node result (safe access)
- Loop body can have multiple nodes before looping back
- Connect last node of loop body back to Loop node

---

### 9. Multi-Channel Alert System

**What it does:** Monitors API health every 5 minutes, sends alerts via Email, Slack, AND PagerDuty when unhealthy.

**Real-world use case:** Production monitoring that alerts ops team through multiple channels.

**ASCII Diagram:**
```
                                                    ┌─────────┐
                                               ✓    │ Action  │──────────────────────┐
                                             ┌─────▶│ Log OK  │                      │
┌─────────┐   ┌──────┐   ┌───────────┐       │      └─────────┘                      │
│Schedule │──▶│ HTTP │──▶│ Condition │───────┤                                       │
│ */5min  │   │Health│   │ healthy?  │       │      ┌─────────┐   ┌──────────────┐   │  ┌─────┐
└─────────┘   └──────┘   └───────────┘       │      │ Email   │──▶│ HTTP         │───┼─▶│ End │
                                             └─────▶│ Alert   │   │ PagerDuty    │   │  └─────┘
                                               ✗    ├─────────┤   └──────────────┘   │
                                                    │ Slack   │───────────┬──────────┘
                                                    │ Alert   │           │
                                                    └─────────┘           │
                                                                          └──────────▶
```

**Step-by-step:**

| Step | Node | What Happens |
|------|------|--------------|
| 1 | **Trigger** | Cron: every 5 minutes `*/5 * * * *` |
| 2 | **HTTP** | Check health endpoint (5s timeout) |
| 3 | **Condition** | Is `status === 'healthy'`? |
| 4a | **Action** | If healthy: Log success |
| 4b | **Email** | If unhealthy: Email ops team |
| 4c | **Slack** | If unhealthy: Post to #alerts |
| 5 | **HTTP** | Create PagerDuty incident |
| 6 | **End** | Monitoring cycle complete |

**Node Configurations:**

```javascript
// Trigger - Schedule
{
  triggerType: 'schedule',
  cronExpression: '*/5 * * * *'  // Every 5 minutes
}

// HTTP - Health Check
{
  method: 'GET',
  url: 'https://api.example.com/health',
  timeout_seconds: 5  // Fail fast if no response
}

// Condition - Check Status
{
  conditionType: 'field',
  field: 'status',
  operator: 'equals',
  value: 'healthy'
}

// Email - Alert
{
  to: 'ops-team@example.com',
  subject: 'API Alert: Service Unhealthy',
  body: 'Health check failed at {{timestamp}}. Status: {{lastResult.data.status}}'
}

// Slack - Alert
{
  channel: '#alerts',
  message: 'API DOWN - Health check failed! Status: {{lastResult.data.status}}'
}

// HTTP - PagerDuty
{
  method: 'POST',
  url: 'https://api.pagerduty.com/incidents',
  headers: '{"Authorization": "Token token=YOUR_KEY"}',
  body: '{"title": "Service Down", "severity": "critical"}'
}
```

**Expected Output (unhealthy):**
```
1. Email sent to ops-team@example.com
2. Slack message to #alerts
3. PagerDuty incident created
4. All channels notified in parallel
```

**Key Concepts:**
- Schedule trigger uses cron syntax
- `timeout_seconds` prevents hanging on slow endpoints
- Multiple nodes can connect from same output (parallel execution)
- `{{timestamp}}` is auto-generated at execution time

---

### 10. ETL Pipeline

**What it does:** Complete Extract-Transform-Load pipeline that processes data nightly.

**Real-world use case:** Nightly data sync between systems, data warehouse loading, batch processing.

**ASCII Diagram:**
```
┌────────┐  ┌──────┐  ┌────────┐  ┌───────────┐  ┌──────┐  ┌───────────┐  ┌──────────┐
│Schedule│─▶│ HTTP │─▶│ Filter │─▶│ Transform │─▶│ Loop │─▶│ Condition │─▶│ Database │─┐
│ 2AM    │  │ GET  │  │userId≤2│  │ Uppercase │  │      │  │wordCount>10  │long_posts│ │
└────────┘  └──────┘  └────────┘  └───────────┘  └──┬───┘  └─────┬─────┘  └──────────┘ │
                                                    │            │                     │
                                                    │            │ (≤10 words)         │
                                                    │            ▼                     │
                                                    │      ┌──────────┐               │
                                                    │      │ Database │───────────────┤
                                                    │      │short_posts│              │
                                                    │      └──────────┘               │
                                                    │                                  │
                                                    ▼ (done)                          │
                                             ┌───────────┐   ┌────────┐   ┌─────┐     │
                                             │ Transform │──▶│ Email  │──▶│ End │◀────┘
                                             │  Summary  │   │ Report │   └─────┘
                                             └───────────┘   └────────┘
```

**Step-by-step:**

| Step | Node | What Happens |
|------|------|-------------|
| 1 | **Schedule** | Daily at 2 AM: `0 2 * * *` |
| 2 | **HTTP** | EXTRACT: Fetch all posts from API |
| 3 | **Filter** | Keep only posts from users 1-2 |
| 4 | **Transform** | Uppercase titles, add word count |
| 5 | **Loop** | Process each post individually |
| 6 | **Condition** | Is `wordCount > 10`? |
| 7a | **Database** | If yes: INSERT into `long_posts` |
| 7b | **Database** | If no: INSERT into `short_posts` |
| 8 | **Transform** | Create summary stats |
| 9 | **Email** | Send completion report |
| 10 | **End** | Pipeline complete |

**Node Configurations:**

```javascript
// Trigger - Daily Schedule
{
  triggerType: 'schedule',
  cronExpression: '0 2 * * *'  // 2:00 AM daily
}

// HTTP - Extract
{
  method: 'GET',
  url: 'https://jsonplaceholder.typicode.com/posts'
}

// Filter - User Filter
{
  source: '{{lastResult.data}}',
  filter_type: 'javascript',
  filter_code: 'return item.userId <= 2;'
}

// Transform - Add Word Count
{
  transformType: 'javascript',
  code: `return data.map(p => ({ 
    id: p.id, 
    title: p.title.toUpperCase(), 
    author: p.userId, 
    wordCount: p.body.split(" ").length 
  }));`
}

// Loop - Iterate Posts
{
  source: '{{lastResult.data}}'
}

// Condition - Check Length
{
  conditionType: 'field',
  field: 'wordCount',
  operator: 'greater_than',
  value: '10'
}

// Database - Long Posts
{
  operation: 'insert',
  table: 'long_posts',
  data: '{{item}}'
}

// Database - Short Posts
{
  operation: 'insert',
  table: 'short_posts',
  data: '{{item}}'
}

// Transform - Summary
{
  transformType: 'javascript',
  code: 'return { processed: ctx.index + 1, timestamp: new Date().toISOString() };'
}

// Email - Report
{
  to: 'data-team@example.com',
  subject: 'ETL Pipeline Complete',
  body: 'Processed {{lastResult.data.processed}} records at {{lastResult.data.timestamp}}'
}
```

**Expected Output:**

Transformed data (per item):
```json
{
  "id": 1,
  "title": "SUNT AUT FACERE REPELLAT PROVIDENT...",
  "author": 1,
  "wordCount": 47
}
```

Summary email:
```
To: data-team@example.com
Subject: ETL Pipeline Complete
Body: Processed 20 records at 2026-04-12T02:15:00.000Z
```

**Key Concepts:**
- Schedule uses standard cron: `minute hour day month weekday`
- Filter reduces dataset before processing
- Transform can add new fields like `wordCount`
- Condition inside loop routes each item differently
- `{{item}}` in database = current loop item as JSON
- Summary after loop has `ctx.index` = last processed index

---

## Context Variables Reference

### Variables Always Available

| Variable | Description | Example |
|----------|-------------|---------|
| `ctx` | Full execution context | `ctx.lastResult` |
| `ctx.lastResult` | Result from previous node | `ctx.lastResult.data` |
| `ctx.lastResult.data` | Response body / data payload | `ctx.lastResult.data.title` |
| `ctx.node_N` | Result from specific node by ID | `ctx.node_2.data` |
| `data` | Shortcut for `ctx.lastResult.data` | `data.map(...)` |

### Variables Inside Loops

| Variable | Description | Example |
|----------|-------------|---------|
| `ctx.item` | Current item being processed | `ctx.item.id` |
| `ctx.index` | Current iteration (0-based) | `ctx.index + 1` |
| `item` | Alias (in filter code) | `return item.active;` |
| `index` | Alias (in filter code) | `return index < 5;` |

### Interpolation Syntax

```javascript
// Simple field access
'{{lastResult.data.name}}'

// Nested objects
'{{lastResult.data.user.address.city}}'

// Loop item
'{{item.id}}'  
'{{ctx.item.name}}'

// Specific node
'{{node_3.data.posts}}'

// Array index
'{{lastResult.data.items[0].name}}'
```

### HTTP Response Structure

```javascript
// After HTTP node executes, lastResult contains:
{
  data: { ... },          // Response body (JSON parsed)
  status: 200,            // HTTP status code
  statusText: 'OK',       // Status text
  ok: true,               // Was 2xx status?
  headers: { ... },       // Response headers
  url: 'https://...',     // Final URL (after redirects)
  request: { ... }        // Echo of what was sent
}
```

### Transform Function Patterns

```javascript
// Map array to new format
return data.map(item => ({ id: item.id, name: item.name }));

// Filter array
return data.filter(item => item.active === true);

// Extract single value
return data[0];

// Combine multiple node results
return { 
  user: ctx.node_2.data, 
  posts: ctx.node_4.data,
  total: ctx.node_4.data.length
};

// Process current loop item
return { 
  doubled: ctx.item * 2,
  index: ctx.index 
};

// Access nested data safely
return ctx.lastResult?.data?.user?.name || 'Unknown';
```

---

## How to Load Examples

In VizFlow, click the **Examples** dropdown and select any example:

1. **Study** - Click nodes to see configurations
2. **Modify** - Change settings, add nodes
3. **Run** - Click ▶️ play button
4. **Debug** - Open console panel to see execution log

---

## Need Help?

- **GitHub:** https://github.com/ehteshamnasim/vizflow
- **Live Demo:** https://viz-flow.netlify.app/
