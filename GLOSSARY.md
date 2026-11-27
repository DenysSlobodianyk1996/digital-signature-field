# Digital Signature Field

A reusable field that captures a hand-drawn signature and hands it to a form as a value, usable from Angular, React, Vue and plain HTML.

## The field

**Signature field**:
The whole reusable component: a drawing area plus an optional actions bar, acting as one form field.
_Avoid_: Signature pad (as the product name), canvas, widget

**Drawing area**:
The surface inside the signature field where ink is captured. Nothing else (buttons, labels) is ever placed on it.
_Avoid_: Canvas, board, pad

**Actions bar**:
The strip outside the drawing area, but inside the signature field, that holds the built-in actions.
_Avoid_: Toolbar (reserved for the external toolbar), controls

**External toolbar**:
Buttons that live in the host application, outside the signature field, and drive it through its public methods and events.
_Avoid_: Custom actions bar

**Headless mode**:
A signature field shown with no actions bar, so that all actions come from an external toolbar.

## Ink

**Stroke**:
One continuous line of ink from pen-down to pen-up.
_Avoid_: Line, path, polyline

**Tap**:
A pen-down/pen-up that is too short to count as a stroke. It is discarded and never becomes ink.
_Avoid_: Dot, click

**Ink**:
All strokes currently visible in the drawing area, including the base layer.

**Base layer**:
A signature loaded from outside (the initial or a written value). It shows as ink, but it cannot be undone stroke by stroke.
_Avoid_: Background image, initial strokes

**Empty**:
The state where the drawing area shows no ink at all. An empty signature field has the value `null`.
_Avoid_: Blank, cleared (clearing is an action, empty is a state)

**Pen**:
The colour, width and pressure settings used to draw new strokes.

## Actions

**Action**:
A command the signature field can perform: undo, redo or clear (plus the pen options: colour and width).
_Avoid_: Button (a button only triggers an action)

**Built-in action**:
An action rendered by the signature field itself in its actions bar.

**Undo**:
Steps back one history entry: removes the last stroke, or reverts the last clear.

**Redo**:
Re-applies the history entry most recently undone.

**Clear**:
Removes all ink, base layer included, as one undoable history entry.
_Avoid_: Reset (reset means returning a form to its initial value)

**History**:
The ordered list of undoable entries (strokes and clears) made since the last value was loaded.

## Value

**Value**:
What the signature field hands to its form: a serialized signature in the configured value format, or `null` when empty.

**Value format**:
How the value is serialized: `svg` (SVG data URL), `png` (PNG data URL) or `json` (signature data).

**Signature data**:
A lossless description of the ink as strokes of points, together with the drawing area size it was drawn at.
_Avoid_: Points JSON, raw data

**Background**:
The colour painted behind the ink in an exported value (`#fff` by default, or `transparent`).

## Integration

**Wrapper**:
A framework-specific package that adapts the signature field to that framework's forms.

**CVA mode**:
The opt-in way to connect the Angular wrapper to Angular 17–21 forms, enabled by the `dsfCva` attribute.
_Avoid_: Legacy mode

**Demo app**:
A small, deployed application that shows the signature field in one framework.
_Avoid_: Example project, playground
