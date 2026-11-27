# Actions live outside the drawing area and can be driven three ways

Nothing is ever drawn over the drawing area: built-in buttons go in an actions bar next to it. The actions are undo, redo and clear, plus optional pen colour and pen width. They can be driven three ways, which can be combined:

1. **Built-in actions.** Turned on per action with `actions="undo clear"`. The default is `undo clear`, placed by `actions-position="bottom|top|start|end|none"`, with `bottom` as the default.
2. **Slots.** `slot="actions-start"` and `slot="actions-end"` add buttons to the bar. `slot="actions"` replaces the bar's content.
3. **External toolbar.** The methods `undo()`, `redo()` and `clear()` plus the `dsf-history-change` event (`canUndo`, `canRedo`, `empty`) let any app build its own controls. `actions="none"` is headless mode.

Built-in buttons have inline SVG icons, labels that can be changed through the `labels` property, and `aria-label`s. They follow `dir` (RTL) and are disabled when the action is unavailable or the field is disabled or readonly. Keyboard shortcuts: Ctrl/Cmd+Z undoes; Ctrl/Cmd+Shift+Z and Ctrl/Cmd+Y redo. Both work while focus is inside the field.
