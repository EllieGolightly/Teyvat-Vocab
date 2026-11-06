import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { resolveAppUrl } from "@/lib/assets";
import { getPrefs, updatePrefs } from "@/lib/prefs";
import { getTheme, type Theme, type ThemeId } from "@/lib/themes";

interface ThemeContextValue {
  theme: Theme;
  changingThemeId: ThemeId | null;
  setTheme: (id: ThemeId) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const IMAGE_TIMEOUT_MS = 20_000;

function preloadImage(src: string, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    let finished = false;
    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      image.onload = null;
      image.onerror = null;
      if (error) {
        image.src = "";
        reject(error);
      } else {
        resolve();
      }
    };
    const onAbort = () => finish(new DOMException("Cancelled", "AbortError"));
    const timer = window.setTimeout(
      () => finish(new Error("Theme image timed out")),
      IMAGE_TIMEOUT_MS,
    );

    image.decoding = "async";
    image.onload = () => {
      if (typeof image.decode === "function") {
        void image.decode().then(
          () => finish(),
          () => finish(new Error("Theme image could not be decoded")),
        );
      } else {
        finish();
      }
    };
    image.onerror = () => finish(new Error("Theme image could not be loaded"));
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) {
      onAbort();
    } else {
      image.src = src;
    }
  });
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, updateTheme] = useState(() => getTheme(getPrefs().themeId));
  const [changingThemeId, updateChangingThemeId] = useState<ThemeId | null>(null);
  const activeTheme = useRef(theme);
  const requestNumber = useRef(0);
  const loadingImages = useRef<AbortController | null>(null);

  useEffect(() => () => {
    requestNumber.current += 1;
    loadingImages.current?.abort();
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme.id;
    const tokens = {
      "--theme-sky": theme.palette.sky,
      "--theme-primary": theme.palette.primary,
      "--theme-primary-deep": theme.palette.primaryDeep,
      "--theme-ink": theme.palette.ink,
      "--theme-muted": theme.palette.muted,
      "--theme-paper": theme.palette.paper,
      "--theme-wash": theme.palette.wash,
      "--theme-gold": theme.palette.gold,
    };
    for (const [name, value] of Object.entries(tokens)) {
      root.style.setProperty(name, value);
    }
    root.style.backgroundColor = theme.palette.sky;
    document.body.style.backgroundColor = theme.palette.sky;
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme.palette.sky);
  }, [theme]);

  const setTheme = useCallback(async (id: ThemeId) => {
    const next = getTheme(id);
    const request = ++requestNumber.current;
    loadingImages.current?.abort();
    loadingImages.current = null;

    // Choosing the current theme also cancels another in-flight choice.
    if (next.id === activeTheme.current.id) {
      updateChangingThemeId(null);
      return;
    }

    const controller = new AbortController();
    loadingImages.current = controller;
    updateChangingThemeId(next.id);
    try {
      try {
        await Promise.all(
          [...new Set(Object.values(next.assets))].map((path) =>
            preloadImage(resolveAppUrl(path), controller.signal),
          ),
        );
      } catch {
        if (request !== requestNumber.current) return;
        throw new Error("这套风景暂时没加载好，请联网后再试一次。");
      }

      if (request !== requestNumber.current) return;
      // Persist before publishing the theme: quota/privacy failures must leave
      // both the visible theme and the saved preference unchanged.
      updatePrefs({ themeId: next.id });
      activeTheme.current = next;
      updateTheme(next);
    } finally {
      controller.abort();
      if (request === requestNumber.current) {
        loadingImages.current = null;
        updateChangingThemeId(null);
      }
    }
  }, []);

  const value = useMemo(
    () => ({ theme, changingThemeId, setTheme }),
    [theme, changingThemeId, setTheme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
