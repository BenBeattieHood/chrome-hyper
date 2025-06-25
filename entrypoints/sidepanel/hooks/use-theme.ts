import { useDarkMode } from './use-dark-mode';
import { Loosen } from '../utils/framework';

const systemDarkColors = {
    page: {
        background: '#2b2b2b',
        text: '#b4b4b4'
    },
    input: {
        background: '#edf2fa',
        text: '#474747'
    },
    selected: {
        background: '#6b6b6b',
        text: '#c7c7c7'
    },
    hover: {
        background: '#4a4a4a',
        text: '#c7c7c7'
    },
    focused: {
        background: '#3c3c3c',
        text: '#fff',
        outline: '#a8c7fa'
    },
    active: {
        background: '#3c3c3c',
        text: '#fff'
    }
} satisfies Record<string, {
    background: string;
    text: string;
    outline?: string;
}>

const systemLightColors = {
    page: {
        background: '#f5f7f8',
        text: '#474747'
    },
    input: {
        background: '#edf2fa',
        text: '#474747'
    },
    selected: {
        background: '#e0e0e0',
        text: '#474747'
    },
    hover: {
        background: '#f2f2f2',
        text: '#474747'
    },
    focused: {
        background: '#fff',
        text: '#474747',
        outline: '#0b57d0'
    },
    active: {
        background: '#fff',
        text: '#000000'
    }
} satisfies Loosen<typeof systemDarkColors>;

// const createTheme = <Color extends MaterialColor>(color: Color, mode: 'light' | 'dark'): {
//     page: ColorSpec;
//     selected: ColorSpec;
//     focused: ColorSpec;
//     mode: 'light' | 'dark';
//     titleText: string;
//     titleColor: string;
// } => {
//     const { titleText, titleColor, colors } = materialColors[color];
//     return {
//         titleText,
//         titleColor,
//         mode,
//         page: mode === 'dark' ? colors.at(-1)! : colors.at(0)!,
//         selected: mode === 'dark' ? colors.at(-3)! : colors.at(2)!,
//         focused: mode === 'dark' ? colors.at(-5)! : colors.at(4)!,
//     };
// }

export const useTheme = () => {
    const { isDarkMode } = useDarkMode();
    return isDarkMode ? systemDarkColors : systemLightColors;//useMemo(() => createTheme(color, isDarkMode ? 'dark' : 'light'), [color, isDarkMode]);
}
