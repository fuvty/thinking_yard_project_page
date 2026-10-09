# Motion and interaction

[Guide index](README.md)

## Three purposes

| Purpose | Treatment |
| --- | --- |
| UI feedback | Fast, restrained transitions that confirm hover, press, selection or expansion |
| Hero atmosphere | An abstract mechanism behind readable foreground content |
| Research explanation | A legible sequence with labels, controls and a clear relationship to the underlying data |

Treat these separately. An abstract background does not need a tutorial, and a measured chart must not borrow arbitrary timings or positions from a decorative animation.

## Shared UI motion

Reuse [shared/ui/styles.css](../../shared/ui/styles.css) and [shared/navigation/styles.css](../../shared/navigation/styles.css). Current controls use short color transitions around 180ms and movement around 240–300ms. Primary pills scale to 1.02 on hover and shared buttons to .98 on press; secondary pills fill blue. Linked author tags turn blue with white text.

A content reveal can use opacity 0→1 and translateY 40px→0 over about .8s. Interactive cards may lift about 4px with a soft shadow; static figures do not need to pretend to be clickable. Keep bouncy motion out of page transitions. The existing navigation-logo microinteraction is a small, isolated exception.

## Hero animation

Start with one visual idea grounded in the paper: communication, route selection, repeated computation or token reduction. Use low-contrast paths, particles or fields, with the title and resource controls visually dominant. Different projects can use different geometry while sharing the same restraint.

- Compose activity across the viewport. Important transitions should sometimes occur outside the text area. Do not force a rigid empty rectangle around the title or decorate every corner equally.
- Use smooth nonlinear timing. For travel, ease into and out of motion; avoid abrupt joins between hand-written speed phases. Initialization can accelerate throughout when that better expresses growth. Choose duration for the specific interaction rather than imposing one duration on every hero.
- Keep spatial and causal continuity: a signal reaches its destination before the associated state changes; an object follows its visible path; deletion and reconnection happen coherently.
- Respond promptly when clicking the background is supported. Repeated clicks must each be admitted; independent journeys can overlap. Reduce rendering detail or queue arrivals when necessary rather than silently ignoring input.
- Ignore button/link interaction, drags, scrolling, text-selection drags and cancelled pointer gestures. A stationary double click must not permanently disable feedback.
- Pause work while off-screen or in a hidden tab. Preserve a coherent static state for reduced motion. Where a pause control exists, respect it during subsequent clicks.
- Keep animation initialization from changing scroll position. An unfragmented first visit starts at the top; explicit deep links retain their destination.

The [hub implementation](../../hub/ScalingPaths.tsx) contains the asymmetric `cubic-bezier(.42,0,.12,1)` motion used as a reference for smooth travel. Reuse an existing helper when practical; this curve is a reference, not a requirement for all transitions.

## Explanatory figures

Keep the sequence easy to follow. Playback, pause, replay and scrubbing should agree about the current state. Scrubbing must not unexpectedly resume playback. Reduced-motion mode should show an understandable completed/static figure and permit deliberate manual exploration.

Keep numeric interpolation honest. Do not animate a value through nonexistent measurements without making the interpolation clear. Preserve available/unavailable states and label units. Prefer an accessible table or textual description alongside canvas/SVG charts.

## What to verify

Watch a complete lifecycle, then interact: repeated clicks, click during travel, pause/resume, a scroll away and back, resize and reduced motion. Inspect the result on a real mobile-width layout. Check that the background cannot intercept links, trap scroll, hide the primary claim or continue scheduling expensive frames while invisible.
