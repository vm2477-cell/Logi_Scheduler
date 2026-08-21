// Supabase 기반 데이터 서비스
// 전역 함수 사용 (window.isSupabaseConfigured, window.getSupabaseClient)

import * as Supabase from '../supabase.js';

export class SupabaseStorageService {
    constructor() {
        this.currentRevisionId = null;
    }

    // 개정(revision) 관련 메서드
    async createRevision(name, description) {
        if (!Supabase.isSupabaseConfigured()) return null;

        // 현재 사용자 ID 확인
        const currentUser = await Supabase.supabaseAuth.getCurrentUser();
        if (!currentUser) { // Use the imported supabaseAuth
            console.error('로그인된 사용자가 없습니다.');
            return null;
        }

        const supabase = Supabase.getSupabaseClient();
        const { data, error } = await supabase
            .from('revisions')
            .insert({
                name,
                description,
                user_id: currentUser.id
            })
            .select()
            .single();

        if (error) {
            console.error('개정 생성 실패:', error);
            return null;
        }

        return data;
    }

    async loadRevisions() {
        if (!Supabase.isSupabaseConfigured()) return [];

        // 현재 사용자 ID 확인
        const currentUser = await Supabase.supabaseAuth.getCurrentUser();
        if (!currentUser) { // Use the imported supabaseAuth
            console.error('로그인된 사용자가 없습니다.');
            return [];
        }

        const supabase = Supabase.getSupabaseClient();
        const { data, error } = await supabase
            .from('revisions')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('개정 목록 로드 실패:', error);
            return [];
        }

        return data || [];
    }

    async setActiveRevision(revisionId) {
        if (!Supabase.isSupabaseConfigured()) return false;

        const supabase = Supabase.getSupabaseClient();
        // 모든 개정 비활성화
        await supabase
            .from('revisions')
            .update({ is_active: false })
            .neq('id', revisionId);

        // 선택한 개정 활성화
        const { error } = await supabase
            .from('revisions')
            .update({ is_active: true })
            .eq('id', revisionId);

        if (error) {
            console.error('개정 활성화 실패:', error);
            return false;
        }

        this.currentRevisionId = revisionId;
        return true;
    }

    async getActiveRevision() {
        if (!Supabase.isSupabaseConfigured()) return null;

        // 현재 사용자 ID 확인
        const currentUser = await Supabase.supabaseAuth.getCurrentUser();
        if (!currentUser) { // Use the imported supabaseAuth
            console.error('로그인된 사용자가 없습니다.');
            return null;
        }

        const supabase = Supabase.getSupabaseClient();
        const { data, error } = await supabase
            .from('revisions')
            .select('*')
            .eq('is_active', true)
            .eq('user_id', currentUser.id)
            .maybeSingle();

        if (error) {
            console.error('활성 개정 로드 실패:', error);
            return null;
        }

        this.currentRevisionId = data?.id;
        return data;
    }

    // 스케줄 관련 메서드
    async saveSchedule(date, data) {
        if (!Supabase.isSupabaseConfigured()) return false;

        const revisionId = this.currentRevisionId || await this.getActiveRevisionId();
        if (!revisionId) {
            console.error('활성 개정이 없습니다.');
            return false;
        }

        const timestamp = new Date().toISOString();
        const syncPayload = {
            ...(data || {}),
            device_id: globalThis.__logisticsDeviceId || localStorage.getItem('logistics_device_id') || null,
            deviceId: globalThis.__logisticsDeviceId || localStorage.getItem('logistics_device_id') || null,
            updated_at: timestamp,
            updatedAt: timestamp
        };

        const supabase = Supabase.getSupabaseClient();
        const { error } = await supabase
            .from('schedules')
            .upsert({
                revision_id: revisionId,
                date,
                data: syncPayload,
                updated_at: syncPayload.updated_at
            }, {
                onConflict: 'revision_id,date'
            });

        if (error) {
            console.error('스케줄 저장 실패:', error);
            return false;
        }

        return true;
    }

    async loadScheduleForDate(date) {
        if (!Supabase.isSupabaseConfigured()) return null;

        const revisionId = this.currentRevisionId || await this.getActiveRevisionId();
        if (!revisionId) return null;

        const supabase = Supabase.getSupabaseClient();
        const { data, error } = await supabase
            .from('schedules')
            .select('data')
            .eq('revision_id', revisionId)
            .eq('date', date)
            .maybeSingle();

        if (error) {
            console.error('스케줄 로드 실패:', error);
            return null;
        }

        return data?.data;
    }

    async getSavedScheduleDates() {
        if (!Supabase.isSupabaseConfigured()) return [];

        const revisionId = this.currentRevisionId || await this.getActiveRevisionId();
        if (!revisionId) return [];

        const supabase = Supabase.getSupabaseClient();
        const { data, error } = await supabase
            .from('schedules')
            .select('date')
            .eq('revision_id', revisionId)
            .order('date', { ascending: false });

        if (error) {
            console.error('저장된 날짜 로드 실패:', error);
            return [];
        }

        return data?.map(s => s.date) || [];
    }

    async deleteSchedule(date) {
        if (!Supabase.isSupabaseConfigured()) return false;

        const revisionId = this.currentRevisionId || await this.getActiveRevisionId();
        if (!revisionId) return false;

        const supabase = Supabase.getSupabaseClient();
        const { error } = await supabase
            .from('schedules')
            .delete()
            .eq('revision_id', revisionId)
            .eq('date', date);

        if (error) {
            console.error('스케줄 삭제 실패:', error);
            return false;
        }

        return true;
    }

    // 대리점 관련 메서드
    async saveAgencies(agencies) {
        if (!Supabase.isSupabaseConfigured()) return false;

        const revisionId = this.currentRevisionId || await this.getActiveRevisionId();
        if (!revisionId) return false;

        const supabase = Supabase.getSupabaseClient();
        const { error } = await supabase
            .from('agencies')
            .upsert({
                revision_id: revisionId,
                data: agencies
            }, {
                onConflict: 'revision_id'
            });

        if (error) {
            console.error('대리점 저장 실패:', error);
            return false;
        }

        return true;
    }

    async loadAgencies() {
        if (!Supabase.isSupabaseConfigured()) return [];

        const revisionId = this.currentRevisionId || await this.getActiveRevisionId();
        if (!revisionId) return [];

        const supabase = Supabase.getSupabaseClient();
        const { data, error } = await supabase
            .from('agencies')
            .select('data')
            .eq('revision_id', revisionId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return [];
            console.error('대리점 로드 실패:', error);
            return [];
        }

        return data?.data || [];
    }

    // 코스 관련 메서드
    async saveCourses(courses) {
        if (!Supabase.isSupabaseConfigured()) return false;

        const revisionId = this.currentRevisionId || await this.getActiveRevisionId();
        if (!revisionId) return false;

        const supabase = Supabase.getSupabaseClient();
        const { error } = await supabase
            .from('courses')
            .upsert({
                revision_id: revisionId,
                data: courses
            }, {
                onConflict: 'revision_id'
            });

        if (error) {
            console.error('코스 저장 실패:', error);
            return false;
        }

        return true;
    }

    async loadCourses() {
        if (!Supabase.isSupabaseConfigured()) return [];

        const revisionId = this.currentRevisionId || await this.getActiveRevisionId();
        if (!revisionId) return [];

        const supabase = Supabase.getSupabaseClient();
        const { data, error } = await supabase
            .from('courses')
            .select('data')
            .eq('revision_id', revisionId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return [];
            console.error('코스 로드 실패:', error);
            return [];
        }

        return data?.data || [];
    }

    // 기사 관련 메서드
    async saveDrivers(drivers) {
        if (!Supabase.isSupabaseConfigured()) return false;

        const revisionId = this.currentRevisionId || await this.getActiveRevisionId();
        if (!revisionId) return false;

        const supabase = Supabase.getSupabaseClient();
        const { error } = await supabase
            .from('drivers')
            .upsert({
                revision_id: revisionId,
                data: drivers
            }, {
                onConflict: 'revision_id'
            });

        if (error) {
            console.error('기사 저장 실패:', error);
            return false;
        }

        return true;
    }

    async loadDrivers() {
        if (!Supabase.isSupabaseConfigured()) return [];

        const revisionId = this.currentRevisionId || await this.getActiveRevisionId();
        if (!revisionId) return [];

        const supabase = Supabase.getSupabaseClient();
        const { data, error } = await supabase
            .from('drivers')
            .select('data')
            .eq('revision_id', revisionId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return [];
            console.error('기사 로드 실패:', error);
            return [];
        }

        return data?.data || [];
    }

    // 차계부 관련 메서드
    async saveVehicleLog(logData) {
        if (!Supabase.isSupabaseConfigured()) return false;

        const revisionId = this.currentRevisionId || await this.getActiveRevisionId();
        if (!revisionId) return false;

        const timestamp = new Date().toISOString();
        const syncPayload = {
            ...(logData || {}),
            device_id: globalThis.__logisticsDeviceId || localStorage.getItem('logistics_device_id') || null,
            deviceId: globalThis.__logisticsDeviceId || localStorage.getItem('logistics_device_id') || null,
            updated_at: timestamp,
            updatedAt: timestamp
        };

        const supabase = Supabase.getSupabaseClient();
        const { error } = await supabase
            .from('vehicle_logs')
            .upsert({
                revision_id: revisionId,
                data: syncPayload,
                updated_at: syncPayload.updated_at
            }, {
                onConflict: 'revision_id'
            });

        if (error) {
            console.error('차계부 저장 실패:', error);
            return false;
        }

        return true;
    }

    async loadVehicleLog() {
        if (!Supabase.isSupabaseConfigured()) return null;

        const revisionId = this.currentRevisionId || await this.getActiveRevisionId();
        if (!revisionId) return null;

        const supabase = Supabase.getSupabaseClient();
        const { data, error } = await supabase
            .from('vehicle_logs')
            .select('data')
            .eq('revision_id', revisionId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            console.error('차계부 로드 실패:', error);
            return null;
        }

        return data?.data;
    }

    // 설정 관련 메서드
    async saveSettings(key, value) {
        if (!Supabase.isSupabaseConfigured()) return false;

        const revisionId = this.currentRevisionId || await this.getActiveRevisionId();
        if (!revisionId) return false;

        const supabase = Supabase.getSupabaseClient();
        const { error } = await supabase
            .from('settings')
            .upsert({
                revision_id: revisionId,
                key,
                value
            }, {
                onConflict: 'revision_id,key'
            });

        if (error) {
            console.error('설정 저장 실패:', error);
            return false;
        }

        return true;
    }

    async loadSettings(key, defaultValue = null) {
        if (!Supabase.isSupabaseConfigured()) return defaultValue;

        const revisionId = this.currentRevisionId || await this.getActiveRevisionId();
        if (!revisionId) return defaultValue;

        const supabase = Supabase.getSupabaseClient();
        const { data, error } = await supabase
            .from('settings')
            .select('value')
            .eq('revision_id', revisionId)
            .eq('key', key)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return defaultValue;
            console.error('설정 로드 실패:', error);
            return defaultValue;
        }

        return data?.value ?? defaultValue;
    }

    // 실시간 동기화 구독
    async subscribeToTable(tableName, callback) {
        if (!Supabase.isSupabaseConfigured()) return null;

        const activeRevision = await this.getActiveRevision();
        const revisionId = activeRevision?.id;
        if (!revisionId) return null;

        const supabase = Supabase.getSupabaseClient();
        const subscription = supabase // Use the imported supabaseClient
            .channel(`${tableName}_changes`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: tableName,
                    filter: `revision_id=eq.${revisionId}`
                },
                (payload) => callback(payload)
            )
            .subscribe();

        return subscription;
    }

    // 구독 해제
    unsubscribe(subscription) {
        if (subscription) { // Use the imported supabaseClient
            Supabase.getSupabaseClient().removeChannel(subscription); // Use the imported getSupabaseClient
        }
    }

    // 헬퍼 메서드
    async getActiveRevisionId() {
        if (this.currentRevisionId) return this.currentRevisionId;

        const activeRevision = await this.getActiveRevision();
        return activeRevision?.id;
    }

    /**
     * app_settings 내의 특정 설정만 업데이트합니다.
     * 기존 설정을 불러와 부분적으로 병합한 후 다시 저장합니다.
     * @param {object} partialSettings 업데이트할 설정 객체 (예: { messageFontSize: 120 })
     * @returns {Promise<boolean>} 성공 여부
     */
    async updateAppSettings(partialSettings) {
        if (!Supabase.isSupabaseConfigured()) return false;

        const revisionId = this.currentRevisionId || await this.getActiveRevisionId();
        if (!revisionId) return false;

        const supabase = Supabase.getSupabaseClient();

        // 1. 기존 app_settings를 로드합니다.
        const { data: existingSettingsData, error: loadError } = await supabase
            .from('settings')
            .select('value')
            .eq('revision_id', revisionId)
            .eq('key', 'app_settings')
            .maybeSingle();

        if (loadError && loadError.code !== 'PGRST116') { // PGRST116은 데이터가 없음을 의미
            console.error('기존 app_settings 로드 실패:', loadError);
            return false;
        }

        const currentSettings = existingSettingsData?.value || {};

        // 2. 부분 설정을 기존 설정에 병합합니다.
        const newSettings = { ...currentSettings, ...partialSettings };

        // 3. 병합된 설정을 다시 저장합니다.
        return this.saveSettings('app_settings', newSettings);
    }
}
