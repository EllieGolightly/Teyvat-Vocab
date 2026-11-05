import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import { AppContainer, ErrorRender, logger } from "@lark-apaas/client-toolkit-lite";
import App from "./app";
import { ASSETS, resolveAppUrl } from "@/lib/assets";
import "./index.css";

// 运行时设置 favicon（覆盖平台默认 appAvatar，确保派蒙图标生效）
function setFavicon() {
  const link = document.querySelector('link[rel="icon"]');
  if (link) {
    link.setAttribute('href', ASSETS.favicon);
    link.setAttribute('type', 'image/png');
  } else {
    const newLink = document.createElement('link');
    newLink.rel = 'icon';
    newLink.type = 'image/png';
    newLink.href = ASSETS.favicon;
    document.head.appendChild(newLink);
  }
}

// 注册 Service Worker（仅在支持且生产环境时）
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    logger.info('SW: browser does not support Service Worker');
    return;
  }
  // dev 环境不注册，避免缓存干扰开发
  if (import.meta.env.DEV) {
    logger.info('SW: skipped in dev mode');
    return;
  }

  const swUrl = resolveAppUrl('sw.js');

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(swUrl, { scope: resolveAppUrl('./') })
      .then((registration) => {
        logger.info('SW: registered, scope:', registration.scope);

        // 检测到新版本时提示（通过 updatefound）
        registration.addEventListener('updatefound', () => {
          logger.info('SW: new version found, installing...');
          const installing = registration.installing;
          if (installing) {
            installing.addEventListener('statechange', () => {
              if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                // 已有旧版本在运行，新版本待激活
                logger.info('SW: new version installed, waiting to activate');
              }
            });
          }
        });
      })
      .catch((err) => {
        logger.error('SW: registration failed:', String(err));
      });
  });
}

function AppEntry() {
  useEffect(() => {
    setFavicon();
    registerServiceWorker();
  }, []);

  return (
    <StrictMode>
      <BrowserRouter basename={import.meta.env.BASE_URL || "/"}>
        <AppContainer>
          <ErrorBoundary
            fallbackRender={({ error, resetErrorBoundary }) => (
              <ErrorRender error={error} resetErrorBoundary={resetErrorBoundary} />
            )}
          >
            <App />
          </ErrorBoundary>
        </AppContainer>
      </BrowserRouter>
    </StrictMode>
  );
}

createRoot(document.getElementById("root")!).render(<AppEntry />);
