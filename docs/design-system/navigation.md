# Navigation

[Guide index](README.md) · Implementation: [shared/navigation/](../../shared/navigation/)

## Global and local bars

At the top of a page the 44px global bar contains an accessible house-icon Home link and project categories. After more than 8px of scrolling, it retracts and the 52px local bar shows the project title and **On this page**. These are alternative visible states, not a permanently stacked 96px header.

Reuse the shared renderer, controller and styles. They use the `sp-` namespace to isolate navigation from page-specific CSS and legacy frameworks. Navigation labels share the 13px token and controls have at least 44px tap height. The surface uses `rgba(251,251,253,.92)` with `saturate(180%) blur(20px)` and a fine lower border.

## Project menu

- At widths of at least 900px, display the centered category buttons. A fine mouse pointer can open them on hover; click and keyboard also work.
- At narrower widths, use Home and **All projects**, which opens the grouped panel. Touch remains click-driven even on a wide screen.
- Read category order and projects from the configuration files. Show project logos and short descriptions; distinguish the active project with a subtle gradient tint.
- The current project panel has an 18px radius and a width constrained to the viewport, up to about 440px. Do not restore the prototype's fixed 580px, three-column local project switcher.
- Allow 180ms on pointer leave so crossing the gap into a panel works. Dismiss using Escape or an outside click/backdrop, and restore focus when appropriate.

## On this page

Chapter labels come from `page.json`, with `id`, `label`, `group` and a short `description`. The taxonomy is defined in [config/section-groups.json](../../config/section-groups.json): Research, Evaluation and Resources for papers; Scaling routes and Projects for the hub. Label author sections **Team** and citation sections **Citation**, preserving existing IDs such as `authors`, `bibtex` or `citation`.

Group by the section's purpose. A demo explaining the mechanism can belong to Research; a measured comparison belongs to Evaluation. Keep the natural reading order and existing anchor links.

Desktop supports hover with the same 180ms grace period and no hover focus stealing. Click/touch and ArrowDown/Escape remain available. Closed contents are inert. Desktop groups use columns; mobile groups stack within a scrollable panel. Short descriptions supplement the labels without turning the menu into an abstract.

## Motion and verification

The project panel enters with a small downward motion and staggered group fades. The contents panel has reversible opacity/translation transitions: roughly 280ms entrance, 180ms exit and 35ms group staggering. Reduced motion removes those transitions.

Check both sides of the 900px breakpoint, touch behavior, keyboard operation, panel-gap crossing and a deep section anchor. Opening a menu must not hide the Home control, clip content or leave the body unable to scroll after dismissal. Use the existing navigation tests when changing this behavior.
