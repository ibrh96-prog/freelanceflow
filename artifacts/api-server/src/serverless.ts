/**
 * Serverless entry point for Vercel.
 *
 * Unlike src/index.ts (which calls app.listen for local/long-running use), this
 * module just builds the Express app and exports it as the default export. The
 * exported app is itself a (req, res) handler, which is exactly what a Vercel
 * Node serverless function expects.
 *
 * esbuild bundles this file (and all workspace packages) into api/_bundle.cjs.
 */
import "dotenv/config";
import { createApp } from "./app";

export default createApp();
