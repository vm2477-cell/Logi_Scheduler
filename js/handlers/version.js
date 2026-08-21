import { APP_VERSION, RELEASE_DATE, VERSION_DESCRIPTION } from '../config/version.js';

export const VERSION_CONFIG = {
    CURRENT: {
        version: APP_VERSION,
        description: VERSION_DESCRIPTION,
        releaseDate: RELEASE_DATE,
        buildNumber: new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-01'
    },
    UPDATE: {
        updateUrl: './release-notes.json',
        autoCheckEnabled: false, // Service Worker 업데이트만 사용하므로 비활성화
        checkInterval: 60
    }
};