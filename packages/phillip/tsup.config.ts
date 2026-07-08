import { defineConfig } from "tsup";

// Two builds from one config:
//   (a) the React library entry — react/react-dom stay external (peer deps)
//   (b) the standalone drop-in IIFE — react is bundled in and NODE_ENV is
//       pinned to production so React ships its minified runtime.
export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["esm", "cjs"],
    // Declarations are generated separately via `tsc --emitDeclarationOnly`
    // (see the "build" script) instead of tsup's built-in dts:true. That
    // option runs rollup-plugin-dts under the hood, which reproducibly blew
    // past 60GB of RAM on Vercel's Linux build machines for this package
    // (while building fine locally on macOS in ~1.5s) — a known class of
    // platform-specific memory blowup in rollup-plugin-dts. Plain tsc has no
    // such issue and produces an equally valid dist/index.d.ts.
    dts: false,
    treeshake: true,
    sourcemap: true,
    clean: true,
    external: ["react", "react-dom", "react/jsx-runtime"],
    outExtension({ format }) {
      return { js: format === "cjs" ? ".cjs" : ".js" };
    },
  },
  {
    entry: { preview: "src/preview.ts" },
    format: ["iife"],
    globalName: "Phillip",
    platform: "browser",
    minify: true,
    treeshake: true,
    sourcemap: true,
    dts: false,
    noExternal: ["react", "react-dom", "react/jsx-runtime"],
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
    outExtension() {
      return { js: ".global.js" };
    },
  },
]);
