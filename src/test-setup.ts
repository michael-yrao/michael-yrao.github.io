// Loads Zone.js's testing extensions (ProxyZone / FakeAsyncTestZone) so
// fakeAsync/tick work under the Vitest unit-test builder. The app build's
// polyfills provide zone.js itself; this layers the testing patch on top.
import 'zone.js/testing';
