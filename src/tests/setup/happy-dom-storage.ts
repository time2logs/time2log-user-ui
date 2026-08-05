import { Storage } from 'happy-dom';

// Workaround: happy-dom's pre-populated localStorage/sessionStorage objects are
// plain empty objects in this vitest environment, so replace them with real
// Storage instances before any tests run.
if (typeof window !== 'undefined') {
	Object.defineProperty(window, 'localStorage', {
		value: new Storage(),
		configurable: true,
		writable: true
	});
	Object.defineProperty(window, 'sessionStorage', {
		value: new Storage(),
		configurable: true,
		writable: true
	});
	Object.defineProperty(globalThis, 'localStorage', {
		value: window.localStorage,
		configurable: true,
		writable: true
	});
	Object.defineProperty(globalThis, 'sessionStorage', {
		value: window.sessionStorage,
		configurable: true,
		writable: true
	});
}
