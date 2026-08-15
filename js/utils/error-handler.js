// 전역 에러 핸들러
export class ErrorHandler {
    static logLevel = (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'production') ? 'error' : 'debug';
    
    static handle(error, context = 'Unknown', userMessage = null) {
        // 에러 로깅
        this.log(error, context);
        
        // 사용자 알림
        if (userMessage) {
            this.showUserNotification(userMessage, 'error');
        } else {
            this.showUserNotification('오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 'error');
        }
        
        // 에러 리포팅 (프로덕션 환경에서만)
        if (this.logLevel === 'error') {
            this.reportError(error, context);
        }
    }
    
    static log(error, context) {
        const timestamp = new Date().toISOString();
        const errorInfo = {
            timestamp,
            context,
            message: error.message,
            stack: error.stack,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        console.error(`[${context}] ${error.message}`, errorInfo);
        
        // 로컬 스토리지에 에러 로그 저장
        this.saveErrorLog(errorInfo);
    }
    
    static saveErrorLog(errorInfo) {
        try {
            const logs = JSON.parse(localStorage.getItem('app_error_logs') || '[]');
            logs.push(errorInfo);
            
            // 최근 100개 로그만 유지
            if (logs.length > 100) {
                logs.splice(0, logs.length - 100);
            }
            
            localStorage.setItem('app_error_logs', JSON.stringify(logs));
        } catch (e) {
            console.error('Failed to save error log:', e);
        }
    }
    
    static showUserNotification(message, type = 'error') {
        // 기존 알림 시스템 사용
        if (window.App && window.App.components && window.App.components.showNotification) {
            window.App.components.showNotification(message, type, 5000);
        } else {
            // Fallback: 기본 alert
            console.warn('Notification system not available, using fallback');
            alert(message);
        }
    }
    
    static reportError(error, context) {
        // 에러 리포팅 서비스로 전송 (Sentry, LogRocket 등)
        // 예시 구조
        if (window.analytics) {
            window.analytics.track('Error', {
                context,
                message: error.message,
                stack: error.stack
            });
        }
    }
    
    static getErrorLogs() {
        try {
            return JSON.parse(localStorage.getItem('app_error_logs') || '[]');
        } catch (e) {
            return [];
        }
    }
    
    static clearErrorLogs() {
        localStorage.removeItem('app_error_logs');
    }
}

// 전역 에러 이벤트 리스너
window.addEventListener('error', (event) => {
    ErrorHandler.handle(event.error, 'Global Error');
});

window.addEventListener('unhandledrejection', (event) => {
    ErrorHandler.handle(event.reason, 'Unhandled Promise Rejection');
});

// 네트워크 에러 핸들러
export class NetworkErrorHandler {
    static async handleNetworkError(response, context = 'Network Request') {
        if (!response.ok) {
            const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
            error.status = response.status;
            error.url = response.url;
            
            let userMessage = '네트워크 오류가 발생했습니다.';
            
            switch (response.status) {
                case 401:
                    userMessage = '인증이 필요합니다.';
                    break;
                case 403:
                    userMessage = '접근 권한이 없습니다.';
                    break;
                case 404:
                    userMessage = '요청한 데이터를 찾을 수 없습니다.';
                    break;
                case 429:
                    userMessage = '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
                    break;
                case 500:
                    userMessage = '서버 오류가 발생했습니다.';
                    break;
            }
            
            ErrorHandler.handle(error, context, userMessage);
            throw error;
        }
        
        return response;
    }
}

// API 호출용 래퍼
export async function safeApiCall(apiCall, context = 'API Call') {
    try {
        const response = await apiCall();
        return await NetworkErrorHandler.handleNetworkError(response, context);
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            ErrorHandler.handle(new Error('네트워크 연결을 확인해주세요.'), context);
        } else {
            ErrorHandler.handle(error, context);
        }
        throw error;
    }
}
