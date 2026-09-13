import styles from "./Display.module.css";

export interface DisplayProps {
  /** Human-readable value shown prominently (display or formatted result). */
  display: string;
  /** Live expression being built (secondary, not announced). */
  expression: string;
}

/**
 * Renders the calculator's primary value plus the live expression.
 * The value uses `role="status"` + `aria-live="polite"` so screen readers
 * announce each update without dumping the raw expression.
 */
export default function Display({ display, expression }: DisplayProps) {
  return (
    <section className={styles.display} aria-label="Calculator display">
      <span className={styles.expression} aria-hidden="true">
        {expression || "\u00A0"}
      </span>
      <div className={styles.value} aria-live="polite" role="status">
        {display}
      </div>
    </section>
  );
}
