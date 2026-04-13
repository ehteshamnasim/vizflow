/**
 * ============================================================================
 * VITE CONFIGURATION
 * ============================================================================
 * 
 * This configuration file sets up Vite for building our workflow builder
 * package. It handles both development server and production builds.
 * 
 * Build Outputs:
 *   - npm run build:lib  → Library bundle for npm
 *   - npm run build      → Demo app for Netlify
 * 
 * ============================================================================
 */

import { defineConfig } from 'vite';
import { resolve } from 'path';

const isLibBuild = process.env.BUILD_MODE === 'lib';

export default defineConfig({
  
  /**
   * Build Configuration
   */
  build: isLibBuild ? {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'WorkflowBuilder',
      fileName: (format) => `workflow-builder.${format}.js`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {}
      }
    },
    outDir: 'dist',
    sourcemap: true
  } : {
    // App build for demo/Netlify
    outDir: 'dist',
    sourcemap: false,
    minify: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        docs: resolve(__dirname, 'docs.html')
      }
    }
  },
  
  /**
   * Development Server Configuration
   */
  server: {
    port: 3000,
    open: true
  }
});
