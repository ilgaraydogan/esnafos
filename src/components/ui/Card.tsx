import type { HTMLAttributes, PropsWithChildren } from "react";

type CardProps = PropsWithChildren<HTMLAttributes<HTMLElement>>;

export function Card({ className = "", children, ...props }: CardProps) {
  const composedClassName = ["ui-card", className].filter(Boolean).join(" ");

  return (
    <section {...props} className={composedClassName}>
      {children}
    </section>
  );
}
