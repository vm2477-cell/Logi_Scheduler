// 애플리케이션 상태 관리
import { GOOGLE_MAPS_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, VWORLD_API_KEY } from './config.js';
import { versionManager } from './utils/version-manager.js';

// 기본 정비 항목 카테고리
export const DEFAULT_MAINTENANCE_CATEGORIES = [
    '엔진오일', '타이어',
    '브레이크액', '배터리', '에어컨 필터', '부동액', '미션오일', '데프 오일'
];
export const AppState = {
    // 앱 버전
    appVersion: null, // 앱 초기화 시 versionManager에서 설정
    // 뷰 상태
    viewMode: 'schedule',
    theme: 'light',
    activeTab: 'agencies',
    selectedDate: '',
    
    // 네트워크 상태
    isOnline: navigator.onLine,
    
    // 스케줄 데이터
    editableStops: [],
    lastSaved: null,
    isEditingLocked: false,
    isCompleted: false,
    departureTimesByCourse: {},
    
    // 메시지 관련
    driverName: '',
    additionalMessagesByCourse: {},
    selectedMessageCourseId: null,
    messagePreviewFilterCourseId: null,
    showMessageArrivalTime: true,
    messageFontSize: 100,
    
    // UI 상태
    columnWidths: {
        group: 40,
        agency: 200,
        travelTime: 80,
        arrivalTime: 80,
        workTime: 80,
        departureTime: 80,
        priority: 40,
        actions: 120
    },
    
    // 코스 관리
    courseCompletionStatus: {},
    isCourseManagerOpen: false,
    courseManagerSearchQuery: '',
    selectedCourseOrder: [],
    
    // 검색 상태
    agencyCourseSearchQuery: '',
    agencySettingsSearchQuery: '',
    agencySelectorSearchQuery: '',
    courseSettingsSearchQuery: '',
    agencyEditModalSearchQuery: '',
    
    // 필터 상태
    isAgencyCourseFilterOpen: false,
    agencyCourseFilterSearchQuery: '',
    agencySettingsCourseFilterId: 'all',

    // 글꼴 크기
    globalFontSize: 100,
    
    // Supabase 클라우드 동기화
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY,
    isSupabaseEnabled: false,
    
    // 드래그 앤 드롭
    draggedStopId: null,
    selectedStopsForGrouping: new Set(), // 경유지 묶기를 위해 선택된 경유지 ID들
    
    // 컬럼 리사이즈
    isResizing: false,
    resizingStartX: 0,
    resizingInitialWidth: 0,
    resizingColumn: null,
    
    // 모달 상태
    showConfirmationModal: false,
    showDeleteAgencyModal: false,
    showDeleteCourseModal: false,
    showDeleteDriverModal: false,
    showLoadScheduleModal: false,
    showSendSmsConfirmationModal: false,
    showApplyCameraDataModal: false,
    showDirectionsModal: false,
    showCompleteScheduleModal: false,
    showMemoModal: false,
    showAddAgencyModal: false,
    showDeleteHistoryModal: false,
    showReleaseNotesModal: false,
    showImageViewerModal: false,
    showRestoreModal: false,
    showSendDepartureSmsModal: false,
    showAgencyEditModal: false,
    showGroupModal: false,
    showAdminPasswordModal: false,
    
    showHardReloadModal: false,
    // 모달 데이터
    directionsInfo: null,
    agencyToDelete: null,
    courseToDelete: null,
    driverToDelete: null,
    agencyToEdit: null,
    isGpsAutoRecordEnabled: false,
    isAutoSmsOnDepartureEnabled: false,
    dateToLoad: null,
    fileToRestore: null,
    cameraDataToApply: null,
    memoModalData: null,
    historyDateToDelete: null,
    departureSmsData: null,
    departureSmsMessage: null,
    correctionData: null,
    imageViewerSrc: null,
    
    // 알림
    notification: null,
    notificationTimer: null,
    
    // Supabase 인증
    currentUser: null, // 현재 로그인된 사용자 정보
    
    // 보정 모드
    activeCorrectionCourseId: null, // 현재 활성화된 보정 모드의 코스 ID
    correctionStatesByCourse: {},   // 현재 선택된 날짜의 코스별 보정 상태 { courseId: state }
    gpsWatcherId: null,
    wakeLockSentinel: null,
    geofenceStatus: {}, // { [agencyId]: 'inside' | 'outside' }
    lastActionTime: {}, // { [agencyId]: { time: Date.now(), type: 'arrive'|'depart' } }
    
    // 설정 데이터
    agencies: [],
    courses: [],
    drivers: [],
    editingAgencyId: null,
    editingAgencyData: null,
    editingCourseId: null,
    editingCourseData: null,
    editingDriverId: null,
    editingDriverData: null,
    editingMileageId: null,
    editingMileageData: null,
    editingMaintenanceId: null,
    editingMaintenanceData: null,
    travelTimes: {},
    agencySort: { key: 'name', order: 'asc' },
    courseSort: { key: 'name', order: 'asc' },
    analysisDirHandle: null,
    analysisDirPath: '',
    preferredNavApp: '',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    vworldApiKey: VWORLD_API_KEY,
    
    // 히스토리
    historySchedules: [],
    historySearchQuery: '',
    historySelectedMonth: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    pendingCorrectionDates: new Set(),
    
    // 차계부
    vehicleLog: {
        mileage: [],
        maintenance: [],
        // 정비 주기 설정 (km)
        settings: {
            maintenanceIntervals: {
                '엔진오일': { km: 10000, months: 12 },
                '타이어': { km: 50000, months: 36 },
                '브레이크액': { km: 40000, months: 24 },
                '에어컨 필터': { km: 15000, months: 6 },
                '부동액': { km: 100000, months: 24 },
                '미션오일': { km: 80000, months: 48 },
                '데프 오일': { km: 100000, months: 48 }
            },
            customCategories: [],
        },
    },
    selectedMaintenanceFilter: '', // 정비 기록 필터링을 위한 선택된 항목
    selectedVehicleLogMonth: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    vehicleLogSelectedYear: new Date().getFullYear(), // 차계부 년도 필터
    vehicleLogFilterMode: 'month', // 차계부 필터 모드: 'month', 'year', 'month-picker', 'year-picker'
    showVehicleLogMonthFilterModal: false, // 차계부 월 필터 모달 표시 여부
    showVehicleLogMonthPickerModal: false, // 차계부 월 선택기 모달 표시 여부
    showVehicleLogYearPickerModal: false, // 차계부 년 선택기 모달 표시 여부
    isMaintenanceIntervalsCollapsed: false, // 정비 주기 설정 섹션 접기/펼치기 상태
    // 차계부 정비 항목 카테고리
    maintenanceCategories: [...DEFAULT_MAINTENANCE_CATEGORIES, '기타'],
    
    // 캐시
    cache: {
        agenciesMap: new Map(),
        coursesMap: new Map(),
    },
    
    // 모바일 감지
    isMobile: false,
    
    // 자동 저장 타이머
    autoSaveTimer: null,
    autoRenderTimer: null,
    autoSaveSessionTimer: null,
    _lastSavedEditableStopsSnapshot: null, // 마지막으로 저장된 editableStops의 스냅샷
    
    // 자동 백업
    isAutoBackupEnabled: false,
    autoBackupTrigger: 'daily', // 'daily', 'onComplete', 'onSave'
    lastAutoBackupDate: null,
    autoBackupTimer: null,

    // 관리자 모드
    isAdminMode: false,
    adminModeClickCount: 0, // 앱 버전 클릭 카운터
    adminModeClickTimeout: null, // 클릭 타임아웃

    _maintenanceAlertsShown: false, // 정비 알림 중복 표시 방지 플래그
};