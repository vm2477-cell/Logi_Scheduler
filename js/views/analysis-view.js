import { App } from '../app.js';

export class AnalysisView {
    static render() {
        // 버전 정보를 가져와 캐시를 무효화합니다. (v7.3.62)
        const version = App.state.appVersion || '1.0.0';
        return `
            <div class="h-[calc(100vh-150px)] bg-gray-100 dark:bg-gray-900">
                <iframe src="/Camera202.html?v=${version}" class="w-full h-full border-0" title="파일 분석"></iframe>
            </div>
        `;
    }
}