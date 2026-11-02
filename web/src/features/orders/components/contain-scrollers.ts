// Kit scrollers (status chips, mobile sort chips, workflow strip) hold `sr-only` spans, which
// are absolutely positioned. Without a positioned scroller they escape its overflow clip and
// widen the page on phones. Making every scroller `relative` keeps them inside.
// TODO(portal-ui): move `relative` into the kit's overflow-x-auto containers, then drop this.
export const CONTAIN_SCROLLERS = "[&_.overflow-x-auto]:relative";
