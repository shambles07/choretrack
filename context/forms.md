# Forms

## Name and PIN warn as soon as they are selected while blank

**Id:** ffb8d0b0-e662-4b87-8c52-0740defa6450
**Type:** decision
**Status:** active
**Evidence:** confirmed
**Source:** maintainer request, development conversation, 2026-11-21; form unification, commit 97145dd
**Revisit when:** the maintainer decides every field should follow one rule

The Name and PIN fields validate "eagerly": a red outline and tooltip the
moment they are selected while invalid. Every other field is "quiet": green
as soon as it is valid, red only after the field is left or a submit is
tried.

**Reason:** the maintainer asked for exactly this on Name and PIN. Quiet
validation came later, for the login form, so that a form does not open
already showing errors. When every form was moved onto one shared kit, the
explicit request was kept rather than overridden.

**Rejected alternative:** one rule for every field. It would either override
the explicit request or make every form open showing red.

## Submit buttons look disabled but stay clickable

**Id:** 08ba7d5d-6c0f-483b-8fb3-16fac8c5bd79
**Type:** decision
**Status:** active
**Evidence:** confirmed
**Source:** maintainer request for a permanently "selected" default button, development conversation, 2026-11-22; commits 4e881f6, 97145dd

Each form's submit button is always drawn as the selected default action.
While the form is incomplete it is `aria-disabled` (dimmed), not `disabled`.

**Reason:** clicking it, or pressing Return, on an incomplete form should
point at the problem: show every error and move to the first one, rather
than do nothing.

**Rejected alternative:** the native `disabled` attribute, which swallows the
click and gives no feedback.

**Consequence:** Playwright treats `aria-disabled` as not enabled, so the
tests that click such a button force the click.

## Forms use single-line fields only

**Id:** 9e8f92f0-3a8b-4ef4-b258-509229e44b94
**Type:** decision
**Status:** active
**Evidence:** confirmed
**Source:** commits 97145dd and 5eedfb6
**See:** forms.md#tab-wraps-inside-a-form-esc-is-the-way-out — 54654b3a-17c1-402a-b789-1c5a200c7963 — as of 2026-11-22

The chore "Details" and the "send back" note are single-line fields.

**Reason:** Return submits from any field. In a multi-line box Return means
"new line", which would break that rule in exactly two places.

**Rejected alternative:** multi-line boxes that submit with ⌘/Ctrl+Return.
Briefly implemented, then removed as unused once both fields became
single-line.

## Tab wraps inside a form; Esc is the way out

**Id:** 54654b3a-17c1-402a-b789-1c5a200c7963
**Type:** decision
**Status:** active
**Evidence:** confirmed
**Source:** maintainer request for Tab wrap-around, development conversation, 2026-11-22; commit 4e881f6 (`web/src/components/form-kit.tsx`)

Tab and Shift+Tab cycle through a form's controls and wrap at both ends.
Back links and the submit button are skipped, since Return submits. Esc
leaves: it closes a dialog, or goes back from the parent login.

**Reason:** the maintainer asked for the wrap-around. Wrapping with no
keyboard exit would trap keyboard users, so Esc provides the exit.

**Rejected alternative:** wrapping with no keyboard exit, a keyboard trap.

## Validation states carry an icon, not just a colour

**Id:** bd45f006-c990-4538-95cd-a152207bd818
**Type:** decision
**Status:** active
**Evidence:** confirmed
**Source:** maintainer concern that a green accent would read as "valid", development conversation, 2026-11-21; commit 42cbbed

A valid field gets a green outline and a check icon; an invalid one gets a
red outline, a warning icon and a tooltip.

**Reason:** each person's favourite colour becomes the app's accent, so a
green or red accent would otherwise look like a validation state. Colour
alone is also an accessibility failure.

**Rejected alternative:** colour-only outlines.
