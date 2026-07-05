import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mock browser environment
globalThis.window = {
  location: { href: 'http://localhost/' },
  navigator: { userAgent: 'node' },
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => {}
};
globalThis.document = {
  head: {
    appendChild: () => {}
  },
  getElementById: (id) => {
    if (id === 'root') {
      return {
        nodeType: 1,
        appendChild: () => {},
        removeChild: () => {},
        ownerDocument: globalThis.document,
        addEventListener: () => {},
        removeEventListener: () => {},
        focus: () => {},
        getBoundingClientRect: () => ({ width: 100, height: 100, top: 0, left: 0, right: 100, bottom: 100 })
      };
    }
    return null;
  },
  createElement: (tag) => {
    return {
      nodeType: 1,
      style: {},
      setAttribute: () => {},
      appendChild: () => {},
      ownerDocument: globalThis.document,
      addEventListener: () => {},
      removeEventListener: () => {},
      focus: () => {},
      getBoundingClientRect: () => ({ width: 100, height: 100, top: 0, left: 0, right: 100, bottom: 100 })
    };
  },
  createElementNS: (ns, tag) => {
    return {
      nodeType: 1,
      style: {},
      setAttribute: () => {},
      appendChild: () => {},
      ownerDocument: globalThis.document,
      addEventListener: () => {},
      removeEventListener: () => {},
      focus: () => {},
      getBoundingClientRect: () => ({ width: 100, height: 100, top: 0, left: 0, right: 100, bottom: 100 })
    };
  },
  createTextNode: (text) => {
    return {
      nodeType: 3,
      nodeValue: text,
      ownerDocument: globalThis.document
    };
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  querySelectorAll: () => [],
  querySelector: () => null,
  getElementsByTagName: () => []
};
globalThis.self = globalThis.window;
globalThis.Node = class Node {};
globalThis.Element = class Element extends globalThis.Node {};
globalThis.HTMLElement = class HTMLElement extends globalThis.Element {};
globalThis.HTMLDivElement = class HTMLDivElement extends globalThis.HTMLElement {};
globalThis.Document = class Document {};
globalThis.HTMLDocument = class HTMLDocument {};
globalThis.HTMLIFrameElement = class HTMLIFrameElement {};
globalThis.window.Node = globalThis.Node;
globalThis.window.Element = globalThis.Element;
globalThis.window.HTMLElement = globalThis.HTMLElement;
globalThis.window.HTMLDivElement = globalThis.HTMLDivElement;
globalThis.window.Document = globalThis.Document;
globalThis.window.HTMLDocument = globalThis.HTMLDocument;
globalThis.window.HTMLIFrameElement = globalThis.HTMLIFrameElement;
globalThis.MutationObserver = class {
  observe() {}
  disconnect() {}
};

// Mock ResizeObserver for Recharts
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock fetch
globalThis.fetch = () => Promise.resolve({
  json: () => Promise.resolve([])
});

// Mock localStorage
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {}
};

// Find the JS file in dist/assets
const assetsDir = path.join(__dirname, 'dist', 'assets');
if (!fs.existsSync(assetsDir)) {
  console.error('dist/assets not found, build first');
  process.exit(1);
}
const files = fs.readdirSync(assetsDir);
const jsFile = files.find(f => f.endsWith('.js'));
if (!jsFile) {
  console.error('No JS file found');
  process.exit(1);
}

const filePath = path.join(assetsDir, jsFile);
console.log('Loading bundle:', filePath);

try {
  await import(pathToFileURL(filePath).href);
  console.log('✅ Bundle executed successfully without exceptions!');
} catch (err) {
  console.error('❌ Bundle execution failed:');
  console.error(err);
  process.exit(1);
}
