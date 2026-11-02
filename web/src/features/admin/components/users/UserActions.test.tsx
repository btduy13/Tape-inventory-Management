// Regression (QC UI-3): at 768-1024px the table squeezed the role <select> to ~100px, cutting
// "Cộng tác viên", and "Khóa" read as plain text. The actions block now has a fixed width and the
// lock control is a bordered button.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { UserActions } from "./UserActions";
import type { UserRow } from "../../server/queries";

vi.mock("../../server/actions-users", () => ({ updateUserAction: vi.fn(async (s: unknown) => s) }));

afterEach(cleanup);

const user: UserRow = {
  id: "00000000-0000-0000-0000-00000000a005",
  email: "ctv@local.test",
  full_name: "Cộng tác viên",
  phone: null,
  role: "ctv",
  is_active: true,
  created_at: "2026-11-02T00:00:00Z",
};

describe("UserActions layout", () => {
  it("keeps a fixed-width block so the role select is not squeezed", () => {
    render(<UserActions user={user} isSelf={false} />);
    const block = screen.getByTestId("user-actions");
    expect(block.className).toMatch(/\bw-60\b/);
    expect(block.className).toMatch(/\bgrid-cols-2\b/);
    const select = screen.getByRole("combobox");
    // The old w-40 fought inputClass's w-full; the select now spans both columns.
    expect(select.className).not.toMatch(/\bw-40\b/);
    expect(select.className).toMatch(/\bcol-span-2\b/);
    expect((select as HTMLSelectElement).value).toBe("ctv");
  });

  it("renders lock as a bordered, single-line red button", () => {
    render(<UserActions user={user} isSelf={false} />);
    const lock = screen.getByRole("button", { name: "Khóa" });
    expect(lock.className).toMatch(/\bborder\b/);
    expect(lock.className).toMatch(/whitespace-nowrap/);
    expect(lock.className).toMatch(/text-pt-red-ink!/);
  });

  it("shows unlock (not lock) for a locked account", () => {
    render(<UserActions user={{ ...user, is_active: false }} isSelf={false} />);
    expect(screen.getByRole("button", { name: "Mở khóa" }).className).toMatch(/\bborder\b/);
    expect(screen.queryByRole("button", { name: "Khóa" })).toBeNull();
  });

  it("shows only a note for the signed-in admin's own row", () => {
    render(<UserActions user={user} isSelf />);
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
