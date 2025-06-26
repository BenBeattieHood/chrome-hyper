import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import { defineConfig } from 'wxt';
import fs from "node:fs";
const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf-8"));

// See https://wxt.dev/api/config.html
export default defineConfig({
    modules: ['@wxt-dev/module-react'],
    manifest: {
        name: packageJson.name,
        description: packageJson.description,
        version: packageJson.version,
        permissions: [
            "bookmarks",
            "storage",
            "favicon",
            "contextMenus",
            "scripting",
            "unlimitedStorage",
            "sidePanel",
            "tabGroups",
            "activeTab",
            "tabs",
        ],
    },
    vite: () => ({
        plugins: [vanillaExtractPlugin({
            identifiers: 'debug',
        })]
    })
});
