import { getDictionary } from "@/i18n";
import { logoutAction } from "../server/actions";

const t = getDictionary();

/** Plain form post to a Server Action: works without client JS. */
export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button type="submit" className="rounded-md px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100">
        {t.nav.logout}
      </button>
    </form>
  );
}
