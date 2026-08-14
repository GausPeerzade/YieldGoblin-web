import Link from "next/link";
import type { ComponentProps } from "react";
import type { VariantProps } from "class-variance-authority";

import { Button, buttonVariants } from "@/components/ui/button";

/**
 * A link styled as a button. Base UI's Button renders a native <button> by
 * default and warns when the render prop swaps in an anchor, so `nativeButton`
 * is turned off here once rather than at every call site.
 */
export function ButtonLink({
  href,
  variant,
  size,
  className,
  children,
  target,
  rel,
  ...props
}: Omit<ComponentProps<typeof Button>, "render" | "nativeButton"> &
  VariantProps<typeof buttonVariants> & {
    href: string;
    target?: string;
    rel?: string;
  }) {
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      nativeButton={false}
      render={
        <Link href={href} target={target} rel={rel}>
          {children}
        </Link>
      }
      {...props}
    />
  );
}
