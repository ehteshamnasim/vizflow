/**
 * DEFAULT NODE TYPES - With SVG Icons
 * All nodes use SVG icons. Export "icons" to use any icon with any node.
 */

// SVG Icon Library - Use any of these with any node
export const icons = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>',
  database: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 5v14c0 1.66-4 3-9 3s-9-1.34-9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>',
  server: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>',
  cloud: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>',
  aws: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.763 10.036c0 .296.032.535.088.71.064.176.144.368.256.576.04.063.056.127.056.183 0 .08-.048.16-.152.24l-.503.335a.383.383 0 0 1-.208.072c-.08 0-.16-.04-.239-.112a2.47 2.47 0 0 1-.287-.375 6.18 6.18 0 0 1-.248-.471c-.622.734-1.405 1.101-2.347 1.101-.67 0-1.205-.191-1.596-.574-.391-.384-.59-.894-.59-1.533 0-.678.239-1.23.726-1.644.487-.415 1.133-.623 1.955-.623.272 0 .551.024.846.064.296.04.6.104.918.176v-.583c0-.607-.127-1.03-.375-1.277-.255-.248-.686-.367-1.3-.367-.28 0-.568.031-.863.103-.296.072-.583.16-.862.272a2.287 2.287 0 0 1-.28.104.488.488 0 0 1-.127.023c-.112 0-.168-.08-.168-.247v-.391c0-.128.016-.224.056-.28a.597.597 0 0 1 .224-.167c.279-.144.614-.264 1.005-.36a4.84 4.84 0 0 1 1.246-.151c.95 0 1.644.216 2.091.647.439.43.662 1.085.662 1.963v2.586z"/></svg>',
  lambda: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 20l4-8-4-8h3l4 8-4 8H6zm6 0l4-8-4-8h3l4 8-4 8h-3z"/></svg>',
  s3: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 8l8-4 8 4-8 4-8-4z"/><path d="M4 12l8 4 8-4"/><path d="M4 16l8 4 8-4"/></svg>',
  slack: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"/></svg>',
  email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,6 12,13 2,6"/></svg>',
  webhook: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>',
  code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  nodejs: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.998 24c-.321 0-.641-.084-.922-.247l-2.936-1.737c-.438-.245-.224-.332-.08-.383.585-.203.703-.25 1.328-.604.065-.037.151-.023.218.017l2.256 1.339a.29.29 0 0 0 .272 0l8.795-5.076a.277.277 0 0 0 .134-.238V6.921a.283.283 0 0 0-.137-.242l-8.791-5.072a.278.278 0 0 0-.271 0L3.075 6.68a.284.284 0 0 0-.139.241v10.15c0 .099.053.19.139.236l2.409 1.392c1.307.654 2.108-.116 2.108-.891V7.787c0-.142.114-.253.256-.253h1.115c.139 0 .255.112.255.253v10.021c0 1.745-.95 2.745-2.604 2.745-.508 0-.909 0-2.026-.551L2.28 18.675a1.857 1.857 0 0 1-.922-1.604V6.921c0-.659.353-1.275.922-1.603L11.076.242a1.919 1.919 0 0 1 1.846 0l8.794 5.076c.57.329.924.944.924 1.603v10.15c0 .659-.354 1.273-.924 1.604l-8.794 5.078c-.28.163-.6.247-.924.247z"/></svg>',
  python: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14.25.18l.9.2.73.26.59.3.45.32.34.34.25.34.16.33.1.3.04.26.02.2-.01.13V8.5l-.05.63-.13.55-.21.46-.26.38-.3.31-.33.25-.35.19-.35.14-.33.1-.3.07-.26.04-.21.02H8.77l-.69.05-.59.14-.5.22-.41.27-.33.32-.27.35-.2.36-.15.37-.1.35-.07.32-.04.27-.02.21v3.06H3.17l-.21-.03-.28-.07-.32-.12-.35-.18-.36-.26-.36-.36-.35-.46-.32-.59-.28-.73-.21-.88-.14-1.05-.05-1.23.06-1.22.16-1.04.24-.87.32-.71.36-.57.4-.44.42-.33.42-.24.4-.16.36-.1.32-.05.24-.01h8.16v-.83H6.18l-.01-2.75-.02-.37.05-.34.11-.31.17-.28.25-.26.31-.23.38-.2.44-.18.51-.15.58-.12.64-.1.71-.06.77-.04.84-.02 1.27.05z"/></svg>',
  github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>',
  docker: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.983 11.078h2.119a.186.186 0 0 0 .186-.185V9.006a.186.186 0 0 0-.186-.186h-2.119a.185.185 0 0 0-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 0 0 .186-.186V3.574a.186.186 0 0 0-.186-.185h-2.118a.185.185 0 0 0-.185.185v1.888c0 .102.082.185.185.186m0 2.716h2.118a.187.187 0 0 0 .186-.186V6.29a.186.186 0 0 0-.186-.185h-2.118a.185.185 0 0 0-.185.185v1.887c0 .102.082.185.185.186"/></svg>',
  kubernetes: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.204 14.35l.007.01-.999 2.413a5.171 5.171 0 0 1-2.075-2.597l2.578-.437.004.005a.44.44 0 0 1 .484.606z"/></svg>',
  branch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><path d="M6 9v6c0 3 3 3 6 3h3"/></svg>',
  merge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M6 9v3c0 3 3 3 6 3M18 9v3c0 3-3 3-6 3"/></svg>',
  filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>',
  loop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  schedule: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  json: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3"/><path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/></svg>',
  file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  http: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  api: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M8 10l4 4 4-4"/></svg>',
  terminal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  transform: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
  mongodb: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.193 9.555c-1.264-5.58-4.252-7.414-4.573-8.115-.28-.394-.53-.954-.735-1.44-.036.495-.055.685-.523 1.184-.723.566-4.438 3.682-4.74 10.02-.282 5.912 4.27 9.435 4.888 9.884l.07.05A73.49 73.49 0 0 1 11.91 24h.481c.114-1.032.284-2.056.51-3.07.417-.296.604-.463.85-.693a11.342 11.342 0 0 0 3.639-8.464c.01-.814-.103-1.662-.197-2.218z"/></svg>',
  redis: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 2.661l.54.997-1.797.644 2.409.379.378 1.15 1.15-1.15 2.38-.378-1.769-.645.54-.997-1.646.606zm9.94 6.074L12 12.294l-8.44-3.56v3.472l8.44 3.56 8.44-3.56z"/></svg>',
  
  // Visual/Icon nodes
  image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
  svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 12l3 3 7-7"/></svg>',
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  
  // Shape icons for flowcharts
  circle: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>',
  square: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>',
  diamond: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l10 10-10 10L2 12z"/></svg>',
  hexagon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l8 4.5v9L12 22l-8-4.5v-9z"/></svg>',
  triangle: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l10 18H2z"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  
  // Status/indicator icons
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L1 21h22L12 2zm0 4l7.5 13h-15L12 6zm-1 4v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  
  // People/user icons
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  
  // Action icons
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
  
  // Arrow icons
  arrowRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
  arrowLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
  arrowUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>',
  arrowDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>',
  
  // Misc icons
  zap: '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  unlock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>',
  key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  bookmark: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
  flag: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" stroke-width="2"/></svg>',
  tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
  layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
  cpu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>',
  activity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  pie: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
};

export const defaultNodeTypes = {
  // Core workflow nodes
  trigger: { label: 'Trigger', icon: icons.play, color: '#4CAF50', inputs: 0, outputs: 1, fields: [{ name: 'type', label: 'Type', type: 'select', default: 'manual', options: [{ value: 'manual', label: 'Manual' }, { value: 'webhook', label: 'Webhook' }, { value: 'schedule', label: 'Schedule' }] }] },
  action: { label: 'Action', icon: icons.terminal, color: '#2196F3', inputs: 1, outputs: 1, fields: [{ name: 'name', label: 'Name', type: 'text', default: '', placeholder: 'Action name...' }] },
  condition: { label: 'Condition', icon: icons.branch, color: '#FF9800', inputs: 1, outputs: 2, fields: [{ name: 'field', label: 'Field', type: 'text', default: '', placeholder: 'data.status' }] },
  loop: { label: 'Loop', icon: icons.loop, color: '#795548', inputs: 1, outputs: 2, fields: [{ name: 'array', label: 'Array', type: 'text', default: '', placeholder: 'data.items' }] },
  delay: { label: 'Delay', icon: icons.clock, color: '#607D8B', inputs: 1, outputs: 1, fields: [{ name: 'seconds', label: 'Seconds', type: 'number', default: 5 }] },
  end: { label: 'End', icon: icons.stop, color: '#F44336', inputs: 1, outputs: 0, fields: [] },
  
  // Database nodes
  database: { label: 'Database', icon: icons.database, color: '#3F51B5', inputs: 1, outputs: 1, fields: [{ name: 'query', label: 'Query', type: 'textarea', default: '', placeholder: 'SELECT...' }] },
  mongodb: { label: 'MongoDB', icon: icons.mongodb, color: '#47A248', inputs: 1, outputs: 1, fields: [{ name: 'collection', label: 'Collection', type: 'text', default: '' }] },
  redis: { label: 'Redis', icon: icons.redis, color: '#DC382D', inputs: 1, outputs: 1, fields: [{ name: 'command', label: 'Command', type: 'text', default: 'GET' }] },
  
  // Cloud/AWS nodes
  aws: { label: 'AWS', icon: icons.aws, color: '#FF9900', inputs: 1, outputs: 1, fields: [{ name: 'service', label: 'Service', type: 'select', default: 'lambda', options: [{ value: 'lambda', label: 'Lambda' }, { value: 's3', label: 'S3' }, { value: 'sns', label: 'SNS' }, { value: 'sqs', label: 'SQS' }] }] },
  lambda: { label: 'Lambda', icon: icons.lambda, color: '#FF9900', inputs: 1, outputs: 1, fields: [{ name: 'function', label: 'Function', type: 'text', default: '' }] },
  s3: { label: 'S3', icon: icons.s3, color: '#569A31', inputs: 1, outputs: 1, fields: [{ name: 'bucket', label: 'Bucket', type: 'text', default: '' }] },
  
  // DevOps nodes
  docker: { label: 'Docker', icon: icons.docker, color: '#2496ED', inputs: 1, outputs: 1, fields: [{ name: 'image', label: 'Image', type: 'text', default: '', placeholder: 'nginx:latest' }] },
  kubernetes: { label: 'Kubernetes', icon: icons.kubernetes, color: '#326CE5', inputs: 1, outputs: 1, fields: [{ name: 'resource', label: 'Resource', type: 'text', default: '' }] },
  github: { label: 'GitHub', icon: icons.github, color: '#181717', inputs: 1, outputs: 1, fields: [{ name: 'repo', label: 'Repository', type: 'text', default: '', placeholder: 'owner/repo' }] },
  
  // Code execution nodes
  code: { label: 'Code', icon: icons.code, color: '#607D8B', inputs: 1, outputs: 1, fields: [{ name: 'code', label: 'Code', type: 'textarea', default: '' }] },
  nodejs: { label: 'Node.js', icon: icons.nodejs, color: '#339933', inputs: 1, outputs: 1, fields: [{ name: 'script', label: 'Script', type: 'textarea', default: '' }] },
  python: { label: 'Python', icon: icons.python, color: '#3776AB', inputs: 1, outputs: 1, fields: [{ name: 'script', label: 'Script', type: 'textarea', default: '' }] },
  
  // API/HTTP nodes
  http: { label: 'HTTP', icon: icons.http, color: '#9C27B0', inputs: 1, outputs: 1, fields: [{ name: 'method', label: 'Method', type: 'select', default: 'GET', options: [{ value: 'GET', label: 'GET' }, { value: 'POST', label: 'POST' }, { value: 'PUT', label: 'PUT' }, { value: 'DELETE', label: 'DELETE' }] }, { name: 'url', label: 'URL', type: 'text', default: '' }] },
  webhook: { label: 'Webhook', icon: icons.webhook, color: '#6366F1', inputs: 1, outputs: 1, fields: [{ name: 'url', label: 'URL', type: 'text', default: '' }] },
  api: { label: 'API', icon: icons.api, color: '#8B5CF6', inputs: 1, outputs: 1, fields: [{ name: 'endpoint', label: 'Endpoint', type: 'text', default: '' }] },
  
  // API Data node - fetches data and stores in localStorage with visual preview
  api_data: { 
    label: 'API Data', 
    icon: icons.database, 
    color: '#10B981', 
    inputs: 1, 
    outputs: 1, 
    fields: [
      { name: 'url', label: 'API URL', type: 'text', default: '', placeholder: 'https://api.example.com/data' },
      { name: 'method', label: 'Method', type: 'select', default: 'GET', options: [{ value: 'GET', label: 'GET' }, { value: 'POST', label: 'POST' }] },
      { name: 'storageKey', label: 'Storage Key', type: 'text', default: 'api_data', placeholder: 'unique_key' },
      { name: 'autoFetch', label: 'Auto-fetch on load', type: 'checkbox', default: false }
    ],
    // Custom template with data preview
    template: `
      <div class="workflow-node api-data-node wide">
        <div class="node-header">
          <span class="node-icon">${icons.database}</span>
          <span class="node-label">API Data</span>
        </div>
        <div class="node-body">
          <div class="api-status">
            <span class="api-status-dot"></span>
            <span class="api-status-text">Ready</span>
          </div>
        </div>
        <div class="node-data-preview">
          <pre class="data-content"><span class="data-empty">No data loaded</span></pre>
        </div>
      </div>
    `
  },
  
  // Communication nodes
  email: { label: 'Email', icon: icons.email, color: '#E91E63', inputs: 1, outputs: 1, fields: [{ name: 'to', label: 'To', type: 'text', default: '' }] },
  slack: { label: 'Slack', icon: icons.slack, color: '#4A154B', inputs: 1, outputs: 1, fields: [{ name: 'channel', label: 'Channel', type: 'text', default: '#general' }] },
  
  // Data transformation nodes
  transform: { label: 'Transform', icon: icons.transform, color: '#00BCD4', inputs: 1, outputs: 1, fields: [] },
  filter: { label: 'Filter', icon: icons.filter, color: '#8B5CF6', inputs: 1, outputs: 1, fields: [] },
  merge: { label: 'Merge', icon: icons.merge, color: '#F59E0B', inputs: 2, outputs: 1, fields: [] },
  json: { label: 'JSON', icon: icons.json, color: '#6B7280', inputs: 1, outputs: 1, fields: [{ name: 'data', label: 'Data', type: 'textarea', default: '{}' }] },
  
  // Infrastructure nodes
  server: { label: 'Server', icon: icons.server, color: '#475569', inputs: 1, outputs: 1, fields: [{ name: 'host', label: 'Host', type: 'text', default: '' }] },
  cloud: { label: 'Cloud', icon: icons.cloud, color: '#0284C7', inputs: 1, outputs: 1, fields: [{ name: 'provider', label: 'Provider', type: 'select', default: 'aws', options: [{ value: 'aws', label: 'AWS' }, { value: 'azure', label: 'Azure' }, { value: 'gcp', label: 'GCP' }] }] },
  
  // Utility nodes
  note: { label: 'Note', icon: icons.note, color: '#9E9E9E', inputs: 0, outputs: 0, fields: [{ name: 'text', label: 'Note', type: 'textarea', default: '' }] },
  file: { label: 'File', icon: icons.file, color: '#64748B', inputs: 1, outputs: 1, fields: [{ name: 'path', label: 'Path', type: 'text', default: '' }] },
  settings: { label: 'Config', icon: icons.settings, color: '#71717A', inputs: 0, outputs: 1, fields: [{ name: 'config', label: 'Config', type: 'textarea', default: '{}' }] },
  schedule: { label: 'Schedule', icon: icons.schedule, color: '#10B981', inputs: 0, outputs: 1, fields: [{ name: 'cron', label: 'Cron', type: 'text', default: '0 * * * *' }] },

  // Simple shapes (Mermaid-style, no fields)
  start: { label: 'Start', icon: icons.play, color: '#22C55E', inputs: 0, outputs: 1, fields: [] },
  stop: { label: 'Stop', icon: icons.stop, color: '#EF4444', inputs: 1, outputs: 0, fields: [] },
  process: { label: 'Process', icon: icons.terminal, color: '#02514a', inputs: 1, outputs: 1, fields: [] },
  decision: { label: 'Decision', icon: icons.branch, color: '#F59E0B', inputs: 1, outputs: 2, fields: [] },
  data: { label: 'Data', icon: icons.database, color: '#8B5CF6', inputs: 1, outputs: 1, fields: [] },
  document: { label: 'Document', icon: icons.file, color: '#6B7280', inputs: 1, outputs: 1, fields: [] },
  connector: { label: 'Connector', icon: icons.webhook, color: '#64748B', inputs: 1, outputs: 1, fields: [] },
  subprocess: { label: 'Subprocess', icon: icons.code, color: '#0EA5E9', inputs: 1, outputs: 1, fields: [] },
  
  // Visual/Icon nodes (SVG & Image based)
  image: { label: 'Image', icon: icons.image, color: '#EC4899', inputs: 1, outputs: 1, fields: [{ name: 'src', label: 'Image URL', type: 'text', default: '', placeholder: 'https://...' }] },
  svg: { label: 'SVG', icon: icons.svg, color: '#F472B6', inputs: 1, outputs: 1, fields: [{ name: 'svg', label: 'SVG Code', type: 'textarea', default: '<svg>...</svg>' }] },
  icon: { label: 'Icon', icon: icons.icon, color: '#A855F7', inputs: 1, outputs: 1, fields: [{ name: 'name', label: 'Icon Name', type: 'text', default: '' }] },
  
  // Shape nodes (flowchart symbols) - iconOnly mode for big icon display
  circle: { label: 'Circle', icon: icons.circle, color: '#02514a', inputs: 1, outputs: 1, fields: [], iconOnly: true },
  square: { label: 'Square', icon: icons.square, color: '#6366F1', inputs: 1, outputs: 1, fields: [], iconOnly: true },
  diamond: { label: 'Diamond', icon: icons.diamond, color: '#F59E0B', inputs: 1, outputs: 2, fields: [], iconOnly: true },
  hexagon: { label: 'Hexagon', icon: icons.hexagon, color: '#8B5CF6', inputs: 1, outputs: 1, fields: [], iconOnly: true },
  triangle: { label: 'Triangle', icon: icons.triangle, color: '#EF4444', inputs: 1, outputs: 1, fields: [], iconOnly: true },
  star: { label: 'Star', icon: icons.star, color: '#FBBF24', inputs: 1, outputs: 1, fields: [], iconOnly: true },
  heart: { label: 'Heart', icon: icons.heart, color: '#EC4899', inputs: 1, outputs: 1, fields: [], iconOnly: true },
  
  // Status/Indicator nodes - iconOnly mode
  success: { label: 'Success', icon: icons.check, color: '#22C55E', inputs: 1, outputs: 1, fields: [], iconOnly: true },
  error: { label: 'Error', icon: icons.x, color: '#EF4444', inputs: 1, outputs: 1, fields: [], iconOnly: true },
  warning: { label: 'Warning', icon: icons.alert, color: '#F59E0B', inputs: 1, outputs: 1, fields: [], iconOnly: true },
  info: { label: 'Info', icon: icons.info, color: '#02514a', inputs: 1, outputs: 1, fields: [], iconOnly: true },
  notification: { label: 'Notification', icon: icons.bell, color: '#F97316', inputs: 1, outputs: 1, fields: [{ name: 'message', label: 'Message', type: 'text', default: '' }] },
  
  // People/User nodes
  user: { label: 'User', icon: icons.user, color: '#6366F1', inputs: 1, outputs: 1, fields: [{ name: 'name', label: 'Name', type: 'text', default: '' }] },
  users: { label: 'Users', icon: icons.users, color: '#8B5CF6', inputs: 1, outputs: 1, fields: [], iconOnly: true },
  
  // Action nodes
  download: { label: 'Download', icon: icons.download, color: '#10B981', inputs: 1, outputs: 1, fields: [{ name: 'url', label: 'URL', type: 'text', default: '' }] },
  upload: { label: 'Upload', icon: icons.upload, color: '#0EA5E9', inputs: 1, outputs: 1, fields: [{ name: 'destination', label: 'Destination', type: 'text', default: '' }] },
  search: { label: 'Search', icon: icons.search, color: '#6366F1', inputs: 1, outputs: 1, fields: [{ name: 'query', label: 'Query', type: 'text', default: '' }] },
  link: { label: 'Link', icon: icons.link, color: '#02514a', inputs: 1, outputs: 1, fields: [{ name: 'url', label: 'URL', type: 'text', default: '' }] },
  folder: { label: 'Folder', icon: icons.folder, color: '#F59E0B', inputs: 1, outputs: 1, fields: [{ name: 'path', label: 'Path', type: 'text', default: '' }] },
  trash: { label: 'Delete', icon: icons.trash, color: '#EF4444', inputs: 1, outputs: 1, fields: [], iconOnly: true },
  edit: { label: 'Edit', icon: icons.edit, color: '#8B5CF6', inputs: 1, outputs: 1, fields: [], iconOnly: true },
  copy: { label: 'Copy', icon: icons.copy, color: '#64748B', inputs: 1, outputs: 1, fields: [], iconOnly: true },
  refresh: { label: 'Refresh', icon: icons.refresh, color: '#0EA5E9', inputs: 1, outputs: 1, fields: [], iconOnly: true },
  
  // Arrow/Direction nodes - iconOnly
  arrowRight: { label: 'Arrow →', icon: icons.arrowRight, color: '#64748B', inputs: 1, outputs: 1, fields: [], iconOnly: true },
  arrowLeft: { label: 'Arrow ←', icon: icons.arrowLeft, color: '#64748B', inputs: 1, outputs: 1, fields: [], iconOnly: true },
  arrowUp: { label: 'Arrow ↑', icon: icons.arrowUp, color: '#64748B', inputs: 1, outputs: 1, fields: [], iconOnly: true },
  arrowDown: { label: 'Arrow ↓', icon: icons.arrowDown, color: '#64748B', inputs: 1, outputs: 1, fields: [], iconOnly: true },
  
  // Misc icon nodes - iconOnly for pure icons
  zap: { label: 'Zap', icon: icons.zap, color: '#FBBF24', inputs: 1, outputs: 1, fields: [], iconOnly: true },
  lock: { label: 'Lock', icon: icons.lock, color: '#EF4444', inputs: 1, outputs: 1, fields: [], iconOnly: true },
  unlock: { label: 'Unlock', icon: icons.unlock, color: '#22C55E', inputs: 1, outputs: 1, fields: [], iconOnly: true },
  key: { label: 'Key', icon: icons.key, color: '#F59E0B', inputs: 1, outputs: 1, fields: [{ name: 'key', label: 'API Key', type: 'text', default: '' }] },
  globe: { label: 'Globe', icon: icons.globe, color: '#02514a', inputs: 1, outputs: 1, fields: [], iconOnly: true },
  home: { label: 'Home', icon: icons.home, color: '#6366F1', inputs: 0, outputs: 1, fields: [], iconOnly: true },
  bookmark: { label: 'Bookmark', icon: icons.bookmark, color: '#F97316', inputs: 1, outputs: 1, fields: [], iconOnly: true },
  flag: { label: 'Flag', icon: icons.flag, color: '#EF4444', inputs: 1, outputs: 1, fields: [], iconOnly: true },
  tag: { label: 'Tag', icon: icons.tag, color: '#8B5CF6', inputs: 1, outputs: 1, fields: [{ name: 'tag', label: 'Tag', type: 'text', default: '' }] },
  layers: { label: 'Layers', icon: icons.layers, color: '#6366F1', inputs: 1, outputs: 1, fields: [], iconOnly: true },
  box: { label: 'Box', icon: icons.box, color: '#78716C', inputs: 1, outputs: 1, fields: [], iconOnly: true },
  cpu: { label: 'CPU', icon: icons.cpu, color: '#64748B', inputs: 1, outputs: 1, fields: [], iconOnly: true },
  activity: { label: 'Activity', icon: icons.activity, color: '#22C55E', inputs: 1, outputs: 1, fields: [], iconOnly: true },
  pieChart: { label: 'Pie Chart', icon: icons.pie, color: '#EC4899', inputs: 1, outputs: 1, fields: [], iconOnly: true },
  barChart: { label: 'Bar Chart', icon: icons.chart, color: '#02514a', inputs: 1, outputs: 1, fields: [], iconOnly: true },
};
