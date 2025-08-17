// vite.config.ts
import { URL, fileURLToPath } from "node:url";
import { PrimeVueResolver } from "file:///home/fmdm/dev/tsculpt/node_modules/@primevue/auto-import-resolver/index.mjs";
import vue from "file:///home/fmdm/dev/tsculpt/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import Components from "file:///home/fmdm/dev/tsculpt/node_modules/unplugin-vue-components/dist/vite.js";
import { defineConfig } from "file:///home/fmdm/dev/tsculpt/node_modules/vite/dist/node/index.js";

// src/client/vite-plugin-mesh.ts
import { readFileSync } from "node:fs";
import { extname } from "node:path";

// src/io/index.ts
import { deserialize as amfDeserialize } from "file:///home/fmdm/dev/tsculpt/node_modules/@jscad/amf-deserializer/src/index.js";
import { serialize as amfSerialize } from "file:///home/fmdm/dev/tsculpt/node_modules/@jscad/amf-serializer/index.js";
import { deserialize as dxfDeserialize } from "file:///home/fmdm/dev/tsculpt/node_modules/@jscad/dxf-deserializer/index.js";
import { serialize as dxfSerialize } from "file:///home/fmdm/dev/tsculpt/node_modules/@jscad/dxf-serializer/index.js";
import { deserialize as objDeserialize } from "file:///home/fmdm/dev/tsculpt/node_modules/@jscad/obj-deserializer/index.js";
import { serialize as objSerialize } from "file:///home/fmdm/dev/tsculpt/node_modules/@jscad/obj-serializer/index.js";
import { deserialize as stlDeserialize } from "file:///home/fmdm/dev/tsculpt/node_modules/@jscad/stl-deserializer/index.js";
import { serialize as stlSerialize } from "file:///home/fmdm/dev/tsculpt/node_modules/@jscad/stl-serializer/index.js";
import { deserialize as svgDeserialize } from "file:///home/fmdm/dev/tsculpt/node_modules/@jscad/svg-deserializer/src/index.js";
import { serialize as svgSerialize } from "file:///home/fmdm/dev/tsculpt/node_modules/@jscad/svg-serializer/index.js";
import { deserialize as x3dDeserialize } from "file:///home/fmdm/dev/tsculpt/node_modules/@jscad/x3d-deserializer/src/index.js";
import { serialize as x3dSerialize } from "file:///home/fmdm/dev/tsculpt/node_modules/@jscad/x3d-serializer/src/index.js";

// src/io/jscadGen.ts
function arrayToVector3(arr) {
  return [arr[0], arr[2], arr[1]];
}
function vector3ToArray(v) {
  return [v[0], v[2], v[1]];
}
var jscadGen_default = (extension, serialize, deserialize) => ({
  extension,
  read(data) {
    let buffer;
    if (typeof data === "string") {
      buffer = Buffer.from(data, "utf8");
    } else if (data instanceof ArrayBuffer) {
      buffer = Buffer.from(data);
    } else {
      buffer = data;
    }
    const result = deserialize({ output: "geometry" }, buffer);
    const geom3 = Array.isArray(result) ? result[0] : result;
    const faces = [];
    if (!geom3 || !geom3.polygons) {
      console.warn("No geometry or polygons found in STL file");
      return { faces: [] };
    }
    for (const polygon of geom3.polygons) {
      const vertices = polygon.vertices;
      for (let i = 0; i < vertices.length - 2; i++) {
        const face = [
          arrayToVector3(vertices[0]),
          arrayToVector3(vertices[i + 2]),
          arrayToVector3(vertices[i + 1])
        ];
        faces.push(face);
      }
    }
    return { faces };
  },
  write(meshData) {
    const { vertices } = meshData;
    const v3a = vertices ? (v) => vector3ToArray(vertices[v]) : (v) => vector3ToArray(v);
    const polygons = meshData.faces.map((face) => ({
      vertices: [v3a(face[0]), v3a(face[2]), v3a(face[1])],
      plane: [0, 0, 1, 0]
      // Default plane, will be calculated by JSCAD
    }));
    const geom3 = {
      polygons,
      transforms: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      color: void 0
    };
    return serialize(geom3);
  }
});

// src/io/generator.ts
function generateMeshSource(meshData) {
  const v3s = (vs) => vs.map((v) => `[${v.join(", ")}]`).join(",\n	");
  const [faces, vertices] = meshData.vertices ? [v3s(meshData.faces), v3s(meshData.vertices)] : [
    meshData.faces.map((face) => `[${face.map((vertex) => `[${vertex.join(", ")}]`).join(", ")}]`).join(",\n	")
  ];
  return `import { Mesh } from '@tsculpt/types/mesh'

export default new Mesh([
	${faces}
]${vertices ? `, [
	${vertices}
]` : ""})
`;
}
function generateFakeMeshSource() {
  return `import { Mesh } from '@tsculpt/types/mesh'

// Mock mesh source
const faces = [
	[[0, 0, 0], [1, 0, 0], [0, 1, 0]],
	[[1, 0, 0], [1, 1, 0], [0, 1, 0]],
	[[0, 0, 1], [1, 0, 1], [0, 1, 1]],
	[[1, 0, 1], [1, 1, 1], [0, 1, 1]],
	[[0, 0, 0], [1, 0, 0], [0, 0, 1]],
	[[1, 0, 0], [1, 0, 1], [0, 0, 1]],
	[[0, 1, 0], [1, 1, 0], [0, 1, 1]],
	[[1, 1, 0], [1, 1, 1], [0, 1, 1]],
	[[0, 0, 0], [0, 1, 0], [0, 0, 1]],
	[[0, 1, 0], [0, 1, 1], [0, 0, 1]],
	[[1, 0, 0], [1, 1, 0], [1, 0, 1]],
	[[1, 1, 0], [1, 1, 1], [1, 0, 1]]
]

export default new Mesh(faces)
`;
}

// src/io/index.ts
var fileHandlers = {};
function getHandler(extension) {
  return fileHandlers[extension.toLowerCase()];
}
function registerHandler(handler) {
  fileHandlers[handler.extension.toLowerCase()] = handler;
}
registerHandler(jscadGen_default("stl", stlSerialize, stlDeserialize));
registerHandler(jscadGen_default("obj", objSerialize, objDeserialize));
registerHandler(jscadGen_default("amf", amfSerialize, amfDeserialize));
registerHandler(jscadGen_default("dxf", dxfSerialize, dxfDeserialize));
registerHandler(jscadGen_default("svg", svgSerialize, svgDeserialize));
registerHandler(jscadGen_default("x3d", x3dSerialize, x3dDeserialize));

// src/client/vite-plugin-mesh.ts
function meshPlugin() {
  return {
    name: "vite-plugin-mesh",
    enforce: "pre",
    async transform(_code, id) {
      const ext = extname(id).toLowerCase().replace(".", "");
      const handler = getHandler(ext);
      if (!handler) {
        return null;
      }
      try {
        const fileBuffer = readFileSync(id);
        const meshData = handler.read(fileBuffer);
        const generatedSource = generateMeshSource(meshData);
        return {
          code: generatedSource,
          map: null
        };
      } catch (error) {
        console.warn(`Failed to process mesh file ${id}:`, error);
        const fakeSource = generateFakeMeshSource();
        return {
          code: fakeSource,
          map: null
        };
      }
    },
    // Handle virtual imports for mesh files
    resolveId(id) {
      if (id.endsWith("?mesh")) {
        return id;
      }
      return null;
    },
    async load(id) {
      if (id.endsWith("?mesh")) {
        const filePath = id.replace("?mesh", "");
        const ext = extname(filePath).toLowerCase().replace(".", "");
        const handler = getHandler(ext);
        if (!handler) {
          return null;
        }
        try {
          const fileBuffer = readFileSync(filePath);
          const meshData = handler.read(fileBuffer);
          return generateMeshSource(meshData);
        } catch (error) {
          console.warn(`Failed to load mesh file ${filePath}:`, error);
          return generateFakeMeshSource();
        }
      }
      return null;
    }
  };
}

// src/client/vite-plugin-param-metadata.ts
import { Project, SyntaxKind } from "file:///home/fmdm/dev/tsculpt/node_modules/ts-morph/dist/ts-morph.js";
function givenConstant(value) {
  const text = typeof value === "string" ? value : value.getText();
  try {
    return (0, eval)(text);
  } catch (e) {
    return { raw: text };
  }
}
function paramMetadataInjector() {
  return {
    name: "vite-plugin-param-metadata",
    enforce: "pre",
    async transform(code, id) {
      if (!id.endsWith(".sculpt.ts")) return;
      const project = new Project();
      const sourceFile = project.createSourceFile("sculpt.ts", code, { overwrite: true });
      const exportedFns = sourceFile.getFunctions().filter((fn) => fn.isExported());
      for (const fn of exportedFns) {
        const fnName = fn.getName();
        const params = fn.getParameters();
        if (!params.length) continue;
        const firstParam = params[0];
        const metadata = {};
        const bindingPattern = firstParam.getNameNode().asKind(SyntaxKind.ObjectBindingPattern);
        if (!bindingPattern) continue;
        const elements = bindingPattern.getElements();
        for (const el of elements) {
          const name = el.getName();
          const initializer = el.getInitializer();
          if (!initializer) continue;
          if (initializer.getKind() === SyntaxKind.AsExpression) {
            const asExpr = initializer.asKindOrThrow(SyntaxKind.AsExpression);
            const thisParam = {
              default: givenConstant(asExpr.getExpression())
            };
            const typeNode = asExpr.getTypeNode();
            const typeRef = typeNode?.asKind(SyntaxKind.TypeReference);
            if (typeRef && typeNode.getKind() === SyntaxKind.TypeReference) {
              const kind = typeRef.getTypeName().getText();
              thisParam.type = kind;
              thisParam.args = typeRef.getTypeArguments().map(givenConstant);
            } else if (typeNode?.getKind() === SyntaxKind.UnionType) {
              thisParam.type = "Union";
              thisParam.args = typeNode.getText().split("|").map((t) => givenConstant(t.trim()));
            } else if (typeNode) thisParam.type = typeNode.getText();
            metadata[name] = thisParam;
          }
        }
        if (Object.keys(metadata).length > 0) {
          const insertText = `
${fnName}.params = ${JSON.stringify(metadata, null, 2)};
`;
          code += insertText;
        }
      }
      return code;
    }
  };
}

// vite.config.ts
var __vite_injected_original_import_meta_url = "file:///home/fmdm/dev/tsculpt/vite.config.ts";
var vite_config_default = defineConfig({
  plugins: [
    vue(),
    paramMetadataInjector(),
    meshPlugin(),
    Components({
      dirs: ["./src/client/components"],
      globs: ["src/client/**/*.vue"],
      resolvers: [PrimeVueResolver()]
    })
  ],
  worker: {
    format: "es"
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src/client", __vite_injected_original_import_meta_url)),
      "@tsculpt": fileURLToPath(new URL("./src/core", __vite_injected_original_import_meta_url)),
      "@booleans": fileURLToPath(new URL("./src/booleans/jscad.ts", __vite_injected_original_import_meta_url)),
      "@worker": fileURLToPath(new URL("./src/worker", __vite_injected_original_import_meta_url))
    }
  },
  css: {
    preprocessorOptions: {
      sass: {
        api: "modern-compiler"
      }
    }
  },
  server: {
    fs: {
      allow: ["."]
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          primevue: ["primevue"],
          themes: ["@primeuix/themes"],
          vue: ["vue", "vue-router"],
          three: ["three"],
          jscad: ["@jscad/modeling"]
        }
      }
    },
    outDir: "dist",
    assetsDir: "assets"
  },
  test: {
    include: ["src/**/*.test.ts"],
    alias: {
      "@booleans": fileURLToPath(new URL("./src/booleans/tester.ts", __vite_injected_original_import_meta_url))
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts"]
    }
  },
  optimizeDeps: {
    exclude: ["example/*.ts"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAic3JjL2NsaWVudC92aXRlLXBsdWdpbi1tZXNoLnRzIiwgInNyYy9pby9pbmRleC50cyIsICJzcmMvaW8vanNjYWRHZW4udHMiLCAic3JjL2lvL2dlbmVyYXRvci50cyIsICJzcmMvY2xpZW50L3ZpdGUtcGx1Z2luLXBhcmFtLW1ldGFkYXRhLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL2hvbWUvZm1kbS9kZXYvdHNjdWxwdFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvZm1kbS9kZXYvdHNjdWxwdC92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9mbWRtL2Rldi90c2N1bHB0L3ZpdGUuY29uZmlnLnRzXCI7Ly8vIDxyZWZlcmVuY2UgdHlwZXM9XCJ2aXRlc3RcIiAvPlxuaW1wb3J0IHsgVVJMLCBmaWxlVVJMVG9QYXRoIH0gZnJvbSAnbm9kZTp1cmwnXG5pbXBvcnQgeyBQcmltZVZ1ZVJlc29sdmVyIH0gZnJvbSAnQHByaW1ldnVlL2F1dG8taW1wb3J0LXJlc29sdmVyJ1xuaW1wb3J0IHZ1ZSBmcm9tICdAdml0ZWpzL3BsdWdpbi12dWUnXG5pbXBvcnQgQ29tcG9uZW50cyBmcm9tICd1bnBsdWdpbi12dWUtY29tcG9uZW50cy92aXRlJ1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCBtZXNoUGx1Z2luIGZyb20gJy4vc3JjL2NsaWVudC92aXRlLXBsdWdpbi1tZXNoJ1xuaW1wb3J0IHBhcmFtTWV0YWRhdGFJbmplY3RvciBmcm9tICcuL3NyYy9jbGllbnQvdml0ZS1wbHVnaW4tcGFyYW0tbWV0YWRhdGEnXG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG5cdHBsdWdpbnM6IFtcblx0XHR2dWUoKSxcblx0XHRwYXJhbU1ldGFkYXRhSW5qZWN0b3IoKSxcblx0XHRtZXNoUGx1Z2luKCksXG5cdFx0Q29tcG9uZW50cyh7XG5cdFx0XHRkaXJzOiBbJy4vc3JjL2NsaWVudC9jb21wb25lbnRzJ10sXG5cdFx0XHRnbG9iczogWydzcmMvY2xpZW50LyoqLyoudnVlJ10sXG5cdFx0XHRyZXNvbHZlcnM6IFtQcmltZVZ1ZVJlc29sdmVyKCldLFxuXHRcdH0pLFxuXHRdLFxuXHR3b3JrZXI6IHtcblx0XHRmb3JtYXQ6ICdlcycsXG5cdH0sXG5cdHJlc29sdmU6IHtcblx0XHRhbGlhczoge1xuXHRcdFx0J0AnOiBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoJy4vc3JjL2NsaWVudCcsIGltcG9ydC5tZXRhLnVybCkpLFxuXHRcdFx0J0B0c2N1bHB0JzogZmlsZVVSTFRvUGF0aChuZXcgVVJMKCcuL3NyYy9jb3JlJywgaW1wb3J0Lm1ldGEudXJsKSksXG5cdFx0XHQnQGJvb2xlYW5zJzogZmlsZVVSTFRvUGF0aChuZXcgVVJMKCcuL3NyYy9ib29sZWFucy9qc2NhZC50cycsIGltcG9ydC5tZXRhLnVybCkpLFxuXHRcdFx0J0B3b3JrZXInOiBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoJy4vc3JjL3dvcmtlcicsIGltcG9ydC5tZXRhLnVybCkpLFxuXHRcdH0sXG5cdH0sXG5cdGNzczoge1xuXHRcdHByZXByb2Nlc3Nvck9wdGlvbnM6IHtcblx0XHRcdHNhc3M6IHtcblx0XHRcdFx0YXBpOiAnbW9kZXJuLWNvbXBpbGVyJyxcblx0XHRcdH0sXG5cdFx0fSxcblx0fSxcblx0c2VydmVyOiB7XG5cdFx0ZnM6IHtcblx0XHRcdGFsbG93OiBbJy4nXSxcblx0XHR9LFxuXHR9LFxuXHRidWlsZDoge1xuXHRcdHJvbGx1cE9wdGlvbnM6IHtcblx0XHRcdG91dHB1dDoge1xuXHRcdFx0XHRtYW51YWxDaHVua3M6IHtcblx0XHRcdFx0XHRwcmltZXZ1ZTogWydwcmltZXZ1ZSddLFxuXHRcdFx0XHRcdHRoZW1lczogWydAcHJpbWV1aXgvdGhlbWVzJ10sXG5cdFx0XHRcdFx0dnVlOiBbJ3Z1ZScsICd2dWUtcm91dGVyJ10sXG5cdFx0XHRcdFx0dGhyZWU6IFsndGhyZWUnXSxcblx0XHRcdFx0XHRqc2NhZDogWydAanNjYWQvbW9kZWxpbmcnXSxcblx0XHRcdFx0fSxcblx0XHRcdH0sXG5cdFx0fSxcblx0XHRvdXREaXI6ICdkaXN0Jyxcblx0XHRhc3NldHNEaXI6ICdhc3NldHMnLFxuXHR9LFxuXHR0ZXN0OiB7XG5cdFx0aW5jbHVkZTogWydzcmMvKiovKi50ZXN0LnRzJ10sXG5cdFx0YWxpYXM6IHtcblx0XHRcdCdAYm9vbGVhbnMnOiBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoJy4vc3JjL2Jvb2xlYW5zL3Rlc3Rlci50cycsIGltcG9ydC5tZXRhLnVybCkpLFxuXHRcdH0sXG5cdFx0Y292ZXJhZ2U6IHtcblx0XHRcdHByb3ZpZGVyOiAndjgnLFxuXHRcdFx0cmVwb3J0ZXI6IFsndGV4dCcsICdodG1sJ10sXG5cdFx0XHRpbmNsdWRlOiBbJ3NyYy8qKi8qLnRzJ10sXG5cdFx0XHRleGNsdWRlOiBbJ3NyYy8qKi8qLnRlc3QudHMnXSxcblx0XHR9LFxuXHR9LFxuXHRvcHRpbWl6ZURlcHM6IHtcblx0XHRleGNsdWRlOiBbJ2V4YW1wbGUvKi50cyddLFxuXHR9LFxufSlcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL2hvbWUvZm1kbS9kZXYvdHNjdWxwdC9zcmMvY2xpZW50XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9mbWRtL2Rldi90c2N1bHB0L3NyYy9jbGllbnQvdml0ZS1wbHVnaW4tbWVzaC50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9mbWRtL2Rldi90c2N1bHB0L3NyYy9jbGllbnQvdml0ZS1wbHVnaW4tbWVzaC50c1wiO2ltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ25vZGU6ZnMnXG5pbXBvcnQgeyBleHRuYW1lIH0gZnJvbSAnbm9kZTpwYXRoJ1xuaW1wb3J0IHR5cGUgeyBQbHVnaW4gfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHsgZ2VuZXJhdGVGYWtlTWVzaFNvdXJjZSwgZ2VuZXJhdGVNZXNoU291cmNlLCBnZXRIYW5kbGVyIH0gZnJvbSAnLi4vaW8vaW5kZXguanMnXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIG1lc2hQbHVnaW4oKTogUGx1Z2luIHtcblx0cmV0dXJuIHtcblx0XHRuYW1lOiAndml0ZS1wbHVnaW4tbWVzaCcsXG5cdFx0ZW5mb3JjZTogJ3ByZScsXG5cblx0XHRhc3luYyB0cmFuc2Zvcm0oX2NvZGU6IHN0cmluZywgaWQ6IHN0cmluZykge1xuXHRcdFx0Ly8gQ2hlY2sgaWYgdGhpcyBpcyBhIG1lc2ggZmlsZSBpbXBvcnRcblx0XHRcdGNvbnN0IGV4dCA9IGV4dG5hbWUoaWQpLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgnLicsICcnKVxuXHRcdFx0Y29uc3QgaGFuZGxlciA9IGdldEhhbmRsZXIoZXh0KVxuXG5cdFx0XHRpZiAoIWhhbmRsZXIpIHtcblx0XHRcdFx0cmV0dXJuIG51bGxcblx0XHRcdH1cblxuXHRcdFx0dHJ5IHtcblx0XHRcdFx0Ly8gUmVhZCB0aGUgZmlsZVxuXHRcdFx0XHRjb25zdCBmaWxlQnVmZmVyID0gcmVhZEZpbGVTeW5jKGlkKVxuXHRcdFx0XHRjb25zdCBtZXNoRGF0YSA9IGhhbmRsZXIucmVhZChmaWxlQnVmZmVyKVxuXG5cdFx0XHRcdC8vIEdlbmVyYXRlIFR5cGVTY3JpcHQgc291cmNlXG5cdFx0XHRcdGNvbnN0IGdlbmVyYXRlZFNvdXJjZSA9IGdlbmVyYXRlTWVzaFNvdXJjZShtZXNoRGF0YSlcblxuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdGNvZGU6IGdlbmVyYXRlZFNvdXJjZSxcblx0XHRcdFx0XHRtYXA6IG51bGwsXG5cdFx0XHRcdH1cblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRcdGNvbnNvbGUud2FybihgRmFpbGVkIHRvIHByb2Nlc3MgbWVzaCBmaWxlICR7aWR9OmAsIGVycm9yKVxuXG5cdFx0XHRcdC8vIEZhbGxiYWNrIHRvIGZha2UgbWVzaFxuXHRcdFx0XHRjb25zdCBmYWtlU291cmNlID0gZ2VuZXJhdGVGYWtlTWVzaFNvdXJjZSgpXG5cblx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRjb2RlOiBmYWtlU291cmNlLFxuXHRcdFx0XHRcdG1hcDogbnVsbCxcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHQvLyBIYW5kbGUgdmlydHVhbCBpbXBvcnRzIGZvciBtZXNoIGZpbGVzXG5cdFx0cmVzb2x2ZUlkKGlkOiBzdHJpbmcpIHtcblx0XHRcdGlmIChpZC5lbmRzV2l0aCgnP21lc2gnKSkge1xuXHRcdFx0XHRyZXR1cm4gaWRcblx0XHRcdH1cblx0XHRcdHJldHVybiBudWxsXG5cdFx0fSxcblxuXHRcdGFzeW5jIGxvYWQoaWQ6IHN0cmluZykge1xuXHRcdFx0aWYgKGlkLmVuZHNXaXRoKCc/bWVzaCcpKSB7XG5cdFx0XHRcdGNvbnN0IGZpbGVQYXRoID0gaWQucmVwbGFjZSgnP21lc2gnLCAnJylcblx0XHRcdFx0Y29uc3QgZXh0ID0gZXh0bmFtZShmaWxlUGF0aCkudG9Mb3dlckNhc2UoKS5yZXBsYWNlKCcuJywgJycpXG5cdFx0XHRcdGNvbnN0IGhhbmRsZXIgPSBnZXRIYW5kbGVyKGV4dClcblxuXHRcdFx0XHRpZiAoIWhhbmRsZXIpIHtcblx0XHRcdFx0XHRyZXR1cm4gbnVsbFxuXHRcdFx0XHR9XG5cblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRjb25zdCBmaWxlQnVmZmVyID0gcmVhZEZpbGVTeW5jKGZpbGVQYXRoKVxuXHRcdFx0XHRcdGNvbnN0IG1lc2hEYXRhID0gaGFuZGxlci5yZWFkKGZpbGVCdWZmZXIpXG5cdFx0XHRcdFx0cmV0dXJuIGdlbmVyYXRlTWVzaFNvdXJjZShtZXNoRGF0YSlcblx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRcdFx0XHRjb25zb2xlLndhcm4oYEZhaWxlZCB0byBsb2FkIG1lc2ggZmlsZSAke2ZpbGVQYXRofTpgLCBlcnJvcilcblx0XHRcdFx0XHRyZXR1cm4gZ2VuZXJhdGVGYWtlTWVzaFNvdXJjZSgpXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiBudWxsXG5cdFx0fSxcblx0fVxufVxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9mbWRtL2Rldi90c2N1bHB0L3NyYy9pb1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvZm1kbS9kZXYvdHNjdWxwdC9zcmMvaW8vaW5kZXgudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvZm1kbS9kZXYvdHNjdWxwdC9zcmMvaW8vaW5kZXgudHNcIjtleHBvcnQgaW50ZXJmYWNlIEZpbGVIYW5kbGVyIHtcblx0ZXh0ZW5zaW9uOiBzdHJpbmdcblx0cmVhZDogKGRhdGE6IEFycmF5QnVmZmVyIHwgc3RyaW5nKSA9PiBNZXNoRGF0YVxuXHR3cml0ZTogKG1lc2hEYXRhOiBNZXNoRGF0YSkgPT4gQXJyYXlCdWZmZXIgfCBzdHJpbmdcbn1cblxuZXhwb3J0IHR5cGUgVmVjdG9yM0RhdGEgPSBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl1cbmV4cG9ydCB0eXBlIEZhY2VEYXRhID0gW1ZlY3RvcjNEYXRhLCBWZWN0b3IzRGF0YSwgVmVjdG9yM0RhdGFdXG5cbmV4cG9ydCBpbnRlcmZhY2UgTWVzaERhdGEge1xuXHRmYWNlczogRmFjZURhdGFbXSB8IFZlY3RvcjNEYXRhW11cblx0dmVydGljZXM/OiBWZWN0b3IzRGF0YVtdXG59XG5cbi8vIFJlZ2lzdHJ5IG9mIGFsbCBmaWxlIGhhbmRsZXJzXG5leHBvcnQgY29uc3QgZmlsZUhhbmRsZXJzOiBSZWNvcmQ8c3RyaW5nLCBGaWxlSGFuZGxlcj4gPSB7fVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0SGFuZGxlcihleHRlbnNpb246IHN0cmluZyk6IEZpbGVIYW5kbGVyIHwgdW5kZWZpbmVkIHtcblx0cmV0dXJuIGZpbGVIYW5kbGVyc1tleHRlbnNpb24udG9Mb3dlckNhc2UoKV1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN1cHBvcnRlZEV4dGVuc2lvbnMoKTogc3RyaW5nW10ge1xuXHRyZXR1cm4gT2JqZWN0LmtleXMoZmlsZUhhbmRsZXJzKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJIYW5kbGVyKGhhbmRsZXI6IEZpbGVIYW5kbGVyKSB7XG5cdGZpbGVIYW5kbGVyc1toYW5kbGVyLmV4dGVuc2lvbi50b0xvd2VyQ2FzZSgpXSA9IGhhbmRsZXJcbn1cblxuaW1wb3J0IHsgZGVzZXJpYWxpemUgYXMgYW1mRGVzZXJpYWxpemUgfSBmcm9tICdAanNjYWQvYW1mLWRlc2VyaWFsaXplcidcbmltcG9ydCB7IHNlcmlhbGl6ZSBhcyBhbWZTZXJpYWxpemUgfSBmcm9tICdAanNjYWQvYW1mLXNlcmlhbGl6ZXInXG5pbXBvcnQgeyBkZXNlcmlhbGl6ZSBhcyBkeGZEZXNlcmlhbGl6ZSB9IGZyb20gJ0Bqc2NhZC9keGYtZGVzZXJpYWxpemVyJ1xuaW1wb3J0IHsgc2VyaWFsaXplIGFzIGR4ZlNlcmlhbGl6ZSB9IGZyb20gJ0Bqc2NhZC9keGYtc2VyaWFsaXplcidcbmltcG9ydCB7IGRlc2VyaWFsaXplIGFzIG9iakRlc2VyaWFsaXplIH0gZnJvbSAnQGpzY2FkL29iai1kZXNlcmlhbGl6ZXInXG5pbXBvcnQgeyBzZXJpYWxpemUgYXMgb2JqU2VyaWFsaXplIH0gZnJvbSAnQGpzY2FkL29iai1zZXJpYWxpemVyJ1xuaW1wb3J0IHsgZGVzZXJpYWxpemUgYXMgc3RsRGVzZXJpYWxpemUgfSBmcm9tICdAanNjYWQvc3RsLWRlc2VyaWFsaXplcidcbmltcG9ydCB7IHNlcmlhbGl6ZSBhcyBzdGxTZXJpYWxpemUgfSBmcm9tICdAanNjYWQvc3RsLXNlcmlhbGl6ZXInXG5pbXBvcnQgeyBkZXNlcmlhbGl6ZSBhcyBzdmdEZXNlcmlhbGl6ZSB9IGZyb20gJ0Bqc2NhZC9zdmctZGVzZXJpYWxpemVyJ1xuaW1wb3J0IHsgc2VyaWFsaXplIGFzIHN2Z1NlcmlhbGl6ZSB9IGZyb20gJ0Bqc2NhZC9zdmctc2VyaWFsaXplcidcbmltcG9ydCB7IGRlc2VyaWFsaXplIGFzIHgzZERlc2VyaWFsaXplIH0gZnJvbSAnQGpzY2FkL3gzZC1kZXNlcmlhbGl6ZXInXG5pbXBvcnQgeyBzZXJpYWxpemUgYXMgeDNkU2VyaWFsaXplIH0gZnJvbSAnQGpzY2FkL3gzZC1zZXJpYWxpemVyJ1xuLy8gUmVnaXN0ZXIgYnVpbHQtaW4gaGFuZGxlcnNcbmltcG9ydCBqc2NhZEdlbiBmcm9tICcuL2pzY2FkR2VuLmpzJ1xuXG5yZWdpc3RlckhhbmRsZXIoanNjYWRHZW4oJ3N0bCcsIHN0bFNlcmlhbGl6ZSwgc3RsRGVzZXJpYWxpemUpKVxucmVnaXN0ZXJIYW5kbGVyKGpzY2FkR2VuKCdvYmonLCBvYmpTZXJpYWxpemUsIG9iakRlc2VyaWFsaXplKSlcbnJlZ2lzdGVySGFuZGxlcihqc2NhZEdlbignYW1mJywgYW1mU2VyaWFsaXplLCBhbWZEZXNlcmlhbGl6ZSkpXG5yZWdpc3RlckhhbmRsZXIoanNjYWRHZW4oJ2R4ZicsIGR4ZlNlcmlhbGl6ZSwgZHhmRGVzZXJpYWxpemUpKVxucmVnaXN0ZXJIYW5kbGVyKGpzY2FkR2VuKCdzdmcnLCBzdmdTZXJpYWxpemUsIHN2Z0Rlc2VyaWFsaXplKSlcbnJlZ2lzdGVySGFuZGxlcihqc2NhZEdlbigneDNkJywgeDNkU2VyaWFsaXplLCB4M2REZXNlcmlhbGl6ZSkpXG5cbi8vIEV4cG9ydCBnZW5lcmF0b3IgZnVuY3Rpb25zXG5leHBvcnQgKiBmcm9tICcuL2dlbmVyYXRvci5qcydcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL2hvbWUvZm1kbS9kZXYvdHNjdWxwdC9zcmMvaW9cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL2ZtZG0vZGV2L3RzY3VscHQvc3JjL2lvL2pzY2FkR2VuLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL2ZtZG0vZGV2L3RzY3VscHQvc3JjL2lvL2pzY2FkR2VuLnRzXCI7aW1wb3J0IHsgRmFjZURhdGEsIHR5cGUgRmlsZUhhbmRsZXIsIHR5cGUgTWVzaERhdGEsIHR5cGUgVmVjdG9yM0RhdGEgfSBmcm9tICcuL2luZGV4LmpzJ1xuXG5mdW5jdGlvbiBhcnJheVRvVmVjdG9yMyhhcnI6IG51bWJlcltdKTogVmVjdG9yM0RhdGEge1xuXHRyZXR1cm4gW2FyclswXSwgYXJyWzJdLCBhcnJbMV1dIC8vIFN3YXAgWSBhbmQgWlxufVxuXG5mdW5jdGlvbiB2ZWN0b3IzVG9BcnJheSh2OiBWZWN0b3IzRGF0YSk6IG51bWJlcltdIHtcblx0cmV0dXJuIFt2WzBdLCB2WzJdLCB2WzFdXSAvLyBTd2FwIFkgYW5kIFpcbn1cblxuZXhwb3J0IGRlZmF1bHQgKFxuXHRleHRlbnNpb246IHN0cmluZyxcblx0c2VyaWFsaXplOiAoZ2VvbTM6IEpTQ0FER2VvbWV0cnkpID0+IEFycmF5QnVmZmVyLFxuXHRkZXNlcmlhbGl6ZTogKG9wdGlvbnM6IHsgb3V0cHV0Pzogc3RyaW5nOyBmaWxlbmFtZT86IHN0cmluZyB9LCBkYXRhOiBCdWZmZXIpID0+IEpTQ0FEUmVzdWx0XG4pOiBGaWxlSGFuZGxlciA9PiAoe1xuXHRleHRlbnNpb24sXG5cblx0cmVhZChkYXRhOiBBcnJheUJ1ZmZlciB8IHN0cmluZyk6IE1lc2hEYXRhIHtcblx0XHRsZXQgYnVmZmVyOiBCdWZmZXJcblxuXHRcdGlmICh0eXBlb2YgZGF0YSA9PT0gJ3N0cmluZycpIHtcblx0XHRcdC8vIENvbnZlcnQgc3RyaW5nIHRvIEJ1ZmZlclxuXHRcdFx0YnVmZmVyID0gQnVmZmVyLmZyb20oZGF0YSwgJ3V0ZjgnKVxuXHRcdH0gZWxzZSBpZiAoZGF0YSBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG5cdFx0XHQvLyBDb252ZXJ0IEFycmF5QnVmZmVyIHRvIEJ1ZmZlclxuXHRcdFx0YnVmZmVyID0gQnVmZmVyLmZyb20oZGF0YSlcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gQXNzdW1lIGl0J3MgYWxyZWFkeSBhIEJ1ZmZlciAoZnJvbSByZWFkRmlsZVN5bmMpXG5cdFx0XHRidWZmZXIgPSBkYXRhIGFzIEJ1ZmZlclxuXHRcdH1cblxuXHRcdC8vIFVzZSBKU0NBRCBTVEwgZGVzZXJpYWxpemVyXG5cdFx0Y29uc3QgcmVzdWx0ID0gZGVzZXJpYWxpemUoeyBvdXRwdXQ6ICdnZW9tZXRyeScgfSwgYnVmZmVyKVxuXHRcdGNvbnN0IGdlb20zID0gQXJyYXkuaXNBcnJheShyZXN1bHQpID8gcmVzdWx0WzBdIDogcmVzdWx0XG5cblx0XHQvLyBDb252ZXJ0IEpTQ0FEIGdlb21ldHJ5IHRvIG91ciBmb3JtYXRcblx0XHRjb25zdCBmYWNlczogW1ZlY3RvcjNEYXRhLCBWZWN0b3IzRGF0YSwgVmVjdG9yM0RhdGFdW10gPSBbXVxuXG5cdFx0aWYgKCFnZW9tMyB8fCAhZ2VvbTMucG9seWdvbnMpIHtcblx0XHRcdGNvbnNvbGUud2FybignTm8gZ2VvbWV0cnkgb3IgcG9seWdvbnMgZm91bmQgaW4gU1RMIGZpbGUnKVxuXHRcdFx0cmV0dXJuIHsgZmFjZXM6IFtdIH1cblx0XHR9XG5cblx0XHRmb3IgKGNvbnN0IHBvbHlnb24gb2YgZ2VvbTMucG9seWdvbnMpIHtcblx0XHRcdGNvbnN0IHZlcnRpY2VzID0gcG9seWdvbi52ZXJ0aWNlc1xuXG5cdFx0XHQvLyBUcmlhbmd1bGF0ZSB0aGUgcG9seWdvbiAoYXNzdW1pbmcgaXQncyBhbHJlYWR5IHRyaWFuZ2xlcyBmb3IgU1RMKVxuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB2ZXJ0aWNlcy5sZW5ndGggLSAyOyBpKyspIHtcblx0XHRcdFx0Y29uc3QgZmFjZTogW1ZlY3RvcjNEYXRhLCBWZWN0b3IzRGF0YSwgVmVjdG9yM0RhdGFdID0gW1xuXHRcdFx0XHRcdGFycmF5VG9WZWN0b3IzKHZlcnRpY2VzWzBdKSxcblx0XHRcdFx0XHRhcnJheVRvVmVjdG9yMyh2ZXJ0aWNlc1tpICsgMl0pLFxuXHRcdFx0XHRcdGFycmF5VG9WZWN0b3IzKHZlcnRpY2VzW2kgKyAxXSksXG5cdFx0XHRcdF1cblx0XHRcdFx0ZmFjZXMucHVzaChmYWNlKVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiB7IGZhY2VzIH1cblx0fSxcblxuXHR3cml0ZShtZXNoRGF0YTogTWVzaERhdGEpOiBBcnJheUJ1ZmZlciB7XG5cdFx0Y29uc3QgeyB2ZXJ0aWNlcyB9ID0gbWVzaERhdGFcblx0XHRjb25zdCB2M2EgPSB2ZXJ0aWNlc1xuXHRcdFx0PyAodjogVmVjdG9yM0RhdGEgfCBudW1iZXIpID0+IHZlY3RvcjNUb0FycmF5KHZlcnRpY2VzW3YgYXMgbnVtYmVyXSlcblx0XHRcdDogKHY6IFZlY3RvcjNEYXRhIHwgbnVtYmVyKSA9PiB2ZWN0b3IzVG9BcnJheSh2IGFzIFZlY3RvcjNEYXRhKVxuXG5cdFx0Ly8gQ29udmVydCBvdXIgZm9ybWF0IHRvIEpTQ0FEIGdlb21ldHJ5XG5cdFx0Y29uc3QgcG9seWdvbnMgPSBtZXNoRGF0YS5mYWNlcy5tYXAoKGZhY2UpID0+ICh7XG5cdFx0XHR2ZXJ0aWNlczogW3YzYShmYWNlWzBdKSwgdjNhKGZhY2VbMl0pLCB2M2EoZmFjZVsxXSldLFxuXHRcdFx0cGxhbmU6IFswLCAwLCAxLCAwXSwgLy8gRGVmYXVsdCBwbGFuZSwgd2lsbCBiZSBjYWxjdWxhdGVkIGJ5IEpTQ0FEXG5cdFx0fSkpXG5cblx0XHRjb25zdCBnZW9tMyA9IHtcblx0XHRcdHBvbHlnb25zLFxuXHRcdFx0dHJhbnNmb3JtczogWzEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDFdLFxuXHRcdFx0Y29sb3I6IHVuZGVmaW5lZCxcblx0XHR9XG5cblx0XHQvLyBVc2UgSlNDQUQgc2VyaWFsaXplclxuXHRcdHJldHVybiBzZXJpYWxpemUoZ2VvbTMpXG5cdH0sXG59KVxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9mbWRtL2Rldi90c2N1bHB0L3NyYy9pb1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvZm1kbS9kZXYvdHNjdWxwdC9zcmMvaW8vZ2VuZXJhdG9yLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL2ZtZG0vZGV2L3RzY3VscHQvc3JjL2lvL2dlbmVyYXRvci50c1wiO2ltcG9ydCB7IEZhY2VEYXRhLCB0eXBlIE1lc2hEYXRhLCB0eXBlIFZlY3RvcjNEYXRhIH0gZnJvbSAnLi9pbmRleC5qcydcblxuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlTWVzaFNvdXJjZShtZXNoRGF0YTogTWVzaERhdGEpOiBzdHJpbmcge1xuXHRjb25zdCB2M3MgPSAodnM6IFZlY3RvcjNEYXRhW10pID0+IHZzLm1hcCgodikgPT4gYFske3Yuam9pbignLCAnKX1dYCkuam9pbignLFxcblxcdCcpXG5cdGNvbnN0IFtmYWNlcywgdmVydGljZXNdID0gbWVzaERhdGEudmVydGljZXNcblx0XHQ/IFt2M3MobWVzaERhdGEuZmFjZXMgYXMgVmVjdG9yM0RhdGFbXSksIHYzcyhtZXNoRGF0YS52ZXJ0aWNlcyBhcyBWZWN0b3IzRGF0YVtdKV1cblx0XHQ6IFtcblx0XHRcdFx0KG1lc2hEYXRhLmZhY2VzIGFzIEZhY2VEYXRhW10pXG5cdFx0XHRcdFx0Lm1hcCgoZmFjZSkgPT4gYFske2ZhY2UubWFwKCh2ZXJ0ZXgpID0+IGBbJHt2ZXJ0ZXguam9pbignLCAnKX1dYCkuam9pbignLCAnKX1dYClcblx0XHRcdFx0XHQuam9pbignLFxcblxcdCcpLFxuXHRcdFx0XVxuXG5cdHJldHVybiBgaW1wb3J0IHsgTWVzaCB9IGZyb20gJ0B0c2N1bHB0L3R5cGVzL21lc2gnXG5cbmV4cG9ydCBkZWZhdWx0IG5ldyBNZXNoKFtcblx0JHtmYWNlc31cbl0ke1xuXHRcdHZlcnRpY2VzXG5cdFx0XHQ/IGAsIFtcblx0JHt2ZXJ0aWNlc31cbl1gXG5cdFx0XHQ6ICcnXG5cdH0pXG5gXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZUZha2VNZXNoU291cmNlKCk6IHN0cmluZyB7XG5cdHJldHVybiBgaW1wb3J0IHsgTWVzaCB9IGZyb20gJ0B0c2N1bHB0L3R5cGVzL21lc2gnXG5cbi8vIE1vY2sgbWVzaCBzb3VyY2VcbmNvbnN0IGZhY2VzID0gW1xuXHRbWzAsIDAsIDBdLCBbMSwgMCwgMF0sIFswLCAxLCAwXV0sXG5cdFtbMSwgMCwgMF0sIFsxLCAxLCAwXSwgWzAsIDEsIDBdXSxcblx0W1swLCAwLCAxXSwgWzEsIDAsIDFdLCBbMCwgMSwgMV1dLFxuXHRbWzEsIDAsIDFdLCBbMSwgMSwgMV0sIFswLCAxLCAxXV0sXG5cdFtbMCwgMCwgMF0sIFsxLCAwLCAwXSwgWzAsIDAsIDFdXSxcblx0W1sxLCAwLCAwXSwgWzEsIDAsIDFdLCBbMCwgMCwgMV1dLFxuXHRbWzAsIDEsIDBdLCBbMSwgMSwgMF0sIFswLCAxLCAxXV0sXG5cdFtbMSwgMSwgMF0sIFsxLCAxLCAxXSwgWzAsIDEsIDFdXSxcblx0W1swLCAwLCAwXSwgWzAsIDEsIDBdLCBbMCwgMCwgMV1dLFxuXHRbWzAsIDEsIDBdLCBbMCwgMSwgMV0sIFswLCAwLCAxXV0sXG5cdFtbMSwgMCwgMF0sIFsxLCAxLCAwXSwgWzEsIDAsIDFdXSxcblx0W1sxLCAxLCAwXSwgWzEsIDEsIDFdLCBbMSwgMCwgMV1dXG5dXG5cbmV4cG9ydCBkZWZhdWx0IG5ldyBNZXNoKGZhY2VzKVxuYFxufVxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9mbWRtL2Rldi90c2N1bHB0L3NyYy9jbGllbnRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL2ZtZG0vZGV2L3RzY3VscHQvc3JjL2NsaWVudC92aXRlLXBsdWdpbi1wYXJhbS1tZXRhZGF0YS50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9mbWRtL2Rldi90c2N1bHB0L3NyYy9jbGllbnQvdml0ZS1wbHVnaW4tcGFyYW0tbWV0YWRhdGEudHNcIjtpbXBvcnQgeyBQcm9qZWN0LCBTeW50YXhLaW5kIH0gZnJvbSAndHMtbW9ycGgnXG5pbXBvcnQgeyBQbHVnaW4gfSBmcm9tICd2aXRlJ1xuXG5mdW5jdGlvbiBnaXZlbkNvbnN0YW50KHZhbHVlOiBhbnkpIHtcblx0Y29uc3QgdGV4dCA9IHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgPyB2YWx1ZSA6IHZhbHVlLmdldFRleHQoKVxuXHR0cnkge1xuXHRcdC8vIGJpb21lLWlnbm9yZSBsaW50OiBGcm9tIGNvZGVyIHRvIGNvZGVyXG5cdFx0cmV0dXJuICgwLCBldmFsKSh0ZXh0KVxuXHR9IGNhdGNoIChlKSB7XG5cdFx0cmV0dXJuIHsgcmF3OiB0ZXh0IH1cblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBwYXJhbU1ldGFkYXRhSW5qZWN0b3IoKTogUGx1Z2luIHtcblx0cmV0dXJuIHtcblx0XHRuYW1lOiAndml0ZS1wbHVnaW4tcGFyYW0tbWV0YWRhdGEnLFxuXHRcdGVuZm9yY2U6ICdwcmUnLFxuXHRcdGFzeW5jIHRyYW5zZm9ybShjb2RlLCBpZCkge1xuXHRcdFx0aWYgKCFpZC5lbmRzV2l0aCgnLnNjdWxwdC50cycpKSByZXR1cm5cblxuXHRcdFx0Y29uc3QgcHJvamVjdCA9IG5ldyBQcm9qZWN0KClcblx0XHRcdGNvbnN0IHNvdXJjZUZpbGUgPSBwcm9qZWN0LmNyZWF0ZVNvdXJjZUZpbGUoJ3NjdWxwdC50cycsIGNvZGUsIHsgb3ZlcndyaXRlOiB0cnVlIH0pXG5cblx0XHRcdGNvbnN0IGV4cG9ydGVkRm5zID0gc291cmNlRmlsZS5nZXRGdW5jdGlvbnMoKS5maWx0ZXIoKGZuKSA9PiBmbi5pc0V4cG9ydGVkKCkpXG5cblx0XHRcdGZvciAoY29uc3QgZm4gb2YgZXhwb3J0ZWRGbnMpIHtcblx0XHRcdFx0Y29uc3QgZm5OYW1lID0gZm4uZ2V0TmFtZSgpXG5cdFx0XHRcdGNvbnN0IHBhcmFtcyA9IGZuLmdldFBhcmFtZXRlcnMoKVxuXHRcdFx0XHRpZiAoIXBhcmFtcy5sZW5ndGgpIGNvbnRpbnVlXG5cblx0XHRcdFx0Y29uc3QgZmlyc3RQYXJhbSA9IHBhcmFtc1swXVxuXHRcdFx0XHRjb25zdCBtZXRhZGF0YTogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9XG5cblx0XHRcdFx0Y29uc3QgYmluZGluZ1BhdHRlcm4gPSBmaXJzdFBhcmFtLmdldE5hbWVOb2RlKCkuYXNLaW5kKFN5bnRheEtpbmQuT2JqZWN0QmluZGluZ1BhdHRlcm4pXG5cdFx0XHRcdGlmICghYmluZGluZ1BhdHRlcm4pIGNvbnRpbnVlXG5cblx0XHRcdFx0Y29uc3QgZWxlbWVudHMgPSBiaW5kaW5nUGF0dGVybi5nZXRFbGVtZW50cygpXG5cdFx0XHRcdGZvciAoY29uc3QgZWwgb2YgZWxlbWVudHMpIHtcblx0XHRcdFx0XHRjb25zdCBuYW1lID0gZWwuZ2V0TmFtZSgpXG5cdFx0XHRcdFx0Y29uc3QgaW5pdGlhbGl6ZXIgPSBlbC5nZXRJbml0aWFsaXplcigpXG5cdFx0XHRcdFx0aWYgKCFpbml0aWFsaXplcikgY29udGludWVcblxuXHRcdFx0XHRcdGlmIChpbml0aWFsaXplci5nZXRLaW5kKCkgPT09IFN5bnRheEtpbmQuQXNFeHByZXNzaW9uKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBhc0V4cHIgPSBpbml0aWFsaXplci5hc0tpbmRPclRocm93KFN5bnRheEtpbmQuQXNFeHByZXNzaW9uKVxuXHRcdFx0XHRcdFx0Y29uc3QgdGhpc1BhcmFtOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge1xuXHRcdFx0XHRcdFx0XHRkZWZhdWx0OiBnaXZlbkNvbnN0YW50KGFzRXhwci5nZXRFeHByZXNzaW9uKCkpLFxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0Y29uc3QgdHlwZU5vZGUgPSBhc0V4cHIuZ2V0VHlwZU5vZGUoKVxuXHRcdFx0XHRcdFx0Y29uc3QgdHlwZVJlZiA9IHR5cGVOb2RlPy5hc0tpbmQoU3ludGF4S2luZC5UeXBlUmVmZXJlbmNlKVxuXHRcdFx0XHRcdFx0aWYgKHR5cGVSZWYgJiYgdHlwZU5vZGUhLmdldEtpbmQoKSA9PT0gU3ludGF4S2luZC5UeXBlUmVmZXJlbmNlKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnN0IGtpbmQgPSB0eXBlUmVmLmdldFR5cGVOYW1lKCkuZ2V0VGV4dCgpXG5cdFx0XHRcdFx0XHRcdHRoaXNQYXJhbS50eXBlID0ga2luZFxuXHRcdFx0XHRcdFx0XHR0aGlzUGFyYW0uYXJncyA9IHR5cGVSZWYuZ2V0VHlwZUFyZ3VtZW50cygpLm1hcChnaXZlbkNvbnN0YW50KVxuXHRcdFx0XHRcdFx0fSBlbHNlIGlmICh0eXBlTm9kZT8uZ2V0S2luZCgpID09PSBTeW50YXhLaW5kLlVuaW9uVHlwZSkge1xuXHRcdFx0XHRcdFx0XHR0aGlzUGFyYW0udHlwZSA9ICdVbmlvbidcblx0XHRcdFx0XHRcdFx0dGhpc1BhcmFtLmFyZ3MgPSB0eXBlTm9kZVxuXHRcdFx0XHRcdFx0XHRcdC5nZXRUZXh0KClcblx0XHRcdFx0XHRcdFx0XHQuc3BsaXQoJ3wnKVxuXHRcdFx0XHRcdFx0XHRcdC5tYXAoKHQpID0+IGdpdmVuQ29uc3RhbnQodC50cmltKCkpKVxuXHRcdFx0XHRcdFx0fSBlbHNlIGlmICh0eXBlTm9kZSkgdGhpc1BhcmFtLnR5cGUgPSB0eXBlTm9kZS5nZXRUZXh0KClcblx0XHRcdFx0XHRcdG1ldGFkYXRhW25hbWVdID0gdGhpc1BhcmFtXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKE9iamVjdC5rZXlzKG1ldGFkYXRhKS5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdFx0Y29uc3QgaW5zZXJ0VGV4dCA9IGBcXG4ke2ZuTmFtZX0ucGFyYW1zID0gJHtKU09OLnN0cmluZ2lmeShtZXRhZGF0YSwgbnVsbCwgMil9O1xcbmBcblx0XHRcdFx0XHRjb2RlICs9IGluc2VydFRleHRcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gY29kZVxuXHRcdH0sXG5cdH1cbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7QUFDQSxTQUFTLEtBQUsscUJBQXFCO0FBQ25DLFNBQVMsd0JBQXdCO0FBQ2pDLE9BQU8sU0FBUztBQUNoQixPQUFPLGdCQUFnQjtBQUN2QixTQUFTLG9CQUFvQjs7O0FDTGtRLFNBQVMsb0JBQW9CO0FBQzVULFNBQVMsZUFBZTs7O0FDNEJ4QixTQUFTLGVBQWUsc0JBQXNCO0FBQzlDLFNBQVMsYUFBYSxvQkFBb0I7QUFDMUMsU0FBUyxlQUFlLHNCQUFzQjtBQUM5QyxTQUFTLGFBQWEsb0JBQW9CO0FBQzFDLFNBQVMsZUFBZSxzQkFBc0I7QUFDOUMsU0FBUyxhQUFhLG9CQUFvQjtBQUMxQyxTQUFTLGVBQWUsc0JBQXNCO0FBQzlDLFNBQVMsYUFBYSxvQkFBb0I7QUFDMUMsU0FBUyxlQUFlLHNCQUFzQjtBQUM5QyxTQUFTLGFBQWEsb0JBQW9CO0FBQzFDLFNBQVMsZUFBZSxzQkFBc0I7QUFDOUMsU0FBUyxhQUFhLG9CQUFvQjs7O0FDdEMxQyxTQUFTLGVBQWUsS0FBNEI7QUFDbkQsU0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO0FBQy9CO0FBRUEsU0FBUyxlQUFlLEdBQTBCO0FBQ2pELFNBQU8sQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztBQUN6QjtBQUVBLElBQU8sbUJBQVEsQ0FDZCxXQUNBLFdBQ0EsaUJBQ2tCO0FBQUEsRUFDbEI7QUFBQSxFQUVBLEtBQUssTUFBc0M7QUFDMUMsUUFBSTtBQUVKLFFBQUksT0FB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
