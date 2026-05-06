import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ButtonVariant = "primary" | "secondary";

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
  }
>;

export function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  const variantClassName = variant === "secondary" ? "secondary" : "";
  const composedClassName = ["ui-button", variantClassName, className].filter(Boolean).join(" ");

  return (
    <button {...props} className={composedClassName}>
      {children}
    </button>
  );
}
