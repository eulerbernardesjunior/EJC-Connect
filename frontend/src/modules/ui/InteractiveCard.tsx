import { KeyboardEvent, ReactNode } from "react";

type InteractiveCardProps = {
  className?: string;
  ariaLabel?: string;
  onActivate: () => void;
  children: ReactNode;
};

export function InteractiveCard({ className, ariaLabel, onActivate, children }: InteractiveCardProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onActivate();
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      className={className}
      onClick={onActivate}
      onKeyDown={handleKeyDown}
    >
      {children}
    </article>
  );
}

