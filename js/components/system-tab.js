import { App } from '../app.js';

export class SystemTab {
    static render() {
        return `
            ${this.#renderCloudBackupSettings()}
            ${this.#renderAutomationSettings()}
            ${this.#renderUpdateSettings()}
            ${this.#renderFontSizeSettings()}
            ${this.#renderSupabaseSettings()}
        `;
    }

    static #renderCloudBackupSettings() {
        const isSupabaseEnabled = App.state.isSupabaseEnabled;
        const isLoggedIn = App.state.currentUser !== null;
        
        return `
            <div class="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg shadow-inner space-y-4">
                <h3 class="text-lg font-bold">데이터 백업/복원</h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                    ${isLoggedIn && isSupabaseEnabled 
                        ? '로그인 사용자: 클라우드에 백업/복원합니다.' 
                        : '비로그인 사용자: JSON 파일로 백업/복원합니다.'}
                </p>
                
                <div class="space-y-2">
                    <button data-action="backup-data" class="w-full bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600">데이터 백업</button>
                    <button data-action="restore-data" class="w-full bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600">데이터 복원</button>
                </div>
                
                ${isLoggedIn && isSupabaseEnabled ? `
                    <p class="text-xs text-gray-400 dark:text-gray-500 mt-2">※ 클라우드 동기화가 활성화되어 있습니다. 개정(revision) 관리 기능도 사용할 수 있습니다.</p>
                ` : ''}
            </div>
        `;
    }

    static #renderAutomationSettings() {
        return `
            <div class="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg shadow-inner space-y-4">
                <h3 class="text-lg font-bold">자동화 설정</h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">GPS 자동 기록 등 자동화 기능을 설정합니다.</p>

                <div class="flex items-center justify-between">
                    <div>
                        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">GPS 자동 기록:</span>
                        <span class="ml-2 text-xs ${App.state.isGpsAutoRecordEnabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}">
                            ${App.state.isGpsAutoRecordEnabled ? '활성화됨' : '비활성화'}
                        </span>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="gps-auto-record-toggle" data-action="toggle-gps-auto-record" class="sr-only peer" ${App.state.isGpsAutoRecordEnabled ? 'checked' : ''}>
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                <div class="flex items-center justify-between">
                    <div>
                        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">출발문자 자동발송:</span>
                        <span class="ml-2 text-xs ${App.state.isAutoSmsOnDepartureEnabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}">
                            ${App.state.isAutoSmsOnDepartureEnabled ? '활성화됨' : '비활성화'}
                        </span>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="auto-sms-departure-toggle" data-action="toggle-auto-sms-departure" class="sr-only peer" ${App.state.isAutoSmsOnDepartureEnabled ? 'checked' : ''}>
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            </div>
        `;
    }

    static #renderUpdateSettings() {
        return `
            <div class="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg shadow-inner space-y-4">
                <h3 class="text-lg font-bold">앱 업데이트</h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">새로운 버전이 있는지 확인하거나, 앱을 강제로 새로고침하여 최신 상태를 반영합니다.</p>
                
                <div class="flex space-x-2">
                    <button data-action="check-for-update" 
                            class="bg-teal-500 text-white px-4 py-2 rounded text-sm hover:bg-teal-600">업데이트 확인</button>
                    <button data-action="update-app" 
                            class="bg-indigo-500 text-white px-4 py-2 rounded text-sm hover:bg-indigo-600">업데이트</button>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                        현재 버전:
                        <button data-action="show-release-notes" data-action-secondary="increment-admin-click" class="font-bold text-indigo-600 dark:text-indigo-400 hover:underline focus:outline-none">
                            ${App.state.appVersion}
                        </button>
                    </p>
                </div>
            </div>
        `;
    }

    static #renderFontSizeSettings() {
        return `
            <div class="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg shadow-inner space-y-4">
                <h3 class="text-lg font-bold">폰트 크기 조절</h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">앱 전체의 폰트 크기를 조절합니다.</p>
                
                <div class="flex items-center space-x-4">
                    <button data-action="decrease-global-font-size" class="bg-gray-500 text-white px-4 py-2 rounded text-sm hover:bg-gray-600">-</button>
                    <span id="global-font-size-display" class="text-lg font-bold">${App.state.globalFontSize}%</span>
                    <button data-action="increase-global-font-size" class="bg-gray-500 text-white px-4 py-2 rounded text-sm hover:bg-gray-600">+</button>
                </div>
                
                <input type="range" id="global-font-size-slider" min="80" max="150" value="${App.state.globalFontSize}" 
                       class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700">
            </div>
        `;
    }

    static #renderSupabaseSettings() {
        const isConfigured = App.state.supabaseUrl && App.state.supabaseUrl !== 'YOUR_SUPABASE_URL' && App.state.supabaseUrl !== '';
        const isLoggedIn = App.state.currentUser !== null;
        const isAdminMode = App.state.isAdminMode;
        
        return `
            <div class="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg shadow-inner space-y-4">
                <h3 class="text-lg font-bold">Supabase 클라우드 동기화</h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">Supabase를 사용하여 데이터를 클라우드에 저장하고 실시간 동기화합니다. 개정(revision) 관리 기능을 지원합니다.</p>
                <p class="text-xs text-green-600 dark:text-green-400">✅ 기본 설정이 내장되어 있습니다.</p>

                ${isAdminMode ? `
                    <div class="space-y-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <p class="text-xs text-orange-600 dark:text-orange-400">🔒 관리자 모드 - 설정 수정 가능</p>
                        <div>
                            <label for="supabase-url" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Supabase URL:</label>
                            <input type="text" id="supabase-url"
                                   value="${App.state.supabaseUrl || ''}"
                                   placeholder="https://xyz.supabase.co"
                                   class="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm p-2 text-sm">
                        </div>

                        <div>
                            <label for="supabase-anon-key" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Supabase Anon Key:</label>
                            <input type="password" id="supabase-anon-key"
                                   value="${App.state.supabaseAnonKey || ''}"
                                   placeholder="Project Settings > API에서 확인"
                                   class="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm p-2 text-sm">
                        </div>

                        <div class="flex space-x-2">
                            <button data-action="save-supabase-config" class="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700">설정 저장</button>
                            <button data-action="test-supabase-connection" class="bg-gray-500 text-white px-4 py-2 rounded text-sm hover:bg-gray-600">연결 테스트</button>
                            <button data-action="disable-admin-mode" class="bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600">관리자 모드 종료</button>
                        </div>
                    </div>
                ` : ''}

                ${isConfigured ? `
                    <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <div class="flex items-center justify-between">
                            <div>
                                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">클라우드 동기화:</span>
                                <span class="ml-2 text-xs ${App.state.isSupabaseEnabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}">
                                    ${App.state.isSupabaseEnabled ? '활성화됨' : '비활성화'}
                                </span>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="supabase-toggle" data-action="toggle-supabase" class="sr-only peer" ${App.state.isSupabaseEnabled ? 'checked' : ''}>
                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>

                    ${App.state.isSupabaseEnabled ? `
                        <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                            <h4 class="text-md font-bold mb-2">사용자 인증</h4>
                            ${isLoggedIn ? `
                                <div class="flex items-center justify-between">
                                    <div>
                                        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">로그인된 사용자:</span>
                                        <span class="ml-2 text-sm text-gray-600 dark:text-gray-400">${App.state.currentUser?.email || '알 수 없음'}</span>
                                    </div>
                                    <button data-action="supabase-sign-out" class="bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600">로그아웃</button>
                                </div>
                            ` : `
                                <div class="space-y-2">
                                    <div>
                                        <label for="auth-email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">이메일:</label>
                                        <input type="email" id="auth-email"
                                               placeholder="user@example.com"
                                               class="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm p-2 text-sm">
                                    </div>
                                    <div>
                                        <label for="auth-password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">비밀번호:</label>
                                        <input type="password" id="auth-password"
                                               placeholder="비밀번호"
                                               class="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm p-2 text-sm">
                                    </div>
                                    <div class="flex space-x-2">
                                        <button data-action="supabase-sign-in" class="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600">로그인</button>
                                        <button data-action="supabase-sign-up" class="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600">회원가입</button>
                                    </div>
                                </div>
                            `}
                        </div>
                    ` : ''}
                ` : ''}
            </div>
        `;
    }

    static updateGlobalFontSizeDisplay() {
        const display = document.getElementById('global-font-size-display');
        if (display) {
            display.textContent = `${App.state.globalFontSize}%`;
        }
    }
}
