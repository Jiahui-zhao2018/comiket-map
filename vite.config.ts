import { defineConfig } from "vite";

// Both normal development and built-app previews are local to this PC.
export default defineConfig({
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
  preview: { host: "127.0.0.1", port: 4173, strictPort: true },
});
