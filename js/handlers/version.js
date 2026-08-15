import { APP_VERSION, RELEASE_DATE, VERSION_DESCRIPTION } from '../config/version.js';

export const VERSION_CONFIG = {
    CURRENT: {
        version: APP_VERSION,
        description: VERSION_DESCRIPTION,
        releaseDate: RELEASE_DATE,
        buildNumber: new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-01'
    },
    UPDATE: {
        updateUrl: '/release-notes.json',
        autoCheckEnabled: true,
        checkInterval: 60
    }
};