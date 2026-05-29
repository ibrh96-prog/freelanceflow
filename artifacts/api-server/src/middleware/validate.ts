import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: result.error.issues.map((i) => i.message).join(", "),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function parseIdParam(req: Request): number | null {
  const id = Number(req.params.id);
  return Number.isFinite(id) ? id : null;
}
