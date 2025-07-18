import React, { forwardRef } from 'react';
import classNames from 'clsx';

import styles from './Container.module.css';

export interface Props {
    children: React.ReactNode;
    columns: number;
    horizontal?: boolean;
    scrollable?: boolean;
    shadow?: boolean;
}

export const Container = forwardRef<HTMLDivElement, Props>(
    ({ children, columns, horizontal, scrollable, shadow }: Props, ref) => {
        return (
            <div
                ref={ref}
                style={
                    {
                        '--columns': columns,
                    } as React.CSSProperties
                }
                className={classNames(
                    styles.Container,
                    horizontal && styles.horizontal,
                    scrollable && styles.scrollable,
                    shadow && styles.shadow,
                )}
            >
                <ul>{children}</ul>
            </div>
        );
    },
);
