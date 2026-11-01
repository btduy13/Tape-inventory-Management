import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

afterEach(cleanup);
import { DesignProvider } from "./DesignProvider";
import { LogoUpload } from "./LogoUpload";

vi.mock("../lib/logo-load", () => ({
  loadLogoFile: vi.fn(async (file: File) =>
    file.name.endsWith(".png")
      ? { ok: true, logo: { file, kind: "png", url: "blob:logo", width: 40, height: 20 } }
      : { ok: false, error: "invalidType" },
  ),
}));

function setup() {
  render(
    <DesignProvider>
      <LogoUpload />
    </DesignProvider>,
  );
}

describe("<LogoUpload>", () => {
  it("accepts a dropped file and shows thumbnail, name and controls", async () => {
    setup();
    const zone = screen.getByText("Kéo thả logo vào đây hoặc bấm để chọn file").closest("label")!;
    const file = new File(["x"], "my-logo.png", { type: "image/png" });
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });
    await waitFor(() => expect(screen.getByText("my-logo.png")).toBeInTheDocument());
    expect(screen.getByAltText("Ảnh logo đã chọn")).toHaveAttribute("src", "blob:logo");
    // Logo always prints in its own colours: no colour-mode choice.
    expect(screen.queryByRole("radio", { name: "In một màu" })).not.toBeInTheDocument();
    expect(screen.getByText("Logo được in đúng màu gốc. Logo nhiều màu sẽ được tư vấn phương án in khi báo giá.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Xóa logo" }));
    expect(screen.queryByText("my-logo.png")).not.toBeInTheDocument();
  });

  it("shows an error for rejected files", async () => {
    setup();
    const input = screen.getByTestId("logo-input");
    fireEvent.change(input, { target: { files: [new File(["x"], "a.txt")] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("Chỉ chấp nhận PNG, JPG, SVG, WEBP hoặc GIF");
    expect(input).toHaveAttribute("accept", expect.stringContaining("image/webp"));
  });
});
