import { useCallback, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

const KEY = 'csmap.theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

function readMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  } catch {
    // 사생활 보호 모드 등에서 막힐 수 있다. 시스템 설정으로 떨어진다.
  }
  return 'system';
}

function apply(mode: ThemeMode) {
  const dark = mode === 'system' ? window.matchMedia(DARK_QUERY).matches : mode === 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(readMode);

  useEffect(() => {
    apply(mode);
    try {
      localStorage.setItem(KEY, mode);
    } catch {
      // 저장 못 해도 이번 세션 동안은 동작한다.
    }
    if (mode !== 'system') return;
    const mq = window.matchMedia(DARK_QUERY);
    const onChange = () => apply('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [mode]);

  const cycle = useCallback(() => {
    setMode((m) => (m === 'light' ? 'dark' : m === 'dark' ? 'system' : 'light'));
  }, []);

  return { mode, setMode, cycle };
}
