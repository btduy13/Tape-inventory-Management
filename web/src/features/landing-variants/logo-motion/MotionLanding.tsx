"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import "./motion-landing.css";

function Brand({ small = false }: { small?: boolean }) {
  // Static images avoid the inline styles that next/image adds under our strict CSP.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/vinh-thinh-mark.png" width={small ? 100 : 110} height={small ? 61 : 67} alt="Vĩnh Thịnh" />;
}

export function MotionLanding() {
  const video = useRef<HTMLVideoElement>(null);
  const manualPause = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);
  const [menu, setMenu] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;
    const sync = () => {
      if (reduced.matches || manualPause.current || !visible || document.hidden) el.pause();
      else void el.play().catch(() => setPlaying(false));
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: .15 });
    observer.observe(el);
    reduced.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => { observer.disconnect(); reduced.removeEventListener("change", sync); document.removeEventListener("visibilitychange", sync); };
  }, []);
  const toggle = () => {
    const el = video.current;
    if (!el) return;
    if (!el.paused) { manualPause.current = true; setMotionPaused(true); el.pause(); }
    else { manualPause.current = false; setMotionPaused(false); void el.play().catch(() => setPlaying(false)); }
  };
  return <div className={`vt-film-site${motionPaused ? "" : " is-playing"}`}>
    <a className="vf-skip" href="#noi-dung">Chuyển đến nội dung</a>
    <header className="vf-header">
      <Link href="/" className="vf-brand" aria-label="Vĩnh Thịnh — Trang chủ"><Brand /><span>BĂNG KEO<br />IN LOGO</span></Link>
      <nav id="vf-mobile-menu" className={menu ? "vf-nav is-open" : "vf-nav"} aria-label="Điều hướng chính">
        <a href="#dau-an" onClick={() => setMenu(false)}>Dấu ấn thương hiệu</a>
        <a href="#dat-hang" onClick={() => setMenu(false)}>Cách đặt hàng</a>
        <a href="#lien-he" onClick={() => setMenu(false)}>Liên hệ</a>
      </nav>
      <Link className="vf-button vf-header-cta" href="/thiet-ke">Thiết kế băng keo <span aria-hidden="true">↗</span></Link>
      <button className="vf-menu" aria-expanded={menu} aria-controls="vf-mobile-menu" onClick={() => setMenu(!menu)}>{menu ? "Đóng" : "Menu"}</button>
    </header>
    <main id="noi-dung">
      <section className="vf-hero" aria-labelledby="vf-title">
        <div className="vf-hero-copy"><p className="vf-eyebrow">VĨNH THỊNH / BĂNG KEO IN THEO YÊU CẦU</p><h1 id="vf-title">Dấu ấn riêng.<br /><em>Trên từng đơn hàng.</em></h1></div>
        <p className="vf-hero-note">Từ một logo quen thuộc,<br />đến bao bì mang bản sắc của bạn.</p>
        <div className="vf-film">
          <video ref={video} muted loop playsInline preload="metadata" poster="/motion/vinh-thinh-poster.jpg" aria-label="Cận cảnh cuộn băng keo nhả dải băng in logo Vĩnh Thịnh" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => { setFailed(true); setPlaying(false); }}>
            <source src="/motion/vinh-thinh-product.mp4" type="video/mp4" />
          </video>
        </div>
        <div className="vf-hero-bottom"><Link className="vf-button" href="/thiet-ke">Bắt đầu từ logo của bạn <span aria-hidden="true">↗</span></Link><button className="vf-play" onClick={toggle} disabled={failed} aria-label={playing ? "Tạm dừng video" : "Phát video"}>{failed ? "Ảnh xem trước" : playing ? "Ⅱ Tạm dừng motion" : "▷ Phát motion"}</button><a className="vf-scroll" href="#dau-an">Khám phá <span aria-hidden="true">↓</span></a></div>
      </section>
      <section id="dau-an" className="vf-story">
        <p className="vf-eyebrow">MỘT CHI TIẾT NHỎ. MỘT NHẬN DIỆN RIÊNG.</p>
        <div className="vf-story-intro"><h2>Đóng gói hàng hóa.<br /><span>Mở ra sự nhận diện.</span></h2><p>Không cần thay toàn bộ bao bì. Một dải băng in logo giúp thương hiệu xuất hiện ngay trên lớp niêm phong — gọn gàng, nhất quán và dễ nhận ra.</p></div>
        <div className="vf-strip" aria-hidden="true"><div className="vf-strip-track">{Array.from({ length: 12 }, (_, i) => <Brand key={i} small />)}</div></div>
        <div className="vf-benefits"><div><span>01</span><h3>Logo là điểm nhấn</h3><p>Căn khoảng lặp, kích thước và màu in theo nhận diện của bạn.</p></div><div><span>02</span><h3>Đúng cách đóng gói</h3><p>Chọn khổ băng và chất liệu phù hợp với sản phẩm cần niêm phong.</p></div><div><span>03</span><h3>Xem trước khi in</h3><p>Kiểm tra bản in trên cuộn băng, ly hoặc thùng ngay trong trình thiết kế.</p></div></div>
      </section>
      <section className="vf-design"><div><p className="vf-eyebrow">THIẾT KẾ CỦA BẠN</p><h2>Bắt đầu bằng<br />một logo.</h2></div><div className="vf-design-detail"><p>Tải logo, chọn màu và sắp xếp bản in. Xem thiết kế của bạn trên sản phẩm trước khi gửi yêu cầu báo giá.</p><Link className="vf-button vf-light" href="/thiet-ke">Mở trình thiết kế <span aria-hidden="true">↗</span></Link><Link className="vf-design-preview" href="/thiet-ke#xem-3d">Xem thiết kế trên ly & thùng hàng ↗</Link></div></section>
      <section id="dat-hang" className="vf-process"><div className="vf-process-heading"><p className="vf-eyebrow">TỪ Ý TƯỞNG ĐẾN THÀNH PHẨM</p><h2>Ba bước.<br />Một cuộn băng riêng.</h2></div><ol><li><span>01 /</span><div><h3>Gửi thiết kế</h3><p>Tải logo và chọn quy cách, màu sắc, số lượng mong muốn.</p></div></li><li><span>02 /</span><div><h3>Duyệt mẫu & báo giá</h3><p>Vĩnh Thịnh cùng bạn kiểm tra bản in và xác nhận thông tin trước khi sản xuất.</p></div></li><li><span>03 /</span><div><h3>Nhận băng keo của bạn</h3><p>Hoàn thiện, đóng gói và giao thành phẩm theo đơn hàng đã xác nhận.</p></div></li></ol></section>
      <section id="lien-he" className="vf-contact"><p className="vf-eyebrow">CÙNG VĨNH THỊNH</p><h2>Để mỗi kiện hàng<br />mang dấu ấn của bạn.</h2><div><Link className="vf-button" href="/thiet-ke#yeu-cau-bao-gia">Thiết kế & nhận báo giá <span aria-hidden="true">↗</span></Link><a href="https://zalo.me/0903003882" target="_blank" rel="noreferrer" className="vf-contact-link">Trao đổi qua Zalo ↗</a></div></section>
    </main>
    <footer className="vf-footer"><Link href="/" aria-label="Vĩnh Thịnh — Trang chủ"><Brand /></Link><p>Băng keo in logo theo yêu cầu<br /><span>Hình ảnh sản phẩm là bản mô phỏng.</span></p><a href="tel:0903003882">0903 003 882</a><Link href="/dieu-khoan">Điều khoản sử dụng ↗</Link></footer>
  </div>;
}
