// Supabase 클라이언트 설정
// UMD 버전이 index.html에서 이미 로드됨: https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js

// config.js에서 Supabase 관련 설정을 가져옵니다.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
// 클라이언트 초기화
let supabaseClient = null;

export function initSupabase(url = SUPABASE_URL, key = SUPABASE_ANON_KEY) {
    if (!url || !key || url === 'YOUR_SUPABASE_URL' || key === 'YOUR_SUPABASE_ANON_KEY' || url === '' || key === '') {
        console.warn('Supabase: URL 또는 API 키가 설정되지 않았습니다. 로컬 스토리지 모드로 작동합니다.');
        return false;
    }
    
    // 이미 초기화되어 있고, 같은 URL/Key면 재사용
    if (supabaseClient) {
        console.log('Supabase 클라이언트가 이미 초기화되어 있습니다.');
        return true;
    }
    
    try {
        // 전역 supabase 객체 사용 (UMD 버전)
        if (typeof window.supabase !== 'undefined') {
            supabaseClient = window.supabase.createClient(url, key); // UMD 버전에서 전역 객체 사용
            console.log('Supabase 클라이언트 초기화 완료');
            return true;
        } else {
            console.error('Supabase 라이브러리가 로드되지 않았습니다.');
            return false;
        }
    } catch (error) {
        console.error('Supabase 초기화 실패:', error);
        return false;
    }
};

export function isSupabaseConfigured() {
    return supabaseClient !== null;
};

export function getSupabaseClient() {
    return supabaseClient;
};

export const supabaseAuth = {
    // 이메일/비밀번호로 로그인
    async signIn(email, password) {
        if (!supabaseClient) {
            console.error('Supabase 클라이언트가 초기화되지 않았습니다.');
            return { error: 'Supabase 클라이언트가 초기화되지 않았습니다.' };
        }
        
        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) {
                console.error('로그인 실패:', error);
                return { error: error.message };
            }
            
            console.log('로그인 성공:', data.user);
            return { data, error: null };
        } catch (error) {
            console.error('로그인 오류:', error);
            return { error: error.message };
        }
    },
    
    // 회원가입
    async signUp(email, password) {
        if (!supabaseClient) {
            console.error('Supabase 클라이언트가 초기화되지 않았습니다.');
            return { error: 'Supabase 클라이언트가 초기화되지 않았습니다.' };
        }
        
        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password
            });
            
            if (error) {
                console.error('회원가입 실패:', error);
                return { error: error.message };
            }
            
            console.log('회원가입 성공:', data.user);
            return { data, error: null };
        } catch (error) {
            console.error('회원가입 오류:', error);
            return { error: error.message };
        }
    },
    
    // 로그아웃
    async signOut() {
        if (!supabaseClient) {
            console.error('Supabase 클라이언트가 초기화되지 않았습니다.');
            return { error: 'Supabase 클라이언트가 초기화되지 않았습니다.' };
        }
        
        try {
            const { error } = await supabaseClient.auth.signOut();
            
            if (error) {
                console.error('로그아웃 실패:', error);
                return { error: error.message };
            }
            
            console.log('로그아웃 성공');
            return { error: null };
        } catch (error) {
            console.error('로그아웃 오류:', error);
            return { error: error.message };
        }
    },
    
    // 현재 사용자 정보 가져오기
    async getCurrentUser() {
        if (!supabaseClient) {
            return null;
        }
        
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            return user;
        } catch (error) {
            console.error('사용자 정보 가져오기 실패:', error);
            return null;
        }
    },
    
    // 현재 세션 확인
    async getSession() {
        if (!supabaseClient) {
            return null;
        }
        
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            return session;
        } catch (error) {
            console.error('세션 정보 가져오기 실패:', error);
            return null;
        }
    },
    
    // 인증 상태 변경 감지
    onAuthStateChange(callback) {
        if (!supabaseClient) {
            return () => {};
        }
        
        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, session) => {
            callback(event, session);
        });
        
        return subscription;
    }
};