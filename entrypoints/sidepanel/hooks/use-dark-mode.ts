import type { Dispatch, SetStateAction } from 'react'
import { useLocalStorage } from './use-local-storage';
import { useMediaQuery } from './use-media-query';
import { z } from 'zod';

const modes = ['light', 'system', 'dark'] as const;

export type Theme = (typeof modes)[number];

export type UseThemeResult = {
    isDarkMode: boolean
    ternaryDarkMode: Theme
    setTernaryDarkMode: Dispatch<SetStateAction<Theme>>
    toggleTernaryDarkMode: () => void
}

const localStorageValidator = z.union([z.literal('light'), z.literal('dark'), z.literal('system')]);

export function useDarkMode(): UseThemeResult {
    const isDarkOS = useMediaQuery('all', { prefersColorScheme: 'dark' });
    const [mode, setMode] = useLocalStorage<Theme>('chrome-hyper--use-theme--mode', localStorageValidator.parse, 'system')

    const toggleTernaryDarkMode = useCallback(() => {
        setMode((prevMode): Theme => {
            const nextIndex = (modes.indexOf(prevMode) + 1) % modes.length
            return modes[nextIndex]
        })
    }, [setMode]);

    return {
        isDarkMode: mode === 'dark' || (mode === 'system' && isDarkOS),
        ternaryDarkMode: mode,
        setTernaryDarkMode: setMode,
        toggleTernaryDarkMode,
    }
}
