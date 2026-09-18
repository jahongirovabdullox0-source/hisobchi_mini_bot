export const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;

const safe = (fn) => {
  try {
    return fn();
  } catch {
    return undefined;
  }
};

export const isTelegram = () => Boolean(tg && tg.initData);

const atLeast = (v) => Boolean(tg && tg.isVersionAtLeast && safe(() => tg.isVersionAtLeast(v)));

export function initTelegram() {
  if (!tg) return;
  safe(() => tg.ready());
  safe(() => tg.expand());
  if (atLeast('6.1')) {
    safe(() => tg.setHeaderColor('#ffffff'));
    safe(() => tg.setBackgroundColor('#ffffff'));
  }
  if (atLeast('7.10')) safe(() => tg.setBottomBarColor('#ffffff'));
  if (atLeast('7.7')) safe(() => tg.disableVerticalSwipes());
}

export const telegramUser = () => tg?.initDataUnsafe?.user || null;

export const haptic = {
  light: () => atLeast('6.1') && safe(() => tg.HapticFeedback.impactOccurred('light')),
  medium: () => atLeast('6.1') && safe(() => tg.HapticFeedback.impactOccurred('medium')),
  select: () => atLeast('6.1') && safe(() => tg.HapticFeedback.selectionChanged()),
  success: () => atLeast('6.1') && safe(() => tg.HapticFeedback.notificationOccurred('success')),
  error: () => atLeast('6.1') && safe(() => tg.HapticFeedback.notificationOccurred('error')),
  warning: () => atLeast('6.1') && safe(() => tg.HapticFeedback.notificationOccurred('warning')),
};

/** Telegram tasdiqlash oynasi (brauzerda — oddiy confirm) */
export function confirmDialog(message) {
  return new Promise((resolve) => {
    if (atLeast('6.2')) {
      const ok = safe(() => {
        tg.showConfirm(message, (res) => resolve(Boolean(res)));
        return true;
      });
      if (ok) return;
    }
    resolve(window.confirm(message));
  });
}

/** Telegram "Orqaga" tugmasi */
export const backButton = {
  show(handler) {
    if (!atLeast('6.1')) return;
    safe(() => {
      tg.BackButton.onClick(handler);
      tg.BackButton.show();
    });
  },
  hide(handler) {
    if (!atLeast('6.1')) return;
    safe(() => {
      tg.BackButton.offClick(handler);
      tg.BackButton.hide();
    });
  },
};

export function openTelegramLink(url) {
  if (tg && tg.openTelegramLink) safe(() => tg.openTelegramLink(url));
  else window.open(url, '_blank');
}

export function closeApp() {
  if (tg) safe(() => tg.close());
}
