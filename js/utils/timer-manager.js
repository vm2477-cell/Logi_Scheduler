// 타이머 관리 유틸리티
export class TimerManager {
    constructor() {
        this.timers = new Map();
        this.intervals = new Map();
    }
    
    // setTimeout 래퍼
    setTimeout(callback, delay, id = null) {
        const timerId = id || `timer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // 기존 타이머가 있으면 클리어
        if (this.timers.has(timerId)) {
            clearTimeout(this.timers.get(timerId));
        }
        
        const timer = setTimeout(() => {
            callback();
            this.timers.delete(timerId);
        }, delay);
        
        this.timers.set(timerId, timer);
        return timerId;
    }
    
    // setInterval 래퍼
    setInterval(callback, interval, id = null) {
        const intervalId = id || `interval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // 기존 인터벌이 있으면 클리어
        if (this.intervals.has(intervalId)) {
            clearInterval(this.intervals.get(intervalId));
        }
        
        const intervalTimer = setInterval(callback, interval);
        this.intervals.set(intervalId, intervalTimer);
        return intervalId;
    }
    
    // 타이머 클리어
    clearTimeout(id) {
        if (this.timers.has(id)) {
            clearTimeout(this.timers.get(id));
            this.timers.delete(id);
            return true;
        }
        return false;
    }
    
    // 인터벌 클리어
    clearInterval(id) {
        if (this.intervals.has(id)) {
            clearInterval(this.intervals.get(id));
            this.intervals.delete(id);
            return true;
        }
        return false;
    }
    
    // 모든 타이머 클리어
    clearAllTimers() {
        this.timers.forEach(timer => clearTimeout(timer));
        this.timers.clear();
    }
    
    // 모든 인터벌 클리어
    clearAllIntervals() {
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals.clear();
    }
    
    // 모든 타이머와 인터벌 클리어
    clearAll() {
        this.clearAllTimers();
        this.clearAllIntervals();
    }
    
    // 특정 타이머가 존재하는지 확인
    hasTimer(id) {
        return this.timers.has(id);
    }
    
    // 특정 인터벌이 존재하는지 확인
    hasInterval(id) {
        return this.intervals.has(id);
    }
    
    // 활성 타이머 수
    getActiveTimerCount() {
        return this.timers.size;
    }
    
    // 활성 인터벌 수
    getActiveIntervalCount() {
        return this.intervals.size;
    }
    
    // 디버그 정보
    getDebugInfo() {
        return {
            timers: Array.from(this.timers.keys()),
            intervals: Array.from(this.intervals.keys()),
            timerCount: this.timers.size,
            intervalCount: this.intervals.size
        };
    }
}

// 전역 타이머 관리자 인스턴스
export const timerManager = new TimerManager();

// 디바운스 유틸리티
export function debounce(func, delay, id = null) {
    return function(...args) {
        const debouncedId = id || `debounce_${func.name || 'anonymous'}`;
        timerManager.setTimeout(() => func.apply(this, args), delay, debouncedId);
    };
}

// 스로틀 유틸리티
export function throttle(func, delay, id = null) {
    const throttledId = id || `throttle_${func.name || 'anonymous'}`;
    let lastCall = 0;
    
    return function(...args) {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            return func.apply(this, args);
        }
    };
}

// 앱에서 자주 사용하는 타이머 ID 상수
export const TIMER_IDS = {
    AUTO_SAVE: 'auto_save',
    AUTO_RENDER: 'auto_render',
    AUTO_BACKUP: 'auto_backup',
    NOTIFICATION: 'notification',
    FONT_SIZE_SAVE: 'font_size_save',
    GPS_UPDATE: 'gps_update',
    SCROLL_HANDLER: 'scroll_handler'
};

// 앱 종료 시 정리
window.addEventListener('beforeunload', () => {
    timerManager.clearAll();
});
