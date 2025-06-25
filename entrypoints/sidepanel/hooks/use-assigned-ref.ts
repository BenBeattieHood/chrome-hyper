import { useRef } from 'react';

export const useAssignedRef = <T>(t: T) => {
    const result = useRef(t);
    result.current = t;
    return result;
};
