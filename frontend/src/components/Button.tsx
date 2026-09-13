import styles from "./Button.module.css";

/** Visual/functional styling variants for a keypad key. */
export type ButtonVariant = "default" | "operator" | "function" | "equals" | "clear";

export interface ButtonProps {
  /** Visible label (e.g. `7`, `×`, `=`, `C`). */
  label: string;
  /** Accessible name — descriptive for symbolic operators (e.g. `multiply`). */
  ariaLabel: string;
  onClick: () => void;
  /** Styling variant. */
  variant?: ButtonVariant;
  /** Span two grid columns (used by `0`). */
  wide?: boolean;
}

/**
 * A presentational keypad button. Purely visual + a11y; no calculator logic.
 * Touch target ≥ 44px is enforced in `Button.module.css`.
 */
export default function Button({
  label,
  ariaLabel,
  onClick,
  variant = "default",
  wide = false,
}: ButtonProps) {
  const className = [styles.button, styles[variant] ?? "", wide ? styles.wide : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <button type="button" className={className} aria-label={ariaLabel} onClick={onClick}>
      {label}
    </button>
  );
}
