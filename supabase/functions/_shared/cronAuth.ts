/**
 * Authentication for scheduled functions that use the service-role client.
 *
 * Supabase's platform JWT check is disabled for these functions so that a
 * dedicated CRON_SECRET can be used by GitHub Actions. The service-role key
 * is accepted only for owner-run diagnostics; it is never placed in a
 * workflow file or browser request.
 */
declare const Deno: { env: { get(name: string): string | undefined } };

function constantTimeEqual(left: string, right: string): boolean {
  if (!left || !right || left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

/**
 * Accept only a non-empty bearer token that matches an explicitly configured
 * cron secret or the service-role key. Arbitrary x-supabase-cron headers are
 * intentionally not trusted because callers can forge them.
 */
export function isCronAuthorized(req: Request): boolean {
  const authorization = req.headers.get('authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return false;

  const presented = authorization.slice('Bearer '.length).trim();
  const cronSecret = Deno.env.get('CRON_SECRET')?.trim() ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim() ?? '';

  return constantTimeEqual(presented, cronSecret)
    || constantTimeEqual(presented, serviceRoleKey);
}
