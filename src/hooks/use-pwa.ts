import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/platform';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/**
 * PWA 安装能力 hook
 * - 仅在支持 beforeinstallprompt 的浏览器中可用
 * - iOS Safari 不支持此事件，需要手动提示"添加到主屏幕"方法
 */
export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOSSafari, setIsIOSSafari] = useState(false);

  useEffect(() => {
    // 检查是否已安装（display-mode: standalone）
    if (window.matchMedia?.('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // 检查是否 iOS Safari
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isSafari = /safari/.test(ua) && !/chrome|crios|fxios|edgios/.test(ua);
    if (isIOS && isSafari) {
      setIsIOSSafari(true);
      return;
    }

    // 监听安装提示事件
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      logger.info('PWA: install prompt available');
    };

    window.addEventListener('beforeinstallprompt', handler);

    // 已安装回调
    const installedHandler = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      logger.info('PWA: installed');
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const canInstall = installPrompt !== null;

  const promptInstall = useCallback(async () => {
    if (!installPrompt) return false;
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        logger.info('PWA: user accepted install');
      }
      // 无论用户接受还是拒绝，prompt 只能用一次
      setInstallPrompt(null);
      return choice.outcome === 'accepted';
    } catch (err) {
      logger.error('PWA: install prompt error:', String(err));
      return false;
    }
  }, [installPrompt]);

  return {
    canInstall,       // 浏览器可直接触发安装弹窗
    isInstalled,      // 已在独立窗口运行
    isIOSSafari,      // iOS Safari（需手动分享→添加到主屏幕）
    promptInstall,    // 触发安装弹窗
  };
}

/**
 * Service Worker 状态 hook
 */
export function useServiceWorkerStatus() {
  const [swStatus, setSwStatus] = useState<'unsupported' | 'registering' | 'active' | 'error' | 'dev-mode'>('registering');
  const [offlineReady, setOfflineReady] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      setSwStatus('unsupported');
      return;
    }

    if (import.meta.env.DEV) {
      setSwStatus('dev-mode');
      return;
    }

    let active = false;
    const markActive = () => {
      active = true;
      window.clearTimeout(timeoutId);
      setSwStatus('active');
      setOfflineReady(true);
    };
    const timeoutId = window.setTimeout(() => {
      if (!active) setSwStatus('error');
    }, 60000);

    // ready 只有在注册成功并激活后才会 resolve；超时用于避免无限等待。
    navigator.serviceWorker.ready
      .then((reg) => {
        if (reg.active) markActive();
      })
      .catch(() => {
        window.clearTimeout(timeoutId);
        setSwStatus('error');
      });

    // 监听 controllerchange（SW 接管）
    const onControllerChange = () => {
      markActive();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    return () => {
      window.clearTimeout(timeoutId);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  return { swStatus, offlineReady };
}
