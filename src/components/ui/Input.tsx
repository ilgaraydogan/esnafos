import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = "", ...props }: InputProps) {
  const composedClassName = ["ui-input", className].filter(Boolean).join(" ");

  return <input {...props} className={composedClassName} />;
}
