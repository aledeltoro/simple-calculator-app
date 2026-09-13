import type { ButtonToken } from "../calculator/transform";
import Button from "./Button";
import type { ButtonVariant } from "./Button";
import styles from "./Keypad.module.css";

export interface KeypadProps {
  append: (token: ButtonToken) => void;
  evaluate: () => void;
  clear: () => void;
  backspace: () => void;
  toggleSign: () => void;
  sqrt: () => void;
  percent: () => void;
}

interface Key {
  label: string;
  ariaLabel?: string;
  onPress: () => void;
  variant?: ButtonVariant;
  wide?: boolean;
}

/**
 * Keypad in a 4-column CSS grid. Layout (left→right, top→bottom):
 *   C  ⌫  √  ±
 *   %  (  )  ÷
 *   7  8  9  ×
 *   4  5  6  −
 *   1  2  3  +
 *   0(wide) .  =
 *   xʸ
 */
export default function Keypad({
  append,
  evaluate,
  clear,
  backspace,
  toggleSign,
  sqrt,
  percent,
}: KeypadProps) {
  const keys: Key[] = [
    { label: "C", ariaLabel: "clear", onPress: clear, variant: "clear" },
    { label: "⌫", ariaLabel: "backspace", onPress: backspace, variant: "function" },
    { label: "√", ariaLabel: "square root", onPress: sqrt, variant: "function" },
    { label: "±", ariaLabel: "negate", onPress: toggleSign, variant: "function" },
    { label: "%", ariaLabel: "percent", onPress: percent, variant: "function" },
    { label: "(", ariaLabel: "open parenthesis", onPress: () => append("(") },
    { label: ")", ariaLabel: "close parenthesis", onPress: () => append(")") },
    { label: "÷", ariaLabel: "divide", onPress: () => append("÷"), variant: "operator" },
    { label: "7", onPress: () => append("7") },
    { label: "8", onPress: () => append("8") },
    { label: "9", onPress: () => append("9") },
    { label: "×", ariaLabel: "multiply", onPress: () => append("×"), variant: "operator" },
    { label: "4", onPress: () => append("4") },
    { label: "5", onPress: () => append("5") },
    { label: "6", onPress: () => append("6") },
    { label: "−", ariaLabel: "subtract", onPress: () => append("−"), variant: "operator" },
    { label: "1", onPress: () => append("1") },
    { label: "2", onPress: () => append("2") },
    { label: "3", onPress: () => append("3") },
    { label: "+", ariaLabel: "add", onPress: () => append("+"), variant: "operator" },
    { label: "0", onPress: () => append("0"), wide: true },
    { label: ".", ariaLabel: "decimal point", onPress: () => append(".") },
    { label: "=", ariaLabel: "equals", onPress: evaluate, variant: "equals" },
    { label: "xʸ", ariaLabel: "exponent", onPress: () => append("xʸ"), variant: "operator" },
  ];

  return (
    <div className={styles.keypad}>
      {keys.map((key, index) => (
        <Button
          key={`${key.label}-${index}`}
          label={key.label}
          ariaLabel={key.ariaLabel ?? key.label}
          onClick={key.onPress}
          variant={key.variant ?? "default"}
          wide={key.wide ?? false}
        />
      ))}
    </div>
  );
}
