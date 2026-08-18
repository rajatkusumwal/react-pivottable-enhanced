/**
 * Tunable numbers used across react-pivottable-enhanced.
 *
 * They live in one file so a junior developer can find and change a limit
 * without hunting through components. Anything that is a "magic number" in the
 * UI or the engines belongs here, with a comment saying why the value was
 * picked.
 */

/** Height of one grid body row, in pixels. Used by the row windowing maths. */
export const ROW_HEIGHT = 28;

/** Row windowing kicks in above this many rows (below it, plain rendering is faster). */
export const WINDOW_THRESHOLD = 150;

/** Extra rows rendered above and below the viewport so fast scrolling stays smooth. */
export const OVERSCAN = 12;

/** Rows sampled when guessing a field's type from uploaded data. */
export const TYPE_INFERENCE_SAMPLE_SIZE = 50;

/** Members listed in the checkbox filter popover (keeps the DOM small). */
export const MEMBER_LIST_LIMIT = 500;

/** Members listed in the advanced filter editor's multi-select. */
export const MEMBER_OPTION_LIMIT = 200;

/** Members a backend `/members` call returns by default. */
export const MEMBER_PAGE_SIZE = 200;

/** Records fetched for a drill-through cell unless the report overrides it. */
export const DEFAULT_DRILL_THROUGH_ROWS = 1000;

/** Rough in-browser cost of one record kept as a JS object, in bytes. */
export const ESTIMATED_BYTES_PER_ROW = 400;

/** sessionStorage key holding the dataset the user uploaded in this tab. */
export const SESSION_DATASET_KEY = "react-pivottable-enhanced:dataset";

/** Largest serialised dataset we cache in sessionStorage (~8 MB of JSON). */
export const SESSION_DATASET_MAX_CHARS = 8_000_000;
