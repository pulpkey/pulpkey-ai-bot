/**
 * Member roster — the single source of truth for who is in the group, keyed by
 * `phone` (E.164). It lives in the bridge package so the bridge can import it
 * directly for the DM allowlist; the agent imports the same file
 * (../../bridge/members.js) for who-is and roster logic. One file, two readers,
 * no sync and no external store — so membership can never drift.
 *
 * Pure data: no imports, no secrets beyond the phone numbers that ARE the keys.
 * Public-professional facts + in-chat notes only.
 *
 * ── TEMPLATE ──────────────────────────────────────────────────────────────
 * Replace the two example entries below with your real members. The `phone`
 * (E.164, e.g. "+15551234567") is the unique id and, in DM/whitelist trigger
 * modes, the allowlist key. Everything except `phone`, `name` and `tags` is
 * optional. Never commit real phone numbers to a public repo you don't control.
 * ───────────────────────────────────────────────────────────────────────────
 */

export interface Member {
  /** E.164 phone number — the unique member id and DM-allowlist key. */
  phone: string;
  name: string;
  aliases?: string[];
  /** Defaults to true; `false` marks a non-member contact. */
  member?: boolean;
  role?: string;
  org?: string;
  location?: string;
  joined?: string;
  focus?: string;
  inChat?: string[];
  linkedin?: string;
  github?: string;
  x?: string;
  links?: string[];
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
}

// Intentionally empty. Production member data must be explicitly reviewed
// before enabling DM replies; shipping fake contacts creates a second, stale
// directory and weakens the fail-closed default.
export const MEMBERS: Member[] = [];
