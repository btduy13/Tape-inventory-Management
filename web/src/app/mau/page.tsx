// Local design review: links to the three landing page variants (/mau/a, /mau/b, /mau/c).
import Link from "next/link";

export const metadata = { title: "Chọn mẫu landing" };

const VARIANTS = [
  { href: "/mau/a", name: "Mẫu A", note: "Đậm, công nghiệp: xanh cobalt + vàng băng keo, chữ lớn" },
  { href: "/mau/b", name: "Mẫu B", note: "Tối giản cao cấp: nền giấy kraft, 3D sản phẩm" },
  { href: "/mau/c", name: "Mẫu C", note: "Tương tác, bento tối: gõ tên thương hiệu, xem băng keo ngay" },
];

export default function VariantPicker() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold">Chọn mẫu landing page</h1>
      <ul className="mt-6 grid gap-3">
        {VARIANTS.map((v) => (
          <li key={v.href}>
            <Link
              href={v.href}
              className="block rounded-xl border border-neutral-300 p-4 hover:border-neutral-900 focus-visible:outline focus-visible:outline-2"
            >
              <span className="text-lg font-semibold">{v.name}</span>
              <span className="mt-1 block text-sm text-neutral-600">{v.note}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
