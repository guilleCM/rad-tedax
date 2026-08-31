import type { ButtonHTMLAttributes, InputHTMLAttributes } from "react";

export function Button({
  className = "",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  const styles =
    variant === "primary"
      ? "bg-primary text-primary-foreground hover:opacity-90"
      : variant === "danger"
        ? "bg-red-600 text-white hover:bg-red-500"
        : "border border-border bg-card text-foreground hover:bg-surface";

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50 ${styles} ${className}`}
      {...props}
    />
  );
}

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none ring-ring focus:ring-2 ${className}`}
      {...props}
    />
  );
}

export function Label({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-foreground">
      {children}
    </label>
  );
}
