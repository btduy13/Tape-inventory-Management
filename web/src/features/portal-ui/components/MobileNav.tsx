"use client";
// Phone / tablet navigation: a menu button opening a left drawer (native modal <dialog>).
import { useRef } from "react";
import { getDictionary } from "@/i18n";
import type { AppRole } from "@/lib/types";
import { Icon } from "./Icon";
import { NavLinks } from "./NavLinks";

const p = getDictionary().portalUi;

type Props = { role: AppRole; userBlock: React.ReactNode };

export function MobileNav({ role, userBlock }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = () => ref.current?.close();
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        aria-haspopup="dialog"
        className="inline-flex size-11 items-center justify-center rounded-lg text-pt-text hover:bg-pt-grey-tint"
      >
        <Icon name="menu" className="size-6" />
        <span className="sr-only">{p.openMenu}</span>
      </button>
      <dialog
        ref={ref}
        aria-label={p.navMain}
        onClick={(e) => e.target === ref.current && close()} // click on the backdrop
        className="pt-dialog pt-drawer pt-on-dark m-0 h-dvh max-h-dvh w-[min(20rem,85vw)] max-w-none bg-vt-navy-deep p-0 text-white"
      >
        <div className="flex h-full flex-col gap-6 p-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold">{p.brand}</span>
            <button type="button" onClick={close} className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-white/10">
              <Icon name="close" className="size-6" />
              <span className="sr-only">{p.closeMenu}</span>
            </button>
          </div>
          <nav aria-label={p.navMain} className="flex-1 overflow-y-auto">
            <NavLinks role={role} onNavigate={close} />
          </nav>
          {userBlock}
        </div>
      </dialog>
    </>
  );
}
