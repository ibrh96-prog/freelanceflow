/**
 * Vercel serverless function entry point.
 *
 * _bundle.cjs is generated during the Vercel build step (`pnpm build:api`) by
 * esbuild with --bundle, which inlines every workspace package (@workspace/db,
 * @workspace/api-zod) plus all npm dependencies, so no monorepo symlinks need to
 * exist at runtime.
 *
 * We `import` the CJS bundle (never `require`) so the ESM/CJS boundary is
 * handled by the loader — this avoids the ERR_REQUIRE_ESM crash. Files prefixed
 * with `_` are ignored by Vercel as their own routes but can be imported here.
 */
import app from "./_bundle.cjs";

export default app;
