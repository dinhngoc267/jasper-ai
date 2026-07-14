/**
 * Shared Tailwind class strings for form-ish controls, so visual treatment
 * stays consistent everywhere a plain HTML `<input>`/`<select>` is used
 * instead of a shadcn component.
 */

/** Base look for text inputs, textareas, and selects. */
export const fieldClass =
  "w-full rounded-lg border border-[var(--rule)] bg-[var(--paper)] px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--blue)] focus:ring-2 focus:ring-[var(--blue-soft)]";

/**
 * Native `<select>` styled to match `fieldClass`, with the browser's default
 * arrow replaced by a custom SVG chevron (appearance-none hides the native
 * one, which otherwise looks inconsistent across browsers/OSes).
 */
export const selectClass =
  `${fieldClass} appearance-none bg-no-repeat bg-[position:right_1rem_center] bg-[length:0.875rem] pr-10 ` +
  `bg-[image:url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')]`;
