import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import path from "path";

import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const apiUrl = process.env.VITE_API_URL;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    root: path.resolve(__dirname, "client"),
    server: {
      host: "0.0.0.0",
      port: 5173, // ou qualquer outra porta que preferir
      allowedHosts: [".replit.dev"],
    },
    build: {
      outDir: "../dist", // saída para a raiz do projeto
      emptyOutDir: true,
    },
    base: "/ranking",
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client", "src"),
        "@shared": path.resolve(__dirname, "shared"),
        "@assets": path.resolve(__dirname, "attached_assets"),
      },
      define: {
        __SUPABASE_URL__: JSON.stringify(supabaseUrl),
        __SUPABASE_ANON_KEY__: JSON.stringify(supabaseAnonKey),
        __API_URL__: JSON.stringify(apiUrl),
      },
    },
  };
});
