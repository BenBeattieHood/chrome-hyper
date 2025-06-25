import { useState, useMemo, useLayoutEffect } from 'react';
import { MediaType, MediaQuery, createMediaQuery } from '../utils/create-media-query';

export const useMediaQuery = (t: MediaType, params?: MediaQuery): boolean => {

    const matchMedia = useMemo(
        () => {
            const query = params ? createMediaQuery(t, params) : createMediaQuery(t);
            return window.matchMedia(query);
        },
        [t, JSON.stringify(params)],
    );

    const [matches, setMatches] = useState<boolean>(matchMedia.matches);

    useLayoutEffect(() => {
        const handleChange = () => {
            setMatches(matchMedia.matches);
        };

        handleChange();
        matchMedia.addEventListener('change', handleChange);

        return () => {
            matchMedia.removeEventListener('change', handleChange);
        };
    }, [matchMedia]);

    return matches;
};
