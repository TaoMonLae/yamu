import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

// Use the installed TypeScript compiler and isolate module state per fixture.
// Runtime dependencies (including SQLite) are the application's real modules.
export default function loadLibrary(entry, cache = new Map()) {
  const root = path.resolve(import.meta.dirname, "..");
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const loadedModule = { exports: {} };
    cache.set(filename, loadedModule);
    const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
      fileName: filename,
    });
    const nativeRequire = createRequire(filename);
    const requireModule = (id) => id.startsWith("@/")
      ? load(path.join(root, `${id.slice(2)}.ts`))
      : nativeRequire(id);
    const evaluate = vm.runInThisContext(
      `(function (exports, require, module, __filename, __dirname) { ${compiled.outputText}\n})`,
      { filename },
    );
    evaluate(loadedModule.exports, requireModule, loadedModule, filename, path.dirname(filename));
    return loadedModule.exports;
  }
  return load(path.join(root, entry));
}
