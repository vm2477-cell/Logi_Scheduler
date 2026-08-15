import { VERSION_CONFIG } from '../handlers/version.js'; // 실제 위치인 js/handlers/version.js로 경로 수정

// 버전 관리 시스템
export class VersionManager {
    constructor() {
        this.currentVersion = VERSION_CONFIG.CURRENT.version; // Initialized from config
        this.buildNumber = VERSION_CONFIG.CURRENT.buildNumber; // Initialized from config
        this.versionHistory = [];
        this.updateCheckInterval = null;
        this.updateCheckUrl = VERSION_CONFIG.UPDATE.updateUrl;
    }
    
    // 현재 버전 정보
    getCurrentVersion() {
        return {
            version: this.currentVersion,
            buildNumber: this.buildNumber,
            fullVersion: `${this.currentVersion}+${this.buildNumber}`,
            timestamp: new Date().toISOString()
        };
    }
    
    // 버전 비교 (semver 방식)
    compareVersions(version1, version2) {
        const v1Parts = version1.split('.').map(Number);
        const v2Parts = version2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
            const v1Part = v1Parts[i] || 0;
            const v2Part = v2Parts[i] || 0;
            
            if (v1Part > v2Part) return 1;
            if (v1Part < v2Part) return -1;
        }
        
        return 0;
    }
    
    // 새 버전 확인
    async checkForUpdates() {
        try {
            const response = await fetch(this.updateCheckUrl + '?t=' + Date.now());
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const releaseNotes = await response.json();
            
            if (!releaseNotes || !Array.isArray(releaseNotes) || releaseNotes.length === 0) {
                return { hasUpdate: false, message: '릴리즈 정보를 찾을 수 없습니다.' };
            }
            
            const latestRelease = releaseNotes[0];
            const latestVersion = latestRelease.version;
            
            const comparison = this.compareVersions(latestVersion, this.currentVersion);
            const hasUpdate = comparison > 0;
            
            return {
                hasUpdate,
                currentVersion: this.currentVersion,
                latestVersion,
                comparison,
                latestRelease,
                allReleases: releaseNotes
            };
            
        } catch (error) {
            console.error('업데이트 확인 실패:', error);
            return { 
                hasUpdate: false, 
                error: error.message,
                message: '업데이트 확인 중 오류가 발생했습니다.' 
            };
        }
    }
    
    // 버전 히스토리 저장
    saveVersionHistory(versionInfo) {
        const history = this.getVersionHistory();
        history.unshift({
            ...versionInfo,
            installedAt: new Date().toISOString()
        });
        
        // 최근 10개 버전만 유지
        if (history.length > 10) {
            history.splice(10);
        }
        
        localStorage.setItem('app_version_history', JSON.stringify(history));
        this.versionHistory = history;
    }
    
    // 버전 히스토리 로드
    getVersionHistory() {
        try {
            const saved = localStorage.getItem('app_version_history');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('버전 히스토리 로드 실패:', error);
            return [];
        }
    }
    
    // 자동 업데이트 체크 시작
    startAutoUpdateCheck() {
        if (!VERSION_CONFIG.UPDATE.autoCheckEnabled) {
            console.log('자동 업데이트 체크가 설정에서 비활성화되었습니다.');
            return;
        }

        this.stopAutoUpdateCheck();
        
        const intervalMinutes = VERSION_CONFIG.UPDATE.checkInterval;
        
        this.updateCheckInterval = setInterval(async () => {
            const updateInfo = await this.checkForUpdates();
            if (updateInfo.hasUpdate) {
                this.notifyUpdateAvailable(updateInfo);
            }
        }, intervalMinutes * 60 * 1000);
        
        console.log(`자동 업데이트 체크 시작 (${intervalMinutes}분 간격)`);
    }
    
    // 자동 업데이트 체크 중지
    stopAutoUpdateCheck() {
        if (this.updateCheckInterval) {
            clearInterval(this.updateCheckInterval);
            this.updateCheckInterval = null;
            console.log('자동 업데이트 체크 중지');
        }
    }
    
    // 업데이트 알림
    notifyUpdateAvailable(updateInfo) {
        const message = `새 버전 ${updateInfo.latestVersion}이(가) 있습니다!`;

        // App 객체에 직접 의존하는 대신 커스텀 이벤트를 발생시켜 UI 업데이트를 요청합니다.
        const event = new CustomEvent('updateAvailable', { detail: { message, updateInfo } });
        window.dispatchEvent(event);
    }
    
    // 업데이트 모달 표시
    showUpdateModal(updateInfo) {
        // 여러 개의 모달이 열리는 것을 방지합니다.
        if (document.querySelector('.update-modal')) return;

        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'update-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';

        const modalContent = document.createElement('div');
        modalContent.className = 'bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full';

        const title = document.createElement('h2');
        title.className = 'text-xl font-bold mb-4 text-gray-900 dark:text-white';
        title.textContent = '새로운 업데이트';
        modalContent.appendChild(title);

        const infoContainer = document.createElement('div');
        infoContainer.className = 'mb-6';

        const currentVersionP = document.createElement('p');
        currentVersionP.className = 'text-gray-600 dark:text-gray-300 mb-2';
        currentVersionP.innerHTML = `현재 버전: <span class="font-semibold">${updateInfo.currentVersion}</span>`;
        infoContainer.appendChild(currentVersionP);

        const latestVersionP = document.createElement('p');
        latestVersionP.className = 'text-gray-600 dark:text-gray-300 mb-2';
        latestVersionP.innerHTML = `새 버전: <span class="font-semibold text-green-600 dark:text-green-400">${updateInfo.latestVersion}</span>`;
        infoContainer.appendChild(latestVersionP);

        const changes = updateInfo.latestRelease?.changes;
        if (changes && Array.isArray(changes) && changes.length > 0) {
            const changesContainer = document.createElement('div');
            changesContainer.className = 'mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg max-h-40 overflow-y-auto';
            
            const changesTitle = document.createElement('h3');
            changesTitle.className = 'text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2';
            changesTitle.textContent = '주요 변경사항:';
            changesContainer.appendChild(changesTitle);

            const changesList = document.createElement('ul');
            changesList.className = 'list-disc list-inside space-y-1';
            
            changes.forEach(change => {
                const listItem = document.createElement('li');
                listItem.className = 'text-sm text-gray-700 dark:text-gray-300';
                listItem.textContent = change;
                changesList.appendChild(listItem);
            });
            changesContainer.appendChild(changesList);
            infoContainer.appendChild(changesContainer);
        }

        modalContent.appendChild(infoContainer);

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'flex justify-end space-x-3';

        const laterButton = document.createElement('button');
        laterButton.className = 'px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500';
        laterButton.textContent = '나중에';
        laterButton.addEventListener('click', () => modalOverlay.remove());
        buttonContainer.appendChild(laterButton);

        const updateButton = document.createElement('button');
        updateButton.className = 'px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500';
        updateButton.textContent = '지금 업데이트';
        updateButton.addEventListener('click', () => {
            updateButton.textContent = '업데이트 중...';
            updateButton.disabled = true;
            window.location.reload();
        });
        buttonContainer.appendChild(updateButton);

        modalContent.appendChild(buttonContainer);
        modalOverlay.appendChild(modalContent);
        
        document.body.appendChild(modalOverlay);
    }
    
    // 버전 정보 초기화
    async init() {
        // 버전 히스토리 로드
        this.versionHistory = this.getVersionHistory();
        
        // 초기 업데이트 확인 및 릴리즈 노트 로드
        try {
            const updateInfo = await this.checkForUpdates();
            
            // 현재 버전 저장
            const currentVersionInfo = this.getCurrentVersion();
            const lastVersion = this.versionHistory[0];
            
            if (!lastVersion || lastVersion.version !== this.currentVersion) {
                this.saveVersionHistory(currentVersionInfo);
                console.log(`버전 업데이트됨: ${lastVersion?.version || '이전 버전'} → ${this.currentVersion}`);
            }

            // 자동 업데이트 체크 시작
            this.startAutoUpdateCheck();

            if (updateInfo.hasUpdate) {
                console.log('새 버전 사용 가능:', updateInfo.latestVersion);
            }
            return updateInfo;
        } catch (error) {
            console.error('VersionManager 초기화 실패:', error);
            return { hasUpdate: false, error: error.message };
        }
    }
    
    // 앱 종료 시 정리
    cleanup() {
        this.stopAutoUpdateCheck();
    }
}

// 전역 인스턴스
export const versionManager = new VersionManager();

// 앱 종료 시 정리
window.addEventListener('beforeunload', () => {
    versionManager.cleanup();
});
