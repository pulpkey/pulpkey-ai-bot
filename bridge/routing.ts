import type { Whitelist } from "./whitelist.js";

/**
 * Per-message reply gate.
 *
 * One WhatsApp number, one group agent: group messages go to the agent when the
 * trigger rules match, member DMs go to the same agent, and non-member DMs are
 * logged but left unanswered. The account's own "message yourself" chat is a
 * local console and bypasses the member gate. Extracted as a pure function so
 * the gating matrix is unit-testable without Baileys.
 */

export interface ShouldReplyArgs {
  allowMemberDms: boolean;
  isDM: boolean;
  /** True for the bridge account's own "message yourself" chat. */
  isSelfChat: boolean;
  sender: string;
  senderPhone: string | null;
  whitelist: Whitelist;
}

/** True when a triggered message is allowed to reach the agent. */
export const shouldReplyToChat = ({
  isDM,
  isSelfChat,
  sender,
  senderPhone,
  whitelist,
  allowMemberDms,
}: ShouldReplyArgs): boolean => {
  // The account's own self-chat is a personal console for the agent. It
  // bypasses the member gate on purpose — you're messaging your own number, so
  // it need not appear in members.ts.
  if (isSelfChat) {
    return true;
  }
  if (!isDM) {
    return true;
  }
  if (!allowMemberDms) {
    return false;
  }
  const phone = senderPhone ?? sender;
  // Missing or unavailable roster data must never turn a private company bot
  // into a public DM endpoint. Self-chat remains the only explicit bypass.
  return whitelist.ready() && whitelist.isMember(phone);
};
