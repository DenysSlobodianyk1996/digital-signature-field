/**
 * Undo/redo over immutable snapshots of the field's ink state.
 *
 * Each entry (a stroke, a clear, ...) is recorded as the state it produced, so the
 * history does not need to know what kinds of entry exist: undo steps back to the
 * previous snapshot, redo forward to the next. Snapshots share their unchanged parts
 * (e.g. stroke objects), so keeping `limit` of them is cheap.
 *
 * The oldest snapshot is the floor: undo never goes below it. A loaded value (base
 * layer) becomes the floor of a fresh history.
 */
export class History<S> {
  #past: S[] = [];
  #present: S;
  #future: S[] = [];
  #limit: number;

  constructor(initial: S, limit: number) {
    this.#present = initial;
    this.#limit = limit;
  }

  get present(): S {
    return this.#present;
  }

  get canUndo(): boolean {
    return this.#past.length > 0;
  }

  get canRedo(): boolean {
    return this.#future.length > 0;
  }

  /** Maximum number of undoable entries. Lowering it drops the oldest entries. */
  get limit(): number {
    return this.#limit;
  }

  set limit(limit: number) {
    this.#limit = limit;
    this.#trim();
  }

  /** Records a new entry. Empties the redo stack. */
  push(next: S): void {
    this.#past.push(this.#present);
    this.#present = next;
    this.#future = [];
    this.#trim();
  }

  undo(): boolean {
    const previous = this.#past.pop();
    if (previous === undefined) return false;
    this.#future.push(this.#present);
    this.#present = previous;
    return true;
  }

  redo(): boolean {
    const next = this.#future.pop();
    if (next === undefined) return false;
    this.#past.push(this.#present);
    this.#present = next;
    return true;
  }

  #trim(): void {
    const excess = this.#past.length - Math.max(0, this.#limit);
    if (excess > 0) this.#past.splice(0, excess);
  }
}
