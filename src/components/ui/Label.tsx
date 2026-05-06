import type { LabelHTMLAttributes, PropsWithChildren } from "react";

type LabelProps = PropsWithChildren<LabelHTMLAttributes<HTMLLabelElement>>;

export function Label({ className = "", children, ...props }: LabelProps) {
  const composedClassName = ["ui-label", className].filter(Boolean).join(" ");

  return (
    <label {...props} className={composedClassName}>
      {children}
    </label>
  );
}
