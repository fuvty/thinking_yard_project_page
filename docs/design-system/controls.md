# Shared controls and surfaces

[Guide index](README.md) · [Interaction examples](../../shared/ui/components-preview.html) · [Surface comparison](../../shared/ui/controls-preview.html)

Components own appearance, focus and interaction feedback. Pages own research data, selections, chart rendering and playback. Keep shared code and examples independent of any project; document page-specific integration in that project's README.

## Load only what the page uses

All pages receive `shared/ui/styles.css` and `controller.js`. These provide basic controls, sliding selections, author styles and existing resource controls. Load optional modules from the page's `head.html`, using `{{base}}/shared` so both language and deployment paths resolve correctly:

```html
<link rel="stylesheet" href="{{base}}/shared/ui/components/disclosure.css">
<script defer src="{{base}}/shared/ui/components/disclosure.js"></script>
<link rel="stylesheet" href="{{base}}/shared/ui/components/media.css">
```

| Component | Markup | Additional files in `shared/ui/components/` |
| --- | --- | --- |
| Neutral action | `button.sp-control` | None |
| Mutually exclusive choices | `.sp-segmented` with pressed buttons | None |
| Native select | `select.sp-select` | None |
| Enhanced select | `select.sp-select[data-picker]` | `select.css`, `select.js` |
| Expandable content | `details.sp-fold` | `disclosure.css`, `disclosure.js` |
| Icon playback | `button.sp-control.sp-media-button` | `media.css` |
| Author list | `.sp-authors` containing `.authors-list` | None; `authors.css` is imported by shared styles |

The interactive preview loads the same modules as production pages. Its `preview.js` only demonstrates state changes; never load it in a project. The surface comparison also documents `.sp-disclosure`, a compatibility treatment still used by existing pages. Use `.sp-fold` for new expandable content. Migrate existing controls deliberately, preserving their hooks and lifecycle instead of replacing classes globally.

## Backgrounds

`data-ui-surface="white|gray|dark"` describes the **immediate background**, not the site's theme. It sets inherited control tokens without painting the container. `.section` defaults to white, `.section-gray` and `.team-section` to gray, and `.section-dark` to dark. Explicitly mark custom surfaces and reset white cards nested in gray or dark sections.

| Component | White | Gray | Dark |
| --- | --- | --- | --- |
| Action / native select | Soft gray fill | White fill | Dark fill, light text |
| Segmented choices | Gray track, white selection | Darker gray track, white selection | Dark track, lighter selection |
| Enhanced select | Supported | Supported | Unsupported |
| Expandable content / authors | Supported | Supported | Unsupported |

An unsupported component needs a light wrapper with the matching surface declaration. Do not infer backgrounds from computed colors or override global color tokens for one control. Keep controls distinct through contrast and spacing, without stacked outlines. Keyboard focus uses a visible ring; pointer clicks do not. Touch targets are at least 44px.

## Segmented choices

```html
<div class="sp-segmented" role="group" aria-label="Model size">
  <button type="button" aria-pressed="true">4B</button>
  <button type="button" aria-pressed="false">8B</button>
</div>
```

Page code updates `aria-pressed` and the relevant data. Exactly one option is selected. The shared controller moves one highlight between options over 360ms with `cubic-bezier(.42,0,.12,1)`, including unequal labels and interrupted transitions. Resize and initial placement are immediate; reduced motion disables travel. Without JavaScript, the selected button retains its static fill. Use a range input for a continuous value, not a segmented control.

## Select menus

```html
<label for="model">Model</label>
<select id="model" class="sp-select" data-picker>
  <option value="small">Small</option>
  <option value="large">Large</option>
</select>
```

Keep labels and values in the native select. Enhancement requires a unique ID and a label (or `aria-label`); use it for single-choice lists. Omit `data-picker` for the native menu. Without JavaScript or Popover API support, the native control remains usable.

The enhanced combobox supports repeat-click close, outside-click dismissal, disabled options, arrow keys, Home/End, typeahead, Enter/Space, Escape and Tab. Moving through options does not commit a selection until chosen. Escape/outside click cancels. User selection emits the native `input` and `change` events; programmatic value changes should emit `change` to refresh the presentation.

Keep `popoverTargetElement` linked to the trigger and prevent the native click toggle when handling it explicitly. Otherwise light dismissal can close the menu before the click handler reopens it. Test this with real pointer input, not just a direct handler call.

## Expandable content

```html
<details class="sp-fold">
  <summary>
    <span data-i18n="examples.title">Response examples</span>
    <span class="sp-fold-icon" aria-hidden="true"></span>
  </summary>
  <div class="sp-fold-body" data-ui-surface="white">…</div>
</details>
```

Use one direct `summary` and one direct `.sp-fold-body`. Keep the neutral plus/minus icon outside translated text. Panels open independently; add `open` for a default-open panel. `.sp-fold--row` provides a ruled row; add `.sp-fold--compact` for a smaller inline note. Optional `.sp-help-mark` labels help without a popover.

The title stays in place. Hover subtly changes only the trigger; click, Enter or Space expands the content. The plus retracts into a minus, with neutral fill and strokes in both states. Panel body spacing is 24px above content, 20px on mobile. Keep page styles limited to content layout rather than duplicating the shell.

Height animates for 360ms with the same easing as selection, starting from the visible height on interruption. Resizing content retargets an opening animation. Reduced motion settles immediately. Native details remains usable without enhancement.

### Lifecycle

During animated closing, `open` remains true until the animation finishes; the body becomes inert immediately. Use intent for pausing and completion for measurement:

- `sp-fold-change`: `event.detail.open` is the requested state. Stop media and simulations immediately when false.
- `sp-fold-settled`: transition completed. Re-measure visible charts here instead of using a timeout. Interrupted transitions do not report completion.
- Native `toggle`: remains available for default state, programmatic changes and unenhanced pages.

Observe the inner content for visibility. Playback requires visible, expanded content and a visible browser tab; reopening must preserve an explicit user pause. Use one animation clock even if several events can resume it. Document navigation has its own hover-open behavior and should not reuse content disclosures.

## Playback

```html
<button type="button" class="sp-control sp-media-button"
        aria-pressed="false" aria-label="Play animation" title="Play animation">
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path data-play d="M6 3.8a.8.8 0 0 1 1.2-.7l10 6.2a.8.8 0 0 1 0 1.4l-10 6.2a.8.8 0 0 1-1.2-.7Z"/>
    <path data-pause d="M5 3h3v14H5zm7 0h3v14h-3z"/>
  </svg>
</button>
```

`aria-pressed="true"` means playback is enabled and shows the pause icon. Update the accessible label and tooltip to the available action in the current language. Disable automatic animation controls when reduced motion uses a static presentation. Place the button beside the relevant legend or controls; avoid an otherwise empty toolbar. Native videos retain their own playback controls.

## Authors

```html
<div class="sp-authors">
  <div class="authors-list">
    <a class="author-tag" href="https://example.org/" aria-describedby="affiliations">
      Author name<sup>1*</sup>
    </a>
  </div>
  <div class="affiliations" id="affiliations">
    <sup>1</sup>Institution<br><span>*Equal contribution</span>
  </div>
</div>
```

Borderless soft-gray name pills wrap in a centered list. Linked names turn blue on hover and expose keyboard focus; unlinked names use `span.author-tag`. Institutions and contribution notes sit below the list. Keep verified names, links, order and contribution marks in page content. Existing lists without `.sp-authors` retain their compatibility styling.

## Verify changes

Run `npm run check` and `GITHUB_PAGES=true npm run build`. Check the previews and affected pages at desktop and mobile widths in both languages. Exercise repeat clicks, outside clicks, keyboard navigation, reduced motion, long labels, disabled options, independent/default-open panels and rapid reversal. Closed or closing content must not receive focus. Check nested backgrounds, chart resizing and media pause/resume. Keep final experimental data visible after one-shot chart animations.
