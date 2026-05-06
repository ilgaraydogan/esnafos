import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "default" | "secondary";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ className = "", variant = "default", ...props }: ButtonProps) {
  const variantClass = variant === "secondary" ? "ui-button-secondary" : "ui-button-default";
  return <button className={`ui-button ${variantClass} ${className}`.trim()} {...props} />;
}
