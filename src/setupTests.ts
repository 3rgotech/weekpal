// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

/**
 * jsdom has no `structuredClone`, and IndexedDB is defined in terms of it: `fake-indexeddb`
 * calls it on every write, so a store test fails before it reaches an assertion. Node's
 * serialiser stands in — same treatment of dates and plain data, same dropping of prototypes as
 * the structured clone algorithm itself.
 */
import { deserialize, serialize } from 'node:v8';

if (typeof globalThis.structuredClone !== 'function') {
    globalThis.structuredClone = (<T>(value: T): T => deserialize(serialize(value))) as typeof structuredClone;
}

/**
 * jsdom also has no `TextEncoder`/`TextDecoder`, which `ky` reaches for as it loads.
 *
 * That turns any component importing an adapter — however indirectly, and even when the test
 * mocks the context that would have used it — into a suite that fails before its first
 * assertion. Node has had both globally for years; this only hands them to jsdom.
 */
import { TextDecoder, TextEncoder } from 'node:util';

if (typeof globalThis.TextEncoder !== 'function') {
    globalThis.TextEncoder = TextEncoder as typeof globalThis.TextEncoder;
}

if (typeof globalThis.TextDecoder !== 'function') {
    globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder;
}
