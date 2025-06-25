// see https://github.com/yocontra/react-responsive/blob/master/src/mediaQuery.ts#L9

import { UNSAFE__keysOf } from "./framework";

// and https://www.w3.org/TR/mediaqueries-4/
export type MediaType =
    | 'all'
    | 'aural'
    | 'braille'
    | 'embossed'
    | 'handheld'
    | 'print'
    | 'projection'
    | 'screen'
    | 'speech'
    | 'tty'
    | 'tv';

export interface MediaQuery {
    prefersColorScheme?: 'light' | 'dark';

    anyPointer?:
    | 'course'
    | 'fine'
    | 'none'
    pointer?:
    | 'course'
    | 'fine'
    | 'none'
    anyHover?:
    | 'hover'
    | 'none'
    hover?:
    | 'hover'
    | 'none'

    orientation?:
    | 'landscape'
    | 'portrait'

    grid?: boolean

    height?: string | number
    minHeight?: string | number
    maxHeight?: string | number
    deviceHeight?: string | number
    minDeviceHeight?: string | number
    maxDeviceHeight?: string | number

    width?: string | number
    minWidth?: string | number
    maxWidth?: string | number
    deviceWidth?: string | number
    minDeviceWidth?: string | number
    maxDeviceWidth?: string | number

    aspectRatio?: string
    minAspectRatio?: string
    maxAspectRatio?: string
    deviceAspectRatio?: string
    minDeviceAspectRatio?: string
    maxDeviceAspectRatio?: string

    color?: boolean
    minColor?: number
    maxColor?: number

    colorIndex?: boolean
    minColorIndex?: number
    maxColorIndex?: number

    monochrome?: boolean
    minMonochrome?: number
    maxMonochrome?: number

    resolution?: string | number
    minResolution?: string | number
    maxResolution?: string | number

    scan?:
    | 'interlace'
    | 'progressive'
}

const mediaQueryKeyValueToString = (k: string, v: string | number | boolean): string => {
    // Refactored from https://github.com/yocontra/react-responsive/blob/master/src/toQuery.ts

    const realKey = k.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`);

    if (v === true) {
        return realKey;
    }
    if (v === false) {
        return `not ${realKey}`;
    }

    const realV: string =
        (typeof v === 'number')
            ? `${v}px` // px shorthand
            : v;

    return `(${realKey}: ${realV})`;
};

export function createMediaQuery<const MT extends MediaType, const MQ extends MediaQuery | undefined = undefined>(t: MT, params?: MQ): string {
    if (params === undefined) {
        return t as any;
    }

    const renderedMediaQuery =
        UNSAFE__keysOf(params)
            .filter(key => typeof key === 'string' && ![
                'all',
                'print',
                'screen',
                'tty',
                'tv',
                'projection',
                'handheld',
                'braille',
                'embossed',
                'aural',
                'speech',
            ].includes(key))
            .reduce<string[]>(
                (result, key) => {
                    if (typeof key === 'string') {
                        const v = (params as any)[key];
                        switch (typeof v) {
                            case 'boolean':
                            case 'number':
                            case 'string':
                                result.push(mediaQueryKeyValueToString(key, v));
                                break;
                        }
                    }
                    return result;
                },
                [],
            )
            .join(' and ');

    return `${t} and (${renderedMediaQuery})` as any;
}
