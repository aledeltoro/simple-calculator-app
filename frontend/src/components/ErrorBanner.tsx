import styles from "./ErrorBanner.module.css";

export interface ErrorBannerProps {
  /** The user-facing error message, or `null` when there is none. */
  message: string | null;
}

/**
 * Surfaces calculator errors to assistive tech via `role="alert"`.
 * Renders nothing when there is no active error.
 */
export default function ErrorBanner({ message }: ErrorBannerProps) {
  if (message === null) {
    return null;
  }

  return (
    <div className={styles.banner} role="alert">
      {message}
    </div>
  );
}
