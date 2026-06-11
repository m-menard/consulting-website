import { Link as WouterLink } from "wouter";
import type { CSSProperties, MouseEventHandler, ReactNode } from "react";

interface AppLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export default function AppLink({ href, children, className, style, onClick }: AppLinkProps) {
  const isExternal = /^([a-z]+:)?\/\//i.test(href) || href.startsWith("mailto:");

  if (isExternal) {
    return (
      <a href={href} className={className} style={style} onClick={onClick}>
        {children}
      </a>
    );
  }

  if (href.startsWith("#")) {
    return (
      <a href={href} className={className} style={style} onClick={onClick}>
        {children}
      </a>
    );
  }

  return (
    <WouterLink href={href} className={className} style={style} onClick={onClick}>
      {children}
    </WouterLink>
  );
}
