// Regression: seed users use non-RFC ids (version nibble 0). z.string().uuid() is strict in
// zod 4 and rejected them, so assign / convert / admin updates failed with "Dữ liệu không hợp lệ".
import { describe, expect, it } from "vitest";
import { assignSchema as assignLead } from "@/features/assignment/lib/schemas";
import { assignSchema as assignWorkshop, convertSchema } from "@/features/workshop/lib/schemas";
import { updateUserSchema, leadIdSchema } from "@/features/admin/lib/schemas";
import { addNoteSchema, changeStatusSchema } from "@/features/orders/lib/schemas";
import { uuidSchema } from "@/features/quotes/lib/schemas";

const SEED = "00000000-0000-0000-0000-00000000a003";

describe("schemas accept seed-style ids", () => {
  it("assignment", () => {
    expect(assignLead.safeParse({ leadId: SEED, userId: SEED }).success).toBe(true);
  });
  it("workshop assign + convert", () => {
    expect(assignWorkshop.safeParse({ leadId: SEED, userId: SEED }).success).toBe(true);
    const conv = convertSchema().safeParse({ leadId: SEED, workshopUserId: SEED });
    if (!conv.success) {
      expect(conv.error.issues.some((i) => i.path.includes("workshopUserId") || i.path.includes("leadId"))).toBe(false);
    }
  });
  it("admin + orders + quotes", () => {
    expect(updateUserSchema.safeParse({ userId: SEED, role: "staff" }).success).toBe(true);
    expect(leadIdSchema.safeParse({ leadId: SEED }).success).toBe(true);
    expect(addNoteSchema.safeParse({ leadId: SEED, body: "x" }).success).toBe(true);
    expect(changeStatusSchema.safeParse({ leadId: SEED, to: "consulting" }).success).toBe(true);
    expect(uuidSchema.safeParse(SEED).success).toBe(true);
  });
  it("still rejects non-ids", () => {
    expect(assignLead.safeParse({ leadId: "1; drop table", userId: "" }).success).toBe(false);
    expect(uuidSchema.safeParse("not-a-uuid").success).toBe(false);
  });
});
