import { useCalculator } from "../hooks/useCalculator";
import { toDisplay } from "../calculator/display";
import Display from "./Display";
import ErrorBanner from "./ErrorBanner";
import Keypad from "./Keypad";
import styles from "./App.module.css";

/**
 * Top-level component. Owns the calculator state via `useCalculator` and lays
 * out the display, error surface, and keypad.
 */
export default function App() {
  const { state, append, evaluate, clear, backspace, toggleSign, sqrt, percent } =
    useCalculator();

  return (
    <main className={styles.app}>
      <h1 className={styles.title}>Simple Calculator</h1>
      <Display display={state.display} expression={toDisplay(state.expression)} />
      <ErrorBanner message={state.status === "error" ? state.error : null} />
      <Keypad
        append={append}
        evaluate={evaluate}
        clear={clear}
        backspace={backspace}
        toggleSign={toggleSign}
        sqrt={sqrt}
        percent={percent}
      />
    </main>
  );
}
