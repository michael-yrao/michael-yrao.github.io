// Vitest's `?raw` import suffix (from Vite) returns a file's contents as a plain string.
// Used only by specs to load fixtures without Node's `fs` (not an allowed devDependency here).
declare module '*?raw' {
  const contents: string;
  export default contents;
}
