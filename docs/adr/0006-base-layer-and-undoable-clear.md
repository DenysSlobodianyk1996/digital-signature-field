# A loaded value becomes a base layer; clear is undoable and can bring it back

When a value is loaded (initial form value, form reset, programmatic write), the field shows it as the **base layer** and starts with an empty history, so a loaded signature cannot be undone stroke by stroke. **Clear** removes all ink, base layer included, as one history entry, so the user can draw from scratch and then undo the clear to get the original signature back. Undo never goes past the base layer. History is capped at 50 entries (`history-limit`).

## Consequences

- Loading a value never emits `change`, and never marks the form as changed or touched.
- Writing a value equal to the current value does nothing: the history is kept. Controlled usage (React state, Vue `:value`, Angular `model()`) writes back the value the field just emitted, and without this rule every write-back would wipe the history.
- Strokes, undo, redo and clear always emit `change` with the new value. Clear makes the value `null`; undoing a clear makes it non-null again.
