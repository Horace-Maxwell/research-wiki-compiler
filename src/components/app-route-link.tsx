"use client";

import {
  forwardRef,
  type ComponentProps,
  type MouseEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { isInternalAppPath, normalizeInternalAppRouteHref } from "@/lib/internal-app-route";

type AppRouteLinkProps = ComponentProps<typeof Link>;

function isPlainLeftClick(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.button === 0 &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey
  );
}

export const AppRouteLink = forwardRef<HTMLAnchorElement, AppRouteLinkProps>(function AppRouteLink(
  { href, onClickCapture, replace = false, scroll, target, ...props },
  ref,
) {
  const router = useRouter();
  const rawHref = typeof href === "string" ? href : href.toString();
  const normalizedHref = normalizeInternalAppRouteHref(rawHref);

  return (
    <Link
      ref={ref}
      href={normalizedHref}
      onClickCapture={(event) => {
        onClickCapture?.(event);

        if (
          event.defaultPrevented ||
          !isPlainLeftClick(event) ||
          target === "_blank" ||
          !isInternalAppPath(new URL(normalizedHref, "http://codex.local").pathname)
        ) {
          return;
        }

        event.preventDefault();

        if (replace) {
          router.replace(normalizedHref, { scroll });
          return;
        }

        router.push(normalizedHref, { scroll });
      }}
      replace={replace}
      scroll={scroll}
      target={target}
      {...props}
    />
  );
});
