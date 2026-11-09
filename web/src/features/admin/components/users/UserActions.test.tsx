// Regression (QC UI-3): at 768-1024px the table squeezed the row actions, and "Khóa" read as plain
// text. The actions block keeps a fixed width and the lock control is a bordered button. Role, tabs
// and permissions moved into the "Sửa" dialog (0030).
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { UserActions } from "./UserActions";
import { UserEditForm } from "./UserEditForm";
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
  nav_tabs: null,
  permissions: ["orders.view"],
};

describe("UserActions layout", () => {
  it("keeps a fixed-width block with the edit button", () => {
    render(<UserActions user={user} isSelf={false} />);
    const block = screen.getByTestId("user-actions");
    expect(block.className).toMatch(/\bw-60\b/);
    expect(block.className).toMatch(/\bgrid-cols-2\b/);
    expect(screen.getByRole("button", { name: "Sửa" })).toBeTruthy();
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

  it("lets the signed-in admin edit his own row but not lock it", () => {
    render(<UserActions user={user} isSelf />);
    expect(screen.getByRole("button", { name: "Sửa" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Khóa" })).toBeNull();
  });
});

describe("UserEditForm", () => {
  const checked = (name: string) => (screen.getByRole("checkbox", { name }) as HTMLInputElement).checked;

  it("ticks the role default tabs and the stored permissions", () => {
    render(<UserEditForm user={user} isSelf={false} onDone={() => {}} />);
    expect(checked("Yêu cầu báo giá")).toBe(true);
    expect(checked("Đơn hàng")).toBe(false);
    expect(checked("Xem đơn hàng")).toBe(true);
    expect(checked("Xem tiền lời/chi phí")).toBe(false);
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("ctv");
  });

  it("keeps the admin's own role and status out of reach", () => {
    render(<UserEditForm user={{ ...user, role: "admin" }} isSelf onDone={() => {}} />);
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.getByText("Quản trị viên xem mọi tab và có mọi quyền.")).toBeTruthy();
  });
});
