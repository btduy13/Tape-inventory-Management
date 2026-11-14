// Local design review: links to the landing page variants (/mau/a, /mau/b, /mau/c, /mau/d, /mau/e1-e3).
import Link from "next/link";

export const metadata = { title: "Chọn mẫu landing" };

const VARIANTS = [
  { href: "/mau/a", name: "Mẫu A", note: "Đậm, công nghiệp: xanh cobalt + vàng băng keo, chữ lớn" },
  { href: "/mau/b", name: "Mẫu B", note: "Tối giản cao cấp: nền giấy kraft, 3D sản phẩm" },
  { href: "/mau/c", name: "Mẫu C", note: "Tương tác, bento tối: gõ tên thương hiệu, xem băng keo ngay" },
  { href: "/mau/d", name: "Mẫu D", note: "Thương hiệu hiện tại + 3D ngay đầu trang: gõ tên, xem băng keo trên thùng hàng" },
  { href: "/mau/e1", name: "Mẫu E1", note: "Motion băng keo: chữ lớn + băng keo luồn, hai dải chéo phía sau" },
  { href: "/mau/e2", name: "Mẫu E2", note: "Motion băng keo: gõ tên, in ngay lên dải băng trong chữ lớn, 3D bên dưới" },
  { href: "/mau/e3", name: "Mẫu E3", note: "Motion băng keo: tiêu đề in trên ba dải băng do cuộn lăn ra" },
  { href: "/mau/f", name: "Mẫu F", note: "Studio sáng, cao cấp: nền trắng xám, cuộn băng keo và thùng hàng 3D thật" },
  { href: "/mau/parcel-wall", name: "Mẫu Chữ 3D", note: "Studio sáng: chữ BĂNG KEO 3D có băng keo luồn qua, nhiều đồ vật và logo khác nhau, thanh trượt so sánh, hình động quy trình" },
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
