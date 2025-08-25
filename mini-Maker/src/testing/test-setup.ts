import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

// Initialize the Angular testing environment
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);

// Global test setup
beforeEach(() => {
  // Reset any global state before each test
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
});

// Global test utilities
(global as any).expectAsync = (promise: Promise<any>) => {
  return expectAsync(promise);
};

// Mock console.log in tests to reduce noise
const originalConsoleLog = console.log;
beforeEach(() => {
  spyOn(console, 'log').and.callFake((...args) => {
    // Only log in tests if explicitly needed
    if (args[0]?.includes?.('TEST:')) {
      originalConsoleLog.apply(console, args);
    }
  });
});

// Setup for DOM testing
beforeEach(() => {
  // Ensure clean DOM state
  document.body.innerHTML = '';
});

// Global error handler for unhandled promise rejections in tests
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection in test:', event.reason);
});

// Mock IntersectionObserver for tests that might need it
(global as any).IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock ResizeObserver for tests that might need it
(global as any).ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Helper function to create mock event
export function createMockEvent(type: string, properties: any = {}): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, properties);
  return event;
}

// Helper function to create mock keyboard event
export function createMockKeyboardEvent(
  type: string, 
  key: string, 
  properties: any = {}
): KeyboardEvent {
  const event = new KeyboardEvent(type, {
    key,
    bubbles: true,
    cancelable: true,
    ...properties
  });
  return event;
}

// Helper function to create mock mouse event
export function createMockMouseEvent(
  type: string, 
  properties: any = {}
): MouseEvent {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    ...properties
  });
  return event;
}
