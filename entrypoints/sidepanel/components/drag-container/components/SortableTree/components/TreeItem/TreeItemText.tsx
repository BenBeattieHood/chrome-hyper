import React from 'react';

import styles from './TreeItem.module.css';

export const TreeItemText: React.FC<React.PropsWithChildren<{}>> = ({
    children,
}) => {
    return (
        <>
            <span className={styles.Text}>{children}</span>
        </>
    );
};
