import { NextResponse } from "next/server";

/**
 * Wraps a route handler so an unexpected throw (a Supabase hiccup, a
 * Pinterest API surprise, anything not already caught) still comes back as
 * `{ error }` JSON instead of Next's bare empty-body 500 — which the
 * dashboard's `res.json()` calls can't parse, turning one real failure into
 * a second, more confusing one ("Unexpected end of JSON input").
 */
export function withApiErrors<Args extends unknown[]>(
  handler: (req: Request, ...args: Args) => Promise<Response>
) {
  return async (req: Request, ...args: Args): Promise<Response> => {
    try {
      return await handler(req, ...args);
    } catch (err) {
      console.error(err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Unexpected server error." },
        { status: 500 }
      );
    }
  };
}
