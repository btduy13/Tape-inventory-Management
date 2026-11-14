import type { Metadata } from "next";
import { LandingG } from "@/features/landing-variants/logo-motion/LandingG";

export const metadata: Metadata = {
  title: "Dấu ấn trên từng gói hàng · Vĩnh Thịnh",
  description: "Băng keo in logo theo yêu cầu. Khám phá chất liệu, thử logo và xem sản phẩm trong không gian 3D.",
  robots: { index: false, follow: false },
};

export default function Page() { return <LandingG />; }

