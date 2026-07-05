import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// iakaFrameGUI front (Tauri 2). Port dev DÉDIÉ au projet (3030) pour éviter toute
// collision avec les stacks sœurs de l'écosystème iaka (le Cockpit occupe 3020).
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 3030,
    strictPort: true,
  },
  build: {
    target: "es2020",
  },
});
