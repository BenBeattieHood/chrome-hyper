export const pick = <T extends Record<string, any>, K extends (keyof T)[]>(
    obj: T,
    ...keys: K
): Pick<T, K[number]> => {
    return keys.reduce((acc, key) => {
        if (key in obj) {
            acc[key] = obj[key];
        }
        return acc;
    }, {} as Pick<T, K[number]>);
}

/**
 * Performs a deep equality check between two values
 */
export function deepEquals<T>(a: T, b: T): boolean {
    if (a === b) return true;

    if (a == null || b == null) return a === b;

    if (typeof a !== typeof b) return false;

    if (typeof a === 'object') {
        if (Array.isArray(a) !== Array.isArray(b)) return false;

        if (Array.isArray(a) && Array.isArray(b)) {
            if (a.length !== b.length) return false;
            return a.every((item, index) => deepEquals(item, b[index]));
        }

        const keysA = Object.keys(a as Record<string, unknown>);
        const keysB = Object.keys(b as Record<string, unknown>);

        if (keysA.length !== keysB.length) return false;

        return keysA.every(key =>
            deepEquals(
                (a as Record<string, unknown>)[key],
                (b as Record<string, unknown>)[key]
            )
        );
    }

    return false;
}

export const UNSAFE__keysOf = <T extends Record<keyof any, any>>(x: T): (keyof T)[] => {
    return Object.keys(x);
}

export type Loosen<T> =
    T extends string ? string :
    T extends number ? number :
    T extends boolean ? boolean :
    T extends bigint ? bigint :
    T extends Record<any, any> ? { [K in keyof T]: Loosen<T[K]> } :
    T extends Array<infer U> ? Array<Loosen<U>> : T;
