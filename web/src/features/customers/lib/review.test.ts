import { describe, expect, it } from "vitest";
import { canBulkCreate, groupName, groupTotal, hasName, reviewKey, spellings } from "./review";
import type { ReviewMember, ReviewRow } from "./types";

const m = (ten: string | null, tong: number | null): ReviewMember => ({
  source_table: "bang_keo_orders", order_type: "bang_keo", source_id: "x", thoi_gian: null, ten_khach_hang: ten, sdt_khach_hang: null, tong_tien: tong,
});
const row = (members: ReviewMember[], ten: string | null = members[0]?.ten_khach_hang ?? null) =>
  ({ source_table: "bang_keo_orders", source_id: "B-1", ten_khach_hang: ten, members } as unknown as ReviewRow);

describe("review helpers", () => {
  it("key, spellings by use, name, total", () => {
    const r = row([m("Chị Hoà", 100), m(" chị  hoa ", null), m("chị hoa", 50), m("Chị Hoà", 1)]);
    expect(reviewKey(r)).toBe("bang_keo_orders:B-1");
    expect(spellings(r)).toEqual(["Chị Hoà", "chị hoa"]);
    expect(groupName(r)).toBe("Chị Hoà");
    expect(groupTotal(r)).toBe(151);
  });

  it("a group without any name cannot be bulk created", () => {
    expect(hasName(row([m(null, 1), m("  ", 2)]))).toBe(false);
    expect(groupName(row([m(null, 1)]))).toBe("B-1");
  });

  it("only plain same-name groups can be bulk created (a possible existing customer stays one-by-one)", () => {
    const plain = { ...row([m("Lan", 1)]), reason: "same name, no phone" } as ReviewRow;
    expect(canBulkCreate(plain)).toBe(true);
    expect(canBulkCreate({ ...plain, reason: "name matches a customer" } as ReviewRow)).toBe(false);
  });
});
