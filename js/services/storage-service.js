// 로컬 스토리지 기반 데이터 서비스
import { isSupabaseConfigured } from '../supabase.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';

export class StorageService {
    constructor(prefix = 'logistics_') {
        this.prefix = prefix;
        this.schedulePrefix = 'schedule_';
    }

    // JSON 데이터 저장/로드 헬퍼 메서드
    _saveJSON(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    _loadJSON(key, defaultValue) {
        const data = localStorage.getItem(key);
        try {
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error("Failed to parse JSON from localStorage for key:", key, e);
            return defaultValue;
        }
    }

    // Supabase 동기화 헬퍼 메서드 (중복 로직 제거)
    async _syncToSupabase(syncMethod, ...args) {
        // 실시간 업데이트로 인한 저장이면 Supabase에 저장하지 않음 (무한 루프 방지)
        if (window.App && window.App._isRealtimeUpdate) {
            console.log('실시간 업데이트로 인한 저장 - Supabase 저장 스킵');
            return;
        }

        // Supabase 동기화가 활성화되어 있으면 Supabase에도 저장
        if (isSupabaseConfigured()) {
            try {
                const { SupabaseStorageService } = await import('./supabase-storage-service.js');
                const supabaseStorage = new SupabaseStorageService();
                await supabaseStorage[syncMethod](...args);
            } catch (error) {
                console.error(`Supabase ${syncMethod} 실패:`, error);
            }
        }
    }

    _saveString(key, value) {
        localStorage.setItem(key, value);
    }

    _loadString(key, defaultValue) {
        return localStorage.getItem(key) || defaultValue;
    }

    // 스케줄 관련 메서드
    async saveSchedule(date, data) {
        this._saveJSON(`${this.schedulePrefix}${date}`, data);
        await this._syncToSupabase('saveSchedule', date, data);
    }

    loadScheduleForDate(date) {
        return this._loadJSON(`${this.schedulePrefix}${date}`, null);
    }

    getSavedScheduleDates() {
        return Object.keys(localStorage)
            .filter(key => key.startsWith(this.schedulePrefix))
            .map(key => key.substring(this.schedulePrefix.length))
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    }

    async deleteSchedule(date) {
        localStorage.removeItem(`${this.schedulePrefix}${date}`);
        await this._syncToSupabase('deleteSchedule', date);
    }

    // 설정 데이터 관련 메서드
    async saveAgencies(agencies) {
        this._saveJSON(`${this.prefix}agencies`, agencies);
        await this._syncToSupabase('saveAgencies', agencies);
    }

    loadAgencies() {
        return this._loadJSON(`${this.prefix}agencies`, []);
    }

    async saveCourses(courses) {
        this._saveJSON(`${this.prefix}courses`, courses);
        await this._syncToSupabase('saveCourses', courses);
    }

    loadCourses() {
        return this._loadJSON(`${this.prefix}courses`, []);
    }

    async saveDrivers(drivers) {
        this._saveJSON(`${this.prefix}drivers`, drivers);
        await this._syncToSupabase('saveDrivers', drivers);
    }

    loadDrivers() {
        return this._loadJSON(`${this.prefix}drivers`, []);
    }

    saveTravelTimes(times) {
        this._saveJSON(`${this.prefix}travelTimes`, times);
    }

    loadTravelTimes() {
        return this._loadJSON(`${this.prefix}travelTimes`, {});
    }

    // UI 설정
    saveColumnWidths(widths) {
        this._saveJSON(`${this.prefix}columnWidths`, widths);
    }

    loadColumnWidths() {
        return this._loadJSON(`${this.prefix}columnWidths`, null);
    }

    saveShowMessageArrivalTime(show) {
        this._saveJSON(`${this.prefix}showMessageArrivalTime`, show);
    }

    loadShowMessageArrivalTime() {
        return this._loadJSON(`${this.prefix}showMessageArrivalTime`, true);
    }

    // 차계부
    async saveVehicleLog(logData) {
        this._saveJSON(`${this.prefix}vehicleLog`, logData);
        await this._syncToSupabase('saveVehicleLog', logData);
    }

    loadVehicleLog() {
        return this._loadJSON(`${this.prefix}vehicleLog`, null);
    }

    // 기타 설정
    savePreferredNavApp(app) {
        this._saveString(`${this.prefix}preferredNavApp`, app);
    }

    loadPreferredNavApp() {
        return this._loadString(`${this.prefix}preferredNavApp`, '');
    }

    saveTheme(theme) {
        this._saveString(`${this.prefix}theme`, theme);
    }

    loadTheme() {
        return this._loadString(`${this.prefix}theme`, null);
    }

    saveDriverName(name) {
        this._saveString(`${this.prefix}driverName`, name);
    }

    loadDriverName() {
        return this._loadString(`${this.prefix}driverName`, '');
    }

    saveMessageFontSize(size) {
        this._saveString(`${this.prefix}messageFontSize`, size);
        // Supabase 동기화가 활성화되어 있으면 Supabase에도 저장
        if (isSupabaseConfigured()) {
            try {
                // _isRealtimeUpdate 플래그는 실시간 업데이트로 인한 저장을 방지하는 용도
                // 여기서는 사용자 액션에 의한 저장으로 간주하여 Supabase에 푸시
                import('./supabase-storage-service.js').then(({ SupabaseStorageService }) => {
                    const supabaseStorage = new SupabaseStorageService();
                    supabaseStorage.updateAppSettings({ messageFontSize: parseInt(size, 10) });
                });
            } catch (error) {
                console.error('Supabase messageFontSize 저장 실패:', error);
            }
        }
    }

    loadMessageFontSize() {
        return this._loadString(`${this.prefix}messageFontSize`, '100');
    }

    saveGlobalFontSize(size) {
        this._saveString(`${this.prefix}globalFontSize`, size);
        // Supabase 동기화가 활성화되어 있으면 Supabase에도 저장
        if (isSupabaseConfigured()) {
            try {
                // _isRealtimeUpdate 플래그는 실시간 업데이트로 인한 저장을 방지하는 용도
                // 여기서는 사용자 액션에 의한 저장으로 간주하여 Supabase에 푸시
                import('./supabase-storage-service.js').then(({ SupabaseStorageService }) => {
                    const supabaseStorage = new SupabaseStorageService();
                    supabaseStorage.updateAppSettings({ globalFontSize: size }); // size는 이미 숫자
                });
            } catch (error) {
                console.error('Supabase globalFontSize 저장 실패:', error);
            }
        }
    }

    loadGlobalFontSize() {
        return this._loadString(`${this.prefix}globalFontSize`, '100');
    }

    getAlwaysSendSms() {
        return this._loadJSON(`${this.prefix}alwaysSendSms`, false);
    }

    setAlwaysSendSms(value) {
        this._saveJSON(`${this.prefix}alwaysSendSms`, value);
    }

    saveAutoBackupSettings(settings) {
        this._saveJSON(`${this.prefix}autoBackupSettings`, settings);
    }

    loadAutoBackupSettings() {
        return this._loadJSON(`${this.prefix}autoBackupSettings`, {
            enabled: false,
            trigger: 'daily',
            lastDate: null
        });
    }

    saveGoogleMapsApiKey(key) {
        this._saveString(`${this.prefix}googleMapsApiKey`, key);
    }

    loadGoogleMapsApiKey() {
        return this._loadString(`${this.prefix}googleMapsApiKey`, null);
    }

    saveGpsAutoRecordEnabled(enabled) {
        this._saveJSON(`${this.prefix}gpsAutoRecordEnabled`, enabled);
    }

    loadGpsAutoRecordEnabled() {
        return this._loadJSON(`${this.prefix}gpsAutoRecordEnabled`, true);
    }

    // 출발 시 자동 문자 발송 설정 저장
    saveAutoSmsOnDepartureEnabled(enabled) {
        this._saveJSON(`${this.prefix}autoSmsOnDepartureEnabled`, enabled);
    }

    // 출발 시 자동 문자 발송 설정 로드
    loadAutoSmsOnDepartureEnabled() {
        return this._loadJSON(`${this.prefix}autoSmsOnDepartureEnabled`, true);
    }

    // 보정 상태
    saveCorrectionState(date, state) {
        this._saveJSON(`${this.prefix}correction_${date}`, state);
    }

    loadCorrectionState(date) {
        return this._loadJSON(`${this.prefix}correction_${date}`, null);
    }

    clearCorrectionState(date) {
        localStorage.removeItem(`${this.prefix}correction_${date}`);
    }

    getDatesWithPendingCorrections() {
        const correctionPrefix = `${this.prefix}correction_`;
        return Object.keys(localStorage)
            .filter(key => key.startsWith(correctionPrefix))
            .map(key => key.substring(correctionPrefix.length));
    }

    // Supabase 관련 설정 저장/로드
    saveSupabaseUrl(url) {
        this._saveString(`${this.prefix}supabaseUrl`, url);
    }

    loadSupabaseUrl() {
        return this._loadString(`${this.prefix}supabaseUrl`, SUPABASE_URL);
    }

    saveSupabaseAnonKey(key) {
        this._saveString(`${this.prefix}supabaseAnonKey`, key);
    }

    loadSupabaseAnonKey() {
        return this._loadString(`${this.prefix}supabaseAnonKey`, SUPABASE_ANON_KEY);
    }

    saveSupabaseEnabled(enabled) {
        this._saveJSON(`${this.prefix}supabaseEnabled`, enabled);
    }

    loadSupabaseEnabled() {
        return this._loadJSON(`${this.prefix}supabaseEnabled`, false);
    }
}