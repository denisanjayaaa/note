/**
 * localStorage patch — prevents SecurityError when localStorage is blocked
 * (e.g. sandboxed iframe, strict browser privacy, extensions).
 *
 * Must be imported FIRST in main.tsx so the patch is active before any
 * library (Convex Auth, etc.) tries to access localStorage.
 */
(function () {
  try {
    const desc = Object.getOwnPropertyDescriptor(window, "localStorage");
    if (!desc || !desc.get) return;

    const originalGet = desc.get;

    // Quick test: is real localStorage accessible?
    let needsPatch = false;
    try {
      const ls = originalGet.call(window);
      ls.getItem("__ls_patch_test__");
    } catch {
      needsPatch = true;
    }

    if (!needsPatch) return; // Already accessible, no patch needed

    // Build a simple in-memory Storage replacement
    function createMemoryStorage(): Storage {
      const store = new Map<string, string>();
      return {
        getItem(key: string): string | null {
          return store.get(key) ?? null;
        },
        setItem(key: string, value: string): void {
          store.set(key, value);
        },
        removeItem(key: string): void {
          store.delete(key);
        },
        clear(): void {
          store.clear();
        },
        key(index: number): string | null {
          const keys = Array.from(store.keys());
          return keys[index] ?? null;
        },
        get length(): number {
          return store.size;
        },
        [Symbol.toStringTag]: "Storage",
      } as Storage;
    }

    const memoryStorage = createMemoryStorage();

    Object.defineProperty(window, "localStorage", {
      get: () => memoryStorage,
      configurable: true,
      enumerable: true,
    });

    // Also patch sessionStorage for good measure
    try {
      const sessionDesc = Object.getOwnPropertyDescriptor(window, "sessionStorage");
      if (sessionDesc?.get) {
        sessionDesc.get.call(window); // throws if blocked same way
      }
    } catch {
      const memorySession = createMemoryStorage();
      Object.defineProperty(window, "sessionStorage", {
        get: () => memorySession,
        configurable: true,
        enumerable: true,
      });
    }

    console.log("[localstorage-patch] Real localStorage blocked — using in-memory fallback.");
  } catch {
    // Fail silently — don't block app startup
  }
})();
