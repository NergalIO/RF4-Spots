import { describe, expect, it } from "vitest";
import { generateInviteCode, inviteIsUsable, normalizeInviteCode } from "./invite.js";

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

  it("rejects used or expired invites", () => {
    expect(inviteIsUsable({ usedAt: new Date(), expiresAt: null })).toBe(false);
    expect(inviteIsUsable({ usedAt: null, expiresAt: new Date(Date.now() - 1000) })).toBe(false);
    expect(inviteIsUsable({ usedAt: null, expiresAt: null })).toBe(true);
  });
});
