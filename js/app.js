// js/app.js - v7.5.0 - 자동 업데이트 확인 로직 추가

import { AppState } from './state.js';
import { StorageService } from './services/storage-service.js';
import { DEFAULT_MAINTENANCE_CATEGORIES } from './state.js'; // Import the constant
import { GeolocationService } from './services/geolocation-service.js';
import { DBService } from './services/db-service.js';
import { SupabaseStorageService } from './services/supabase-storage-service.js';
import { Helpers } from './utils/helpers.js';
import { versionManager } from './utils/version-manager.js';
import { Calculations } from './utils/calculations.js';
import { 
    // Supabase 관련 함수는 ./supabase.js에서 직접 가져옵니다.
    // ScheduleView는 ./views/index.js에서 가져옵니다.
    SettingsView, 
    HistoryView, 
    ManualView, 
    VehicleLogView
} from './views/index.js';
import { 
    updateAllComponents, 
    initializeComponents,
    showNotification,
    Modals,
    MessagePreview
} from './components/index.js';
import { ScheduleView } from './views/index.js'; // ScheduleView를 명시적으로 가져옵니다.

// Supabase related functions imported directly from supabase.js, including getSupabaseClient for direct access
import { initSupabase, isSupabaseConfigured, supabaseAuth, getSupabaseClient } from './supabase.js';

/**
 * 서비스 워커를 초기화하고 앱 업데이트 로직을 설정합니다.
 */
function initServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    // 페이지 새로고침을 담당하는 controllerchange 리스너를 즉시 등록합니다.
    // 서비스 워커 업데이트 후 'skipWaiting'이 호출되면 이 이벤트가 발생하여 페이지를 새로고침합니다.
    let refreshing;
    navigator.serviceWorker.addEventListener('controllerchange', (event) => {
        if (refreshing) return;
        refreshing = true; // 재진입 방지를 위해 플래그를 즉시 설정
        console.log('컨트롤러가 변경되었습니다. 페이지를 새로고침합니다...');
        sessionStorage.setItem('app_reloading_for_update', 'true');
        window.location.reload();
    });

    // 페이지의 다른 리소스 로딩을 방해하지 않도록 'load' 이벤트 후에 서비스 워커를 등록합니다.
    window.addEventListener('load', async () => {
        // 개발 환경(ngrok 등)에서는 Service Worker를 비활성화하여 MIME type 오류 방지
        const isDevelopment = window.location.hostname.includes('ngrok') || 
                              window.location.hostname === 'localhost' ||
                              window.location.protocol === 'file:';
        
        if (isDevelopment) {
            console.log('개발 환경에서 Service Worker를 비활성화합니다.');
            return;
        }

        navigator.serviceWorker.register('./service-worker.js', { type: 'module' })
            .then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);

                // 주기적으로 업데이트를 확인하는 로직 (브라우저가 자동으로 처리)
                // 새로운 서비스 워커가 발견되면 'updatefound' 이벤트가 발생합니다.
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        console.log('새로운 서비스 워커를 발견했습니다. 설치 중...');
                        newWorker.addEventListener('statechange', () => {
                            // 새 워커가 설치는 되었지만, 아직 활성화(activate)는 되지 않은 상태 (waiting)
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                console.log('새로운 서비스 워커가 설치되었습니다. 업데이트 알림을 표시합니다.');
                                // 사용자에게 업데이트를 알리고, 수락 시 skipWaiting을 호출하도록 함
                                showUpdateNotification(newWorker);
                            }
                        });
                    }
                });
            })
            .catch(error => {
                // MIME 타입 오류를 명시적으로 확인하여 개발자에게 안내
                if (error.message.includes('MIME type')) {
                    console.error('Service Worker 등록 실패: 서버가 올바른 JavaScript 파일을 반환하지 않았습니다. (MIME type error). 로컬 서버가 정상적으로 실행 중인지, service-worker.js 파일 경로가 올바른지 확인하세요.', error);
                    showNotification('오프라인 캐시 기능 초기화에 실패했습니다. 개발 환경을 확인해주세요.', 'warning');
                } else {
                    console.error('Service Worker 등록 실패:', error);
                }
            });
    });
}

/**
 * 앱 업데이트를 알리는 알림을 표시합니다.
 * @param {ServiceWorker} worker - 새로운 서비스 워커 객체
 */
function showUpdateNotification(worker) {
    showNotification('새로운 버전이 있습니다. 업데이트 버튼을 눌러주세요.', 'info', 0, true, () => {
        worker.postMessage({ action: 'skipWaiting' });
    });
}

// 글로벌 App 객체
export const App = {
    state: AppState,
    utils: Helpers,
    calculations: Calculations,
    services: {
        storage: new StorageService(),
        db: new DBService(),
        geolocation: new GeolocationService(),
        supabaseStorage: new SupabaseStorageService()
    },

    /**
     * 화면 헤더에 로그인 상태를 표시합니다.
     */
    updateLoginStatusDisplay() {
        const loginStatusDisplay = document.getElementById('login-status-display');
        if (loginStatusDisplay) {
            if (this.state.currentUser) {
                loginStatusDisplay.innerHTML = `
                    <span class="text-sm font-medium text-gray-600 dark:text-gray-300">로그인됨:</span>
                    <span class="text-sm font-bold text-indigo-700 dark:text-indigo-200">${this.state.currentUser.email}</span>
                    <button data-action="supabaseSignOut" class="ml-2 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">로그아웃</button>
                `;
            } else {
                loginStatusDisplay.innerHTML = `<span class="text-sm font-medium text-gray-600 dark:text-gray-300">로그아웃됨</span>`;
            }
        }
    },
    
    // 게터 함수들
    getters: {
        getRotationsForDay() {
            return Calculations.getRotationsForDay(
                App.state.editableStops,
                App.state.courses,
                App.state.selectedCourseOrder
            );
        },
        
        activeAgencies() {
            return App.state.agencies.filter(a => !a.isDeleted);
        }
    },

    /**
     * 로딩 오버레이를 표시합니다.
     * @param {string} message - 표시할 메시지
     */
    showLoadingOverlay(message = '로딩 중...') {
        let overlay = document.getElementById('loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]';
            overlay.innerHTML = `
                <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl flex items-center space-x-4">
                    <svg class="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span id="loading-message" class="text-lg font-medium text-gray-700 dark:text-gray-200">${message}</span>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'flex';
        const msgElement = document.getElementById('loading-message');
        if (msgElement) msgElement.textContent = message;
    },

    /**
     * 로딩 오버레이를 숨깁니다.
     */
    hideLoadingOverlay() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    },

    // 앱 초기화
    async init() {
        try {
            console.log('🚀 배송 스케줄러 앱 초기화 중...');

            // 서비스 워커 업데이트 로직 초기화
            initServiceWorker();
            
            // 모바일 환경 감지
            this.state.isMobile = this.detectMobile();
            
            // 기본 데이터 로드
            await this.loadInitialData();
            
            // Supabase 설정 로드 및 초기화
            if (this.services && this.services.storage && this.services.storage.loadSupabaseUrl) {
                const savedUrl = this.services.storage.loadSupabaseUrl();
                const savedKey = this.services.storage.loadSupabaseAnonKey();
                const savedEnabled = this.services.storage.loadSupabaseEnabled();

                // 저장된 값이 있으면 사용, 없으면 기본값 사용
                this.state.supabaseUrl = savedUrl || this.state.supabaseUrl;
                this.state.supabaseAnonKey = savedKey || this.state.supabaseAnonKey;
                this.state.isSupabaseEnabled = savedEnabled !== undefined ? savedEnabled : this.state.isSupabaseEnabled;
            } else {
                console.warn('Storage service not available, skipping Supabase initialization');
            }

            // 기타 설정 로드
            if (this.services && this.services.storage) {
                this.state.globalFontSize = this.services.storage.loadGlobalFontSize();
            }
            
            if (this.state.isSupabaseEnabled && this.state.supabaseUrl && this.state.supabaseAnonKey) {
                const initialized = initSupabase(this.state.supabaseUrl, this.state.supabaseAnonKey);
                if (initialized) {
                    console.log('✅ Supabase 클라우드 동기화 활성화됨');
                    
                    // 현재 사용자 정보 확인
                    const currentUser = await supabaseAuth.getCurrentUser();
                    if (currentUser) {
                        this.state.currentUser = currentUser;
                        console.log('✅ 자동 로그인됨:', currentUser.email);
                        
                        // 활성 개정 확인 및 자동 생성
                        const supabaseStorage = this.services.supabaseStorage;
                        const activeRevision = await supabaseStorage.getActiveRevision();
                        
                        if (!activeRevision) {
                            console.log('활성 개정이 없어서 기존 개정을 확인합니다.');
                            // 기존 개정 목록 확인
                            const revisions = await supabaseStorage.loadRevisions();
                            if (revisions.length > 0) {
                                // 기존 개정이 있으면 가장 최신 개정을 활성화
                                const latestRevision = revisions[0]; // 이미 내림차순 정렬됨
                                await supabaseStorage.setActiveRevision(latestRevision.id);
                                console.log('✅ 기존 개정을 활성화했습니다:', latestRevision.name);
                            } else {
                                // 기존 개정이 없으면 새 개정 생성
                                const firstRevision = await supabaseStorage.createRevision(
                                    '초기 개정',
                                    '자동 생성된 첫 번째 개정'
                                );

                                if (firstRevision) {
                                    await supabaseStorage.setActiveRevision(firstRevision.id);
                                    console.log('✅ 첫 번째 개정이 자동 생성되었습니다:', firstRevision.name);
                                }
                            }
                        } else {
                            // 활성 개정이 있으면 Supabase에서 데이터 자동 로드
                            console.log('활성 개정이 있어서 Supabase에서 데이터를 불러옵니다:', activeRevision.name);
                            await this.loadFromSupabase();
                        }
                    }
                    
                    // 실시간 동기화 구독 설정
                    await this.setupRealtimeSync();
                } else {
                    console.warn('⚠️ Supabase 초기화 실패, 로컬 스토리지 모드로 작동');
                    this.state.isSupabaseEnabled = false;
                }
            }
            
            // 버전 관리 시스템 초기화 및 릴리즈 노트 로드
            await versionManager.init();
            // 버전 관리자에서 최신 버전을 가져와 상태에 설정
            this.state.appVersion = versionManager.currentVersion;
            
            // VersionManager로부터 업데이트 이벤트를 수신하여 알림을 표시합니다.
            window.addEventListener('updateAvailable', (e) => {
                const { message, updateInfo } = e.detail;
                showNotification(message, 'info', 0, true, () => {
                    versionManager.showUpdateModal(updateInfo);
                });
            });

            // 세션 상태 복원
            await this.restoreSessionState();
            
            // 현재 날짜 설정
            this.setInitialDate();
            
            this.updateLoginStatusDisplay(); // 초기 로그인 상태 표시
            // 오늘 날짜 스케줄 로드
            this.selectDateAndLoad(this.state.selectedDate);
            
            // 히스토리 로드
            this.loadHistory();
            
            // 컴포넌트 초기화
            initializeComponents();

            // 글로벌 폰트 크기 적용
            document.documentElement.style.fontSize = `${this.state.globalFontSize}%`;

            // 이벤트 핸들러 설정
            await this.initEventHandling();
            
            // Wake Lock 재요청 리스너 등록 (탭 활성화 시)
            document.addEventListener('visibilitychange', async () => {
                if (this.state.wakeLockSentinel === null && document.visibilityState === 'visible' && this.state.isGpsAutoRecordEnabled) {
                    await this.requestWakeLock();
                }
            });
            
            // 일일 자동 백업 확인
            this.actions.triggerAutoBackup('appInit');

            // 주기적인 업데이트 확인 시작 (1시간 간격)
            this.startUpdateTimer();

            // 업데이트 완료 알림 확인
            if (sessionStorage.getItem('app_reloading_for_update') === 'true') {
                sessionStorage.removeItem('app_reloading_for_update');
                // UI가 렌더링될 시간을 약간 확보한 후 알림 표시
                setTimeout(() => {
                    showNotification(`앱이 v${this.state.appVersion}(으)로 업데이트되었습니다.`, 'success', 5000);
                }, 500);
            }

            // GPS 자동 기록 활성화 상태라면 감시 시작 (versionManager 초기화 후)
            if (this.state.isGpsAutoRecordEnabled) {
                this.startGpsWatching();
            }
            
            console.log('✅ 앱 초기화 완료');
            
        } catch (error) {
            console.error('❌ 앱 초기화 실패:', error);
            showNotification('앱 초기화에 실패했습니다.', 'error');
        }
    },

    // 모바일 환경 감지
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth < 768;
    },

    /**
     * 백그라운드에서 서비스 워커 업데이트를 주기적으로 확인합니다.
     */
    startUpdateTimer() {
        if (!('serviceWorker' in navigator)) return;

        // 1시간마다 확인 (네트워크가 연결된 상태에서만)
        setInterval(async () => {
            if (navigator.onLine) {
                try {
                    const registration = await navigator.serviceWorker.ready;
                    await registration.update();
                    console.log('🔄 백그라운드 업데이트 확인 완료');
                } catch (e) {
                    console.error('자동 업데이트 확인 실패:', e);
                }
            }
        }, 3600000); // 1시간 (ms)
    },

    // 초기 데이터 로드
    async loadInitialData() {
        // 기본 설정 데이터 로드
        this.state.agencies = this.services.storage.loadAgencies();
        this.state.courses = this.services.storage.loadCourses();
        this.state.drivers = this.services.storage.loadDrivers();
        this.state.travelTimes = this.services.storage.loadTravelTimes();
        
        // UI 설정 로드
        const savedColumnWidths = this.services.storage.loadColumnWidths();
        if (savedColumnWidths) {
            // 기존 설정과 기본 설정을 병합하여 누락된 컬럼(group, priority 등) 방지
            this.state.columnWidths = { ...this.state.columnWidths, ...savedColumnWidths };
        }

        this.state.showMessageArrivalTime = this.services.storage.loadShowMessageArrivalTime();
        this.state.preferredNavApp = this.services.storage.loadPreferredNavApp();
        this.state.driverName = this.services.storage.loadDriverName();
        this.state.messageFontSize = parseInt(this.services.storage.loadMessageFontSize());
        this.state.googleMapsApiKey = this.services.storage.loadGoogleMapsApiKey() || 'AIzaSyAAosGgctO5t8FncQ29g-i4QOXvISLs0-M';
        this.state.globalFontSize = parseInt(this.services.storage.loadGlobalFontSize());
        
        // 자동화 설정 로드
        this.state.isAutoSmsOnDepartureEnabled = this.services.storage.loadAutoSmsOnDepartureEnabled();
        this.state.isGpsAutoRecordEnabled = this.services.storage.loadGpsAutoRecordEnabled();
        
        // 차계부 데이터 로드
        const loadedVehicleLog = this.services.storage.loadVehicleLog();
        if (loadedVehicleLog) {
            // Deep merge to prevent losing default structure if saved data is partial
            this.state.vehicleLog = {
                ...this.state.vehicleLog,
                ...loadedVehicleLog,
                mileage: loadedVehicleLog.mileage || this.state.vehicleLog.mileage,
                maintenance: loadedVehicleLog.maintenance || this.state.vehicleLog.maintenance,
                settings: {
                    ...this.state.vehicleLog.settings,
                    ...(loadedVehicleLog.settings || {}),
                    maintenanceIntervals: {
                        ...this.state.vehicleLog.settings.maintenanceIntervals,
                        ...(loadedVehicleLog.settings?.maintenanceIntervals || {})
                    },
                    customCategories: loadedVehicleLog.settings?.customCategories || []
                }
            };
        }
        
        // 사용자 정의 정비 항목 적용
        if (this.state.vehicleLog.settings.customCategories && this.state.vehicleLog.settings.customCategories.length > 0) {
            const custom = this.state.vehicleLog.settings.customCategories;
            // 기본 항목과 중복되지 않도록 필터링하고 합침 ('기타'는 항상 마지막)
            const uniqueCustom = custom.filter(c => !DEFAULT_MAINTENANCE_CATEGORIES.includes(c));
            
            // 삭제된 기본 카테고리 제외
            const deletedDefaults = this.state.vehicleLog.settings.deletedDefaultCategories || [];
            const availableDefaults = DEFAULT_MAINTENANCE_CATEGORIES.filter(c => !deletedDefaults.includes(c));
            
            this.state.maintenanceCategories = [...availableDefaults, ...uniqueCustom, '기타'];
            
            // 사용자 정의 항목에 대한 기본 정비 주기(0)가 없는 경우 초기화
            uniqueCustom.forEach(category => {
                if (this.state.vehicleLog.settings.maintenanceIntervals[category] === undefined) {
                    this.state.vehicleLog.settings.maintenanceIntervals[category] = 0;
                }
            });
        } else {
            // 사용자 정의 항목이 없는 경우에도 삭제된 기본 카테고리 제외
            const deletedDefaults = this.state.vehicleLog.settings.deletedDefaultCategories || [];
            const availableDefaults = DEFAULT_MAINTENANCE_CATEGORIES.filter(c => !deletedDefaults.includes(c));
            this.state.maintenanceCategories = [...availableDefaults, '기타'];
        }
        
        // 테마 로드 및 적용
        const savedTheme = this.services.storage.loadTheme();
        if (savedTheme) {
            this.state.theme = savedTheme;
            this.applyTheme(savedTheme);
        }
        
        // 자동 백업 설정 로드
        const autoBackupSettings = this.services.storage.loadAutoBackupSettings();
        this.state.isAutoBackupEnabled = autoBackupSettings.enabled;
        this.state.autoBackupTrigger = autoBackupSettings.trigger;
        this.state.lastAutoBackupDate = autoBackupSettings.lastDate;
        
        // 캐시 구축
        this.buildCache();
    },

    // 캐시 구축
    buildCache() {
        this.state.cache.agenciesMap = new Map(
            this.state.agencies.filter(a => !a.isDeleted).map(a => [a.id, a])
        );
        this.state.cache.coursesMap = new Map(
            this.state.courses.map(c => [c.id, c])
        );
    },

    // 세션 상태 복원
    async restoreSessionState() {
        try {
            const savedState = await this.services.db.loadSessionState();
            if (savedState) {
                // 복원할 속성들만 선택적으로 적용
                const allowedProperties = [
                    'viewMode', 'activeTab', 'agencySettingsCourseFilterId',
                    'agencySort', 'courseSort', 'isCourseManagerOpen',
                    'messagePreviewFilterCourseId', 'isCorrectionModeActive',
                    'historySelectedMonth',
                    'selectedVehicleLogMonth', 'vehicleLogSelectedYear', 'vehicleLogFilterMode'
                ];
                
                allowedProperties.forEach(prop => {
                    if (savedState[prop] !== undefined) {
                        this.state[prop] = savedState[prop];
                    }
                });
                
                // 모달 상태는 항상 초기화 (앱 시작 시 모달이 표시되는 문제 방지)
                this.state.showRestoreModal = false;
                
                console.log('✅ 세션 상태 복원 완료');
            }
        } catch (error) {
            console.warn('⚠️ 세션 상태 복원 실패:', error);
        }
    },

    // 초기 날짜 설정
    setInitialDate() {
        const today = new Date();
        const now = new Date();
        
        // 오후 6시 이후면 다음 날짜로 설정
        if (now.getHours() >= 18) {
            today.setDate(today.getDate() + 1);
        }
        
        this.state.selectedDate = Helpers.formatDate(today);
    },

    // GPS 감시 시작 (앱 초기화 시 호출용)
    async startGpsWatching() {
        if (!this.state.isGpsAutoRecordEnabled) return;
        
        if (!window.isSecureContext) {
            console.warn('GPS 기능은 보안 연결(HTTPS)에서만 사용할 수 있습니다.');
            this.state.isGpsAutoRecordEnabled = false;
            return;
        }

        try {
            const watcherId = this.services.geolocation.startWatching(
                (position) => this.actions.handleGpsUpdate(position),
                (error) => {
                    console.error('GPS 위치 추적 오류:', error);
                    if (error.code === 1) { // PERMISSION_DENIED
                        this.state.isGpsAutoRecordEnabled = false;
                        this.services.storage.saveGpsAutoRecordEnabled(false);
                        this.render();
                    }
                }
            );
            this.state.gpsWatcherId = watcherId;
            console.log('GPS 자동 기록 감시 시작됨');
            this.requestWakeLock();
        } catch (error) {
            console.error('GPS 시작 실패:', error);
            this.state.isGpsAutoRecordEnabled = false;
            this.services.storage.saveGpsAutoRecordEnabled(false);
        }
    },

    // 화면 꺼짐 방지 (Wake Lock) 요청
    async requestWakeLock() {
        if ('wakeLock' in navigator) {
            try {
                this.state.wakeLockSentinel = await navigator.wakeLock.request('screen');
                console.log('Wake Lock active');
                this.state.wakeLockSentinel.addEventListener('release', () => {
                    console.log('Wake Lock released');
                    this.state.wakeLockSentinel = null;
                });
            } catch (err) {
                console.error(`Wake Lock error: ${err.name}, ${err.message}`);
            }
        }
    },

    // 화면 꺼짐 방지 해제
    releaseWakeLock() {
        if (this.state.wakeLockSentinel) {
            this.state.wakeLockSentinel.release();
            this.state.wakeLockSentinel = null;
        }
    },

    // 이벤트 핸들링 초기화
    async initEventHandling() {
        const { initEventHandlers, ActionHandlers, initDragDropHandlers, initResizeHandlers } = await import('./handlers/index.js');

        this.actions = ActionHandlers;
        initEventHandlers();
        initDragDropHandlers();
        initResizeHandlers();
        
        // 맨 위로 가기 버튼 핸들러
        const scrollToTopBtn = document.getElementById('scroll-to-top-btn');
        if (scrollToTopBtn) {
            window.addEventListener('scroll', () => {
                if (window.scrollY > 200) {
                    scrollToTopBtn.classList.remove('hidden');
                } else {
                    scrollToTopBtn.classList.add('hidden');
                }
            });

            scrollToTopBtn.addEventListener('click', () => {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
        }
    },

    // 테마 적용
    applyTheme(theme) {
        this.state.theme = theme;
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        this.services.storage.saveTheme(theme);
    },

    // 메인 렌더링 함수
    render() {
        try {
            // 뷰 모드나 UI 구조에 영향을 주는 핵심 상태가 변경되었을 때 전체 컨테이너를 다시 그림
            const isManagerToggled = this._lastCourseManagerState !== this.state.isCourseManagerOpen;
            const isCompletionToggled = this._lastIsCompleted !== this.state.isCompleted;
            const isLockToggled = this._lastIsEditingLocked !== this.state.isEditingLocked;
            const userChanged = this._lastCurrentUser !== this.state.currentUser;

            if (this.state.lastViewMode !== this.state.viewMode || isManagerToggled || isCompletionToggled || isLockToggled || userChanged) {
                this.updateView();
                this.state.lastViewMode = this.state.viewMode;
                this._lastCourseManagerState = this.state.isCourseManagerOpen;
                this._lastIsCompleted = this.state.isCompleted;
                this._lastIsEditingLocked = this.state.isEditingLocked;
                this._lastCurrentUser = this.state.currentUser;
            } else {
                // 동일한 뷰 내에서는 부분 데이터 업데이트만 수행
                this.partialUpdate();
            }

            this.updateModals();
            updateAllComponents();
            this.updateLastSaved();
            this.updateCourseDisplay();
            this.updateFullscreenButton();
            this.updateSelectedDateInput();
            this.updateFloatingGpsButton(); // 요청사항 2: GPS 버튼 업데이트
            this.checkMaintenanceAlerts(); // 정비 주기 알림 확인
        } catch (error) {
            console.error('❌ 렌더링 오류:', error);
        }
    },

    // 동일 뷰 내에서 데이터만 효율적으로 갱신
    /**
     * 정비 기록과 현재 주행거리를 비교하여 교체 시기 알림을 표시합니다.
     */
    checkMaintenanceAlerts() {
        // 스케줄 화면이 아니거나 이미 이번 세션에서 알림을 보여줬다면 중단
        if (this.state.viewMode !== 'schedule' || this.state._maintenanceAlertsShown) return;

        const alerts = Calculations.calculateMaintenanceAlerts(
            this.state.vehicleLog,
            this.state.maintenanceCategories
        );

        if (alerts.length === 0) return;

        const overdueItems = alerts
            .filter(a => a.overallStatus === 'urgent')
            .map(a => {
                const reason = a.kmStatus === 'urgent' ? `${Math.abs(a.kmRemaining)}km 초과` : '교체 기한 만료';
                return `${a.category}(${reason})`;
            });

        const upcomingItems = alerts
            .filter(a => a.overallStatus === 'warning')
            .map(a => {
                const reason = a.kmRemaining > 0 ? `${a.kmRemaining}km 남음` : '시기 임박';
                return `${a.category}(${reason})`;
            });

        // 알림 메시지 구성 및 표시
        if (overdueItems.length > 0) {
            showNotification(`⚠️ 정비 지연: ${overdueItems.join(', ')} 교체가 필요합니다!`, 'error', 10000);
        }
        if (upcomingItems.length > 0) {
            showNotification(`ℹ️ 정비 임박: ${upcomingItems.join(', ')} 시기가 다가옵니다.`, 'warning', 8000);
        }

        this.state._maintenanceAlertsShown = true;
    },

    partialUpdate() {
        switch (this.state.viewMode) {
            case 'schedule':
                ScheduleView.updateScheduleContent();
                break;
            case 'settings':
                SettingsView.updateContent();
                break;
            case 'history':
                this.updateView(); // 히스토리는 검색/필터링 시 리스트 전체 갱신 필요
                break;
            case 'vehicleLog':
                this.updateView(); // 차계부 데이터 변경 시 전체 뷰 갱신
                break;
        }
    },

    updateView() {
        const contentContainer = document.getElementById('content-container');
        if (!contentContainer) return;

        let html = '';
        switch (this.state.viewMode) {
            case 'schedule':
                html = ScheduleView.render();
                break;
            case 'settings':
                html = SettingsView.render();
                break;
            case 'history':
                html = HistoryView.render();
                break;
            case 'manual':
                html = ManualView.render();
                break;
            case 'vehicleLog':
                html = VehicleLogView.render();
                break;
            case 'analysis':
                html = `<div class="w-full h-[calc(100vh-180px)] min-h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                            <iframe src="Camera202.html?v=${this.state.appVersion}&t=${Date.now()}" class="w-full h-full border-0" title="파일 분석"></iframe>
                        </div>`;
                break;
        }

        contentContainer.innerHTML = html;

        // 버튼 스타일 업데이트
        const views = ['schedule', 'settings', 'history', 'manual', 'vehicleLog', 'analysis'];
        views.forEach(view => {
            const btn = document.getElementById(`${view}-view-btn`);
            if (btn) {
                if (this.state.viewMode === view) {
                    btn.classList.add('bg-indigo-100', 'text-indigo-700', 'dark:bg-indigo-900', 'dark:text-indigo-200');
                    btn.classList.remove('text-gray-500', 'dark:text-gray-400');
                } else {
                    btn.classList.remove('bg-indigo-100', 'text-indigo-700', 'dark:bg-indigo-900', 'dark:text-indigo-200');
                    btn.classList.add('text-gray-500', 'dark:text-gray-400');
                }
            }
        });

        // 뷰별 추가 업데이트
        if (this.state.viewMode === 'schedule') {
            ScheduleView.updateScheduleContent();
        } else if (this.state.viewMode === 'settings') {
            SettingsView.updateContent();
        } else if (this.state.viewMode === 'analysis') {
            // 분석 뷰 전용 업데이트 로직이 필요하다면 여기에 추가
        }
    },

    // 요청사항 2: 스케줄 화면용 플로팅 GPS 버튼 렌더링/제거
    updateFloatingGpsButton() {
        const containerId = 'floating-gps-container';
        let container = document.getElementById(containerId);

        // 스케줄 뷰가 아니면 버튼 제거
        if (this.state.viewMode !== 'schedule') {
            if (container) container.remove();
            return;
        }

        // 스케줄 뷰이고 버튼이 없으면 생성
        if (!container) {
            container = document.createElement('div');
            container.id = containerId;
            // 초기 스타일: 우측 하단, 디자인 개선 (원형 버튼, 그림자, 테두리, 드래그 가능)
            container.className = 'fixed z-50 flex items-center justify-center w-16 h-16 rounded-full shadow-2xl cursor-move transition-all duration-300 border-4 select-none active:scale-95';
            
            // 저장된 위치 불러오기
            const savedPos = localStorage.getItem('gpsButtonPosition');
            if (savedPos) {
                try {
                    const { bottom, right } = JSON.parse(savedPos);
                    container.style.bottom = `calc(${bottom} + env(safe-area-inset-bottom))`;
                    container.style.right = `calc(${right} + env(safe-area-inset-right))`;
                } catch (e) {
                    container.style.bottom = 'calc(5rem + env(safe-area-inset-bottom))';
                    container.style.right = 'calc(1rem + env(safe-area-inset-right))';
                }
            } else {
                container.style.bottom = 'calc(5rem + env(safe-area-inset-bottom))'; // 기본값
                container.style.right = 'calc(1rem + env(safe-area-inset-right))';
            }

            // 내부 HTML (아이콘 + 상태 텍스트)
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center pointer-events-none">
                    <div class="text-sm font-black tracking-tighter">GPS</div>
                    <div class="text-[10px] font-bold mt-[-2px] status-text">OFF</div>
                </div>
            `;
            document.body.appendChild(container);

            // 드래그 앤 드롭 로직
            let isDragging = false;
            let startX, startY, initialRight, initialBottom;
            let hasMoved = false;

            const handleStart = (clientX, clientY) => {
                isDragging = true;
                hasMoved = false;
                startX = clientX;
                startY = clientY;
                
                const rect = container.getBoundingClientRect();
                initialRight = window.innerWidth - rect.right;
                initialBottom = window.innerHeight - rect.bottom;
                
                container.style.transition = 'none'; // 드래그 중 트랜지션 제거
            };

            const handleMove = (clientX, clientY) => {
                if (!isDragging) return;
                const dx = startX - clientX;
                const dy = startY - clientY;
                if (Math.abs(dx) > 5 || Math.abs(dy) > 5) hasMoved = true;
                container.style.right = `${initialRight + dx}px`;
                container.style.bottom = `${initialBottom + dy}px`;
            };

            const handleEnd = () => {
                if (!isDragging) return;
                isDragging = false;
                container.style.transition = ''; // 트랜지션 복구
                localStorage.setItem('gpsButtonPosition', JSON.stringify({ bottom: container.style.bottom, right: container.style.right }));
                
                if (!hasMoved) { // 클릭으로 간주
                    const newState = !this.state.isGpsAutoRecordEnabled;
                    this.actions.toggleGpsAutoRecord(null, { checked: newState });
                }
            };

            container.addEventListener('mousedown', e => handleStart(e.clientX, e.clientY));
            window.addEventListener('mousemove', e => handleMove(e.clientX, e.clientY));
            window.addEventListener('mouseup', handleEnd);
            container.addEventListener('touchstart', e => handleStart(e.touches[0].clientX, e.touches[0].clientY), { passive: false });
            window.addEventListener('touchmove', e => { if(isDragging) { e.preventDefault(); handleMove(e.touches[0].clientX, e.touches[0].clientY); } }, { passive: false });
            window.addEventListener('touchend', handleEnd);
        }

        // 상태에 따른 스타일 업데이트
        const isEnabled = this.state.isGpsAutoRecordEnabled;
        const statusText = container.querySelector('.status-text');
        container.classList.remove('bg-white', 'dark:bg-gray-800', 'text-gray-500', 'dark:text-gray-400', 'border-gray-200', 'dark:border-gray-600', 'bg-blue-600', 'text-white', 'border-blue-400', 'shadow-blue-500/50', 'shadow-xl');
        if (isEnabled) {
            container.classList.add('bg-blue-600', 'text-white', 'border-blue-400', 'shadow-blue-500/50');
            if (statusText) statusText.textContent = 'ON';
        } else {
            container.classList.add('bg-white', 'dark:bg-gray-800', 'text-gray-500', 'dark:text-gray-400', 'border-gray-200', 'dark:border-gray-600', 'shadow-xl');
            if (statusText) statusText.textContent = 'OFF';
        }
    },

    // 모달 업데이트
    updateModals() {
        const modalsContainer = document.getElementById('modals-container');
        if (modalsContainer) {
            modalsContainer.innerHTML = Modals.render();
        }
    },

    // 마지막 저장 시간 업데이트
    updateLastSaved() {
        const info = document.getElementById('last-saved-info');
        if (info && this.state.lastSaved) {
            info.textContent = this.state.lastSaved;
        }
    },

    // 코스 디스플레이 업데이트
    updateCourseDisplay() {
        const display = document.getElementById('course-name-display');
        if (display) {
            const rotations = this.getters.getRotationsForDay();
            const courseNames = rotations.map(r => r.course.name).filter(Boolean);
            
            if (courseNames.length === 0) {
                display.textContent = '스케줄 없음';
            } else if (courseNames.length === 1) {
                display.textContent = courseNames[0];
            } else {
                display.textContent = `${courseNames.length}회전`;
            }
        }
    },

    // 전체화면 버튼 업데이트
    updateFullscreenButton() {
        const isFullscreen = !!document.fullscreenElement;
        const toggleButton = document.getElementById('fullscreen-toggle');
        if (toggleButton) {
            toggleButton.textContent = isFullscreen ? '전체화면 종료' : '전체화면';
        }
    },

    // selected-date input 업데이트
    updateSelectedDateInput() {
        const dateInput = document.getElementById('selected-date');
        if (dateInput && dateInput.value !== this.state.selectedDate) {
            dateInput.value = this.state.selectedDate;
        }
    },

    // 스케줄 저장
    saveSchedule(isAutoSave = false) {
        if (this.state.viewMode === 'history') return;

        const data = {
            stops: this.state.editableStops.map(s => ({
                id: s.id,
                agencyId: s.agencyId,
                courseId: s.courseId,
                actualWorkTimeInSeconds: s.actualWorkTimeInSeconds,
                groupId: s.groupId // 경유지 그룹 ID 저장
            })),
            departureTimes: this.state.departureTimesByCourse,
            additionalMessages: this.state.additionalMessagesByCourse,
            courseCompletionStatus: this.state.courseCompletionStatus,
            selectedCourseOrder: this.state.selectedCourseOrder,
            lastModified: new Date().toISOString(), // 마지막 수정 시간 추가
            isCompleted: this.state.isCompleted,
            // _lastSavedEditableStopsSnapshot는 저장 시점에 업데이트되므로 여기에 포함하지 않습니다.
        };

        this.services.storage.saveSchedule(this.state.selectedDate, data);
        
        const saveType = isAutoSave ? '자동' : '수동';
        this.state.lastSaved = `${saveType} 저장: ${new Date().toLocaleTimeString('ko-KR')}`;
        this.updateLastSaved();

        // 자동 백업 트리거
        if (this.actions && this.actions.triggerAutoBackup) {
            this.actions.triggerAutoBackup('saveSchedule');
        }

        // 저장 후 현재 editableStops의 스냅샷을 저장하여 다음 debouncedSave에서 변경 여부 확인
        this.state._lastSavedEditableStopsSnapshot = JSON.parse(JSON.stringify(this.state.editableStops));

        // 스케줄이 변경되었으므로 히스토리도 업데이트해야 합니다.
        this.loadHistory();
        // 만약 현재 뷰가 히스토리 뷰라면 렌더링을 다시 합니다.
        if (this.state.viewMode === 'history') {
            this.render();
        }
        // 클라우드 동기화가 활성화된 경우 Supabase에도 저장
        if (this.state.isSupabaseEnabled && this.services.supabaseStorage && !this._isRealtimeUpdate) {
            this.services.supabaseStorage.saveSchedule(this.state.selectedDate, data)
                .then(() => console.log('☁️ 스케줄이 클라우드에 동기화되었습니다.'))
                .catch(err => console.error('클라우드 스케줄 동기화 실패:', err));
        }
    },

    // 디바운스된 저장
    debouncedSave() {
        if (this.state.viewMode === 'history' || 
            this.state.draggedStopId !== null || 
            this.state.isEditingLocked) return;

        // 실제 데이터 변경이 없는 경우 저장하지 않음
        if (JSON.stringify(this.state.editableStops) === JSON.stringify(this.state._lastSavedEditableStopsSnapshot)) {
            this.state.lastSaved = '변경사항 없음';
            this.updateLastSaved();
            return;
        }

        this.state.lastSaved = '변경사항 감지됨...';
        this.updateLastSaved();

        if (this.state.autoSaveTimer) {
            clearTimeout(this.state.autoSaveTimer);
        }

        this.state.autoSaveTimer = setTimeout(() => {
            this.saveSchedule(true);
        }, 1500);
    },

    // 디바운스된 렌더링
    debouncedRender() {
        if (this.state.autoRenderTimer) {
            clearTimeout(this.state.autoRenderTimer);
        }

        this.state.autoRenderTimer = setTimeout(() => {
            this.render();
        }, 1000);
    },

    // 날짜별 스케줄 로드
    loadScheduleForDate(date) {
        const dailySchedule = this.services.storage.loadScheduleForDate(date);
        
        if (dailySchedule) {
            this.state.editableStops = dailySchedule.stops.map(s => {
                let stop = { 
                    ...s, 
                    id: s.id ?? Helpers.generateId(),
                    actualWorkTimeInSeconds: s.actualWorkTimeInSeconds || null,
                    groupId: s.groupId || null // 그룹 ID 복원
                };
                
                // 이전 버전 호환성: courseId가 없는 경우 처리
                if (stop.courseId === undefined && stop.agencyId) {
                    const agency = this.state.cache.agenciesMap.get(stop.agencyId);
                    if (agency && agency.courseIds && agency.courseIds.length > 0) {
                        stop.courseId = agency.courseIds[0];
                    } else {
                        stop.courseId = null;
                    }
                }
                return stop;
            });
            
            this.state.additionalMessagesByCourse = dailySchedule.additionalMessages || {};
            this.state.courseCompletionStatus = dailySchedule.courseCompletionStatus || {};
            this.state.selectedCourseOrder = dailySchedule.selectedCourseOrder || [];
            this.state.isCompleted = dailySchedule.isCompleted || false;
            this.state.departureTimesByCourse = dailySchedule.departureTimes || {};
        } else {
            // 새 스케줄 초기화
            this.state.editableStops = [];
            this.state.departureTimesByCourse = {};
            this.state.additionalMessagesByCourse = {};
            this.state.courseCompletionStatus = {};
            this.state.selectedCourseOrder = [];
            this.state.isCompleted = false;
        }

        // 로드된 스케줄의 스냅샷을 저장하여 변경 감지 기준점으로 사용
        this.state._lastSavedEditableStopsSnapshot = JSON.parse(JSON.stringify(this.state.editableStops));
    },

    // 날짜 선택 및 스케줄 로드
    selectDateAndLoad(date) {
        this.state.selectedDate = date;
        this.loadScheduleForDate(date);
        this.state.lastSaved = null;
        
        // 편집 잠금 상태 확인
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selected = new Date(date);
        selected.setHours(0, 0, 0, 0);
        
        this.state.isEditingLocked = selected.getTime() < today.getTime() || this.state.isCompleted;

        // 보정 모드 상태 복원
        this.state.activeCorrectionCourseId = null;
        this.state.correctionStatesByCourse = {};
        
        // 경유지가 있을 때만 보정 모드 복원 (빈 스케줄에서 보정 모드 활성화 방지)
        if (this.state.editableStops.length > 0) {
            const savedCorrectionState = this.services.storage.loadCorrectionState(this.state.selectedDate);
            if (savedCorrectionState && !this.state.isEditingLocked) {
                // 미지정 코스(courseId === null)에서는 보정 모드 자동 복원 방지
                if (savedCorrectionState.courseId === null) {
                    this.services.storage.clearCorrectionState(this.state.selectedDate);
                    return;
                }
                
                // 코스가 실제로 존재하는지 확인
                if (!this.state.cache.coursesMap.has(savedCorrectionState.courseId)) {
                    this.services.storage.clearCorrectionState(this.state.selectedDate);
                    return;
                }
                
                // 유효한 기록이 있는지 확인 (실제로 기록된 시간이 있는 경우만 복원)
                const hasValidRecords = Object.values(savedCorrectionState.recordedTimes || {}).some(time => time && time > 0);
                
                if (hasValidRecords) {
                    const courseId = savedCorrectionState.courseId;
                    this.state.activeCorrectionCourseId = courseId;
                    this.state.correctionStatesByCourse[courseId] = savedCorrectionState;
                } else {
                    // 유효한 기록이 없으면 저장된 상태를 삭제하여 자동 활성화 방지
                    this.services.storage.clearCorrectionState(this.state.selectedDate);
                }
            }
        }

        this.debouncedSave();
        this.render();
    },

    // 히스토리 로드
    loadHistory() {
        const dates = this.services.storage.getSavedScheduleDates();
        this.state.historySchedules = dates.map(date => {
            const schedule = this.services.storage.loadScheduleForDate(date);
            if (!schedule || !schedule.stops) return null;

            const courseIdsInSchedule = new Set();
            const agenciesInSchedule = new Set();
            const memosInSchedule = new Set();
            const scheduleStops = schedule.stops.filter(s => s.agencyId);

            scheduleStops.forEach(stop => {
                const agency = this.state.cache.agenciesMap.get(stop.agencyId);
                if (agency) {
                    agenciesInSchedule.add(agency.name);
                    if (agency.memo) memosInSchedule.add(agency.memo);
                    
                    if (stop.courseId) {
                        courseIdsInSchedule.add(stop.courseId);
                        const course = this.state.cache.coursesMap.get(stop.courseId);
                        if (course && course.memo) memosInSchedule.add(course.memo);
                    }
                }
            });

            const courseNamesList = [...courseIdsInSchedule]
                .map(id => this.state.cache.coursesMap.get(id)?.name)
                .filter(Boolean);
            const courseNames = courseNamesList.length > 0 ? courseNamesList.join(', ') : '미지정';
            const agencyNames = [...agenciesInSchedule].join(', ');
            const allMemos = [...memosInSchedule].join(' ');
            const turnCount = courseIdsInSchedule.size;
            const isCompleted = schedule.isCompleted || false;

            // 거리 유형 계산
            let distanceType = this.calculations.calculateDistanceType(scheduleStops, courseIdsInSchedule, this.state.courses);

            return { 
                date, 
                agencyNames, 
                distanceType, 
                courseNames, 
                turnCount, 
                isCompleted,
                searchMetadata: `${date} ${agencyNames} ${courseNames} ${allMemos}`.toLowerCase()
            };
        }).filter(Boolean);
    },

    // 데이터 관리
    async saveSessionState() {
        try {
            await this.services.db.saveSessionState(this.state);
        } catch (error) {
            console.error('세션 상태 저장 실패:', error);
        }
    },

    // 알림 표시
    showNotification(message, type = 'info', duration = 10000) {
        showNotification(message, type, duration);
    },

    // 실시간 동기화 설정
    async setupRealtimeSync() {
        if (!isSupabaseConfigured()) return;

        try {
            const { SupabaseStorageService } = await import('./services/supabase-storage-service.js');
            this.supabaseStorage = new SupabaseStorageService();
            this.realtimeSubscriptions = [];

            // 스케줄 테이블 구독
            const scheduleSubscription = await this.supabaseStorage.subscribeToTable('schedules', (payload) => {
                this.handleRealtimeUpdate('schedules', payload);
            });
            if (scheduleSubscription) this.realtimeSubscriptions.push(scheduleSubscription);

            // 대리점 테이블 구독
            const agenciesSubscription = await this.supabaseStorage.subscribeToTable('agencies', (payload) => {
                this.handleRealtimeUpdate('agencies', payload);
            });
            if (agenciesSubscription) this.realtimeSubscriptions.push(agenciesSubscription);

            // 코스 테이블 구독
            const coursesSubscription = await this.supabaseStorage.subscribeToTable('courses', (payload) => {
                this.handleRealtimeUpdate('courses', payload);
            });
            if (coursesSubscription) this.realtimeSubscriptions.push(coursesSubscription);

            // 기사 테이블 구독
            const driversSubscription = await this.supabaseStorage.subscribeToTable('drivers', (payload) => {
                this.handleRealtimeUpdate('drivers', payload);
            });
            if (driversSubscription) this.realtimeSubscriptions.push(driversSubscription);

            // 차계부 테이블 구독
            const vehicleLogsSubscription = await this.supabaseStorage.subscribeToTable('vehicle_logs', (payload) => {
                this.handleRealtimeUpdate('vehicle_logs', payload);
            });
            if (vehicleLogsSubscription) this.realtimeSubscriptions.push(vehicleLogsSubscription);

            console.log('✅ 실시간 동기화 구독 설정 완료');
        } catch (error) {
            console.error('실시간 동기화 설정 실패:', error);
        }
    },

    // 실시간 업데이트 처리
    async handleRealtimeUpdate(tableName, payload) {
        console.log(`실시간 업데이트 감지: ${tableName}`, payload);

        // 실시간 업데이트가 감지되면 자동으로 데이터 로드
        this._isRealtimeUpdate = true; // 무한 루프 방지 플래그

        try {
            const supabaseStorage = this.services.supabaseStorage;

            switch (tableName) {
                case 'schedules':
                    if (payload.new && payload.new.date) {
                        const date = payload.new.date;
                        const newScheduleData = await supabaseStorage.loadScheduleForDate(date);
                        const localScheduleData = this.services.storage.loadScheduleForDate(date);

                        const newLastModified = newScheduleData.lastModified ? new Date(newScheduleData.lastModified).getTime() : 0;
                        const localLastModified = localScheduleData && localScheduleData.lastModified ? new Date(localScheduleData.lastModified).getTime() : 0;

                        if (newLastModified > localLastModified) {
                            this.services.storage.saveSchedule(date, newScheduleData);
                            if (this.state.selectedDate === date) {
                                this.loadScheduleForDate(date);
                                this.render();
                            }
                            console.log('✅ 스케줄 실시간 동기화 완료 (새로운 버전 적용):', date);
                        } else if (newLastModified < localLastModified) {
                            console.log('⚠️ 스케줄 실시간 동기화 충돌 (로컬 버전 유지):', date);
                            // 로컬 버전이 더 최신이므로 Supabase에 업데이트를 푸시할 수도 있지만,
                            // 실시간 업데이트는 주로 원격 변경 사항을 반영하는 데 중점을 둡니다.
                            // 여기서는 로컬 버전을 유지하고 아무것도 하지 않습니다.
                        } else if (newLastModified === 0 && localLastModified === 0 && newScheduleData.stops && newScheduleData.stops.length > 0) {
                            // 둘 다 타임스탬프가 없지만, 원격에 데이터가 있으면 적용 (하위 호환성)
                            this.services.storage.saveSchedule(date, newScheduleData);
                            if (this.state.selectedDate === date) {
                                this.loadScheduleForDate(date);
                                this.render();
                            }
                            console.log('✅ 스케줄 실시간 동기화 완료:', date);
                        }
                    }
                    break;
                case 'agencies':
                    const agencies = await supabaseStorage.loadAgencies();
                    if (agencies && agencies.length > 0) {
                        this.services.storage.saveAgencies(agencies);
                        this.state.agencies = agencies;
                        this.buildCache();
                        this.render();
                        console.log('✅ 대리점 실시간 동기화 완료');
                    }
                    break;
                case 'courses':
                    const courses = await supabaseStorage.loadCourses();
                    if (courses && courses.length > 0) {
                        this.services.storage.saveCourses(courses);
                        this.state.courses = courses;
                        this.buildCache();
                        this.render();
                        console.log('✅ 코스 실시간 동기화 완료');
                    }
                    break;
                case 'drivers':
                    const drivers = await supabaseStorage.loadDrivers();
                    if (drivers && drivers.length > 0) {
                        this.services.storage.saveDrivers(drivers);
                        this.state.drivers = drivers;
                        this.render();
                        console.log('✅ 기사 실시간 동기화 완료');
                    }
                    break;
                case 'vehicle_logs':
                    const vehicleLog = await supabaseStorage.loadVehicleLog();
                    if (vehicleLog) {
                        this.services.storage.saveVehicleLog(vehicleLog);
                        // Deep merge to preserve default structure
                        this.state.vehicleLog = {
                            ...this.state.vehicleLog,
                            ...vehicleLog,
                            mileage: vehicleLog.mileage || this.state.vehicleLog.mileage,
                            maintenance: vehicleLog.maintenance || this.state.vehicleLog.maintenance,
                            settings: {
                                ...this.state.vehicleLog.settings,
                                ...(vehicleLog.settings || {}),
                                maintenanceIntervals: {
                                    ...this.state.vehicleLog.settings.maintenanceIntervals,
                                    ...(vehicleLog.settings?.maintenanceIntervals || {})
                                },
                                customCategories: vehicleLog.settings?.customCategories || []
                            }
                        };
                        this.render();
                        console.log('✅ 차계부 실시간 동기화 완료');
                    }
                    break;
            }
        } catch (error) {
            console.error('실시간 동기화 실패:', error);
        } finally {
            // 플래그 초기화 (약간의 지연 후)
            setTimeout(() => {
                this._isRealtimeUpdate = false;
            }, 100);
        }
    },

    // 실시간 구독 해제
    cleanupRealtimeSync() {
        if (this.realtimeSubscriptions) {
            this.realtimeSubscriptions.forEach(subscription => {
                if (subscription && getSupabaseClient()) { // Ensure getSupabaseClient is imported and returns a client
                    getSupabaseClient().removeChannel(subscription); // Use the imported getSupabaseClient
                }
            });
            this.realtimeSubscriptions = [];
        }
    },

    // Supabase에서 데이터 로드
    async loadFromSupabase(forceLoadAll = false) {
        this.showLoadingOverlay('클라우드 데이터 동기화 중...');
        try {
            const supabaseStorage = this.services.supabaseStorage;
            console.log('📥 Supabase에서 데이터 로드 시작...');

            // 대리점 데이터 로드
            const agencies = await supabaseStorage.loadAgencies();
            if (agencies && agencies.length > 0) {
                this.showLoadingOverlay('대리점 정보 동기화...');
                this.services.storage.saveAgencies(agencies);
                this.state.agencies = agencies;
                console.log('✅ 대리점 데이터 로드 완료:', agencies.length, '개');
            }

            // 코스 데이터 로드
            const courses = await supabaseStorage.loadCourses();
            if (courses && courses.length > 0) {
                this.showLoadingOverlay('코스 정보 동기화...');
                this.services.storage.saveCourses(courses);
                this.state.courses = courses;
                console.log('✅ 코스 데이터 로드 완료:', courses.length, '개');
            }

            // 기사 데이터 로드
            const drivers = await supabaseStorage.loadDrivers();
            if (drivers && drivers.length > 0) {
                this.showLoadingOverlay('기사 정보 동기화...');
                this.services.storage.saveDrivers(drivers);
                this.state.drivers = drivers;
                console.log('✅ 기사 데이터 로드 완료:', drivers.length, '개');
            }

            // 차계부 데이터 로드
            const vehicleLog = await supabaseStorage.loadVehicleLog();
            if (vehicleLog) {
                this.showLoadingOverlay('차계부 정보 동기화...');
                this.services.storage.saveVehicleLog(vehicleLog);
                console.log('✅ 차계부 데이터 로드 완료');
            }

            // 설정 데이터 로드
            const settings = await supabaseStorage.loadSettings('app_settings');
            if (settings) {
                this.showLoadingOverlay('앱 설정 동기화...');
                // 설정 적용
                if (settings.columnWidths) {
                    this.state.columnWidths = { ...this.state.columnWidths, ...settings.columnWidths };
                    this.services.storage.saveColumnWidths(settings.columnWidths);
                }
                if (settings.showMessageArrivalTime !== undefined) {
                    this.state.showMessageArrivalTime = settings.showMessageArrivalTime;
                    this.services.storage.saveShowMessageArrivalTime(settings.showMessageArrivalTime);
                }
                if (settings.preferredNavApp) {
                    this.state.preferredNavApp = settings.preferredNavApp;
                    this.services.storage.savePreferredNavApp(settings.preferredNavApp);
                }
                if (settings.driverName) {
                    this.state.driverName = settings.driverName;
                    this.services.storage.saveDriverName(settings.driverName);
                }
                if (settings.messageFontSize) {
                    this.state.messageFontSize = settings.messageFontSize;
                    this.services.storage.saveMessageFontSize(settings.messageFontSize);
                }
                if (settings.googleMapsApiKey) {
                    this.state.googleMapsApiKey = settings.googleMapsApiKey;
                    this.services.storage.saveGoogleMapsApiKey(settings.googleMapsApiKey);
                }
                if (settings.globalFontSize) {
                    this.state.globalFontSize = settings.globalFontSize;
                    this.services.storage.saveGlobalFontSize(settings.globalFontSize);
                }
                if (settings.isAutoSmsOnDepartureEnabled !== undefined) {
                    this.state.isAutoSmsOnDepartureEnabled = settings.isAutoSmsOnDepartureEnabled;
                    this.services.storage.saveAutoSmsOnDepartureEnabled(settings.isAutoSmsOnDepartureEnabled);
                }
                if (settings.isAutoBackupEnabled !== undefined) {
                    this.state.isAutoBackupEnabled = settings.isAutoBackupEnabled;
                }
                if (settings.autoBackupTrigger) {
                    this.state.autoBackupTrigger = settings.autoBackupTrigger;
                }
                if (settings.lastAutoBackupDate) {
                    this.state.lastAutoBackupDate = settings.lastAutoBackupDate;
                }
                if (settings.theme) {
                    this.state.theme = settings.theme;
                    this.services.storage.saveTheme(settings.theme);
                    this.applyTheme(settings.theme);
                }
                if (settings.travelTimes) {
                    this.services.storage.saveTravelTimes(settings.travelTimes);
                    this.state.travelTimes = settings.travelTimes;
                }
                if (settings.alwaysSendSms !== undefined) {
                    this.services.storage.setAlwaysSendSms(settings.alwaysSendSms);
                }
                if (settings.isGpsAutoRecordEnabled !== undefined) {
                    this.state.isGpsAutoRecordEnabled = settings.isGpsAutoRecordEnabled;
                    this.services.storage.saveGpsAutoRecordEnabled(settings.isGpsAutoRecordEnabled);
                }
                console.log('✅ 설정 데이터 로드 완료');
            }

            // 스케줄 데이터 로드
            // 로컬에 스케줄 데이터가 거의 없으면(새로운 단말기), 모든 데이터 로드
            const localScheduleCount = this.services.storage.getSavedScheduleDates().length;
            const loadAllData = forceLoadAll || localScheduleCount < 5; // 강제 로드 또는 로컬에 5개 미만이면 새로운 단말기로 간주

            if (loadAllData) {
                this.showLoadingOverlay('전체 스케줄 동기화...');
                console.log('📥', forceLoadAll ? '강제 모드' : '새로운 단말기 감지', '- 모든 스케줄 데이터 로드');
                const allDates = await supabaseStorage.getSavedScheduleDates();
                for (const dateStr of allDates) {
                    const scheduleData = await supabaseStorage.loadScheduleForDate(dateStr);
                    const localScheduleData = this.services.storage.loadScheduleForDate(dateStr);

                    if (scheduleData && (scheduleData.stops || scheduleData.length > 0)) { // Supabase에 데이터가 있는 경우
                        const supabaseLastModified = scheduleData.lastModified ? new Date(scheduleData.lastModified).getTime() : 0;
                        const localLastModified = localScheduleData && localScheduleData.lastModified ? new Date(localScheduleData.lastModified).getTime() : 0;

                    // 로컬 데이터가 없거나(새로 복원), 원격 데이터가 더 최신일 경우 덮어쓰기
                    if (!localScheduleData || supabaseLastModified > localLastModified) {
                            this.services.storage.saveSchedule(dateStr, scheduleData);
                        const reason = !localScheduleData ? '새로운 데이터 복원' : '최신 버전 적용';
                        console.log(`✅ Supabase 스케줄 로드 (${reason}): ${dateStr}`);
                        } else if (supabaseLastModified < localLastModified) {
                            console.log(`⚠️ Supabase 스케줄 로드 충돌 (로컬 버전 유지): ${dateStr}`);
                            // 로컬 버전이 더 최신이므로 Supabase에 업데이트를 푸시할 수도 있습니다.
                        } // else if (timestamps are equal or both missing), no overwrite if local has data.
                    }
                }
                console.log('✅ 스케줄 데이터 로드 완료 (전체):', allDates.length, '개');
            } else {
                this.showLoadingOverlay('최근 스케줄 동기화...');
                console.log('📥 기존 단말기 - 최근 30일 스케줄 데이터 로드');
                const today = new Date();
                for (let i = 0; i < 30; i++) {
                    const date = new Date(today);
                    date.setDate(today.getDate() - i);
                    const dateStr = date.toISOString().split('T')[0];

                    const scheduleData = await supabaseStorage.loadScheduleForDate(dateStr);
                    if (scheduleData && (scheduleData.stops || scheduleData.length > 0)) {
                        this.services.storage.saveSchedule(dateStr, scheduleData);
                    }
                }
                console.log('✅ 스케줄 데이터 로드 완료 (최근 30일)');
            }

            // 캐시 재구축
            this.buildCache();
            console.log('✅ 캐시 재구축 완료');

            // 현재 선택된 날짜의 스케줄 다시 로드
            if (this.state.selectedDate) {
                this.loadScheduleForDate(this.state.selectedDate);
                console.log('✅ 현재 날짜 스케줄 로드 완료:', this.state.selectedDate);
            }

            console.log('📥 Supabase 데이터 로드 완료');
        } catch (error) {
            console.error('❌ Supabase 데이터 로드 실패:', error);
            showNotification('클라우드 데이터 로드에 실패했습니다.', 'error');
        } finally {
            this.hideLoadingOverlay();
        }
    },

    // 업데이터 함수들
    updaters: {
        updateSchedule() {
            if (App.state.viewMode === 'schedule') {
                App.render();
            }
        },

        updateSettingsContent() {
            if (App.state.viewMode === 'settings') {
                App.render();
            }
        },

        updateMessagePreview() {
            MessagePreview.update();
        },
    },

    getAgencyModalListContent() {
        const query = this.state.agencySelectorSearchQuery || '';
        const availableAgencies = this.state.agencies.filter(a => !a.isDeleted);
        const filteredAgencies = query ? 
            availableAgencies.filter(a => this.utils.matchText(a.name, query)) : 
            availableAgencies;

        const agenciesList = filteredAgencies
            .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99) || a.name.localeCompare(b.name, 'ko-KR'))
            .map(agency => `
                <button data-action="select-agency-from-modal" 
                        data-agency-id="${agency.id}" 
                        class="block w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-700 rounded min-h-[44px] touch-manipulation">
                    ${agency.name}
                </button>
            `).join('');

        return `
            <button data-action="select-agency-from-modal" 
                    data-agency-id="" 
                    class="block w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-700 rounded">
                - 대리점 선택 해제 -
            </button>
            ${filteredAgencies.length > 0 ? agenciesList : '<div class="px-3 py-2 text-sm text-gray-500">결과 없음</div>'}
        `;
    }
};

// 디버깅 및 레거시 접근을 위해 window 객체에도 할당
window.App = App;