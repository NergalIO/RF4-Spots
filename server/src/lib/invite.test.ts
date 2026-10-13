import { describe, expect, it } from "vitest";
import { generateInviteCode, inviteIsUsable, inviteStatus, normalizeInviteCode } from "./invite.js";

describe("invite", () => {
  it("normalizes code", () => {
    expect(normalizeInviteCode(" ab-cd ")).toBe("ABCD");
  });

  it("generates unique-looking codes", () => {
    const a = generateInviteCode();
    const b = generateInviteCode();
    expect(a).toHaveLength(8);
    expect(a).not.toBe(b);
  });

  it("rejects exhausted or expired invites", () => {
    expect(inviteIsUsable({ usesCount: 1, maxUses: 1, expiresAt: null })).toBe(false);
    expect(inviteIsUsable({ usesCount: 0, maxUses: 1, expiresAt: new Date(Date.now() - 1000) })).toBe(false);
    expect(inviteIsUsable({ usesCount: 0, maxUses: 3, expiresAt: null })).toBe(true);
    expect(inviteStatus({ usesCount: 3, maxUses: 3, expiresAt: null })).toBe("exhausted");
    expect(inviteStatus({ usesCount: 0, maxUses: 1, expiresAt: new Date(Date.now() - 1) })).toBe("expired");
  });
});
