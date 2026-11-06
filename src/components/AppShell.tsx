import { useEffect, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { BookOpen, Compass, House, UserRound } from "lucide-react";
import { resolveAppUrl } from "@/lib/assets";
import { useTheme } from "@/components/ThemeProvider";

export function Star({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M24 2 31 17 46 24 31 31 24 46 17 31 2 24 17 17Z"
        fill="currentColor"
      />
      <path
        d="M24 8v32M8 24h32"
        stroke="white"
        strokeWidth="1.5"
        opacity=".7"
      />
      <path d="m24 10 5 14-5 14-5-14Z" fill="white" opacity=".3" />
    </svg>
  );
}

export default function AppShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { theme } = useTheme();
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div
      className={`app-shell ${className}`}
      style={{ "--scene": `url(${resolveAppUrl(theme.assets.background)})` } as React.CSSProperties}
    >
      <a className="skip-link" href="#main-content">
        跳到内容
      </a>
      {children}
      <nav className="bottom-nav" aria-label="主导航">
        {[
          { to: "/", label: "首页", Icon: House },
          { to: "/library", label: "词书", Icon: Compass },
          { to: "/review", label: "复习", Icon: BookOpen },
          { to: "/progress", label: "我的", Icon: UserRound },
        ].map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              `nav-item ${isActive ? "is-active" : ""}`
            }
          >
            <Icon size={24} strokeWidth={1.7} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function PageHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <span className="eyebrow">{eyebrow}</span>
      <div className="heading-line">
        <h1>{title}</h1>
        {children}
      </div>
    </header>
  );
}
