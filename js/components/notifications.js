export class Notifications {
    static show(message, type = 'info', duration = 3000) {
        // 기존 타이머 정리
        if (App.state.notificationTimer) {
            clearTimeout(App.state.notificationTimer);
        }

        // 새 알림 설정
        App.state.notification = { message, type };
        this.update();

        // 자동 숨김 타이머 설정
        App.state.notificationTimer = setTimeout(() => {
            this.hide();
        }, duration);
    }

    static hide() {
        const notificationElement = document.getElementById('notification-container')?.firstElementChild;
        if (notificationElement) {
            notificationElement.classList.add('hide');
            setTimeout(() => {
                App.state.notification = null;
                this.update();
            }, 300);
        } else {
            App.state.notification = null;
            this.update();
        }
    }

    static update() {
        const container = document.getElementById('notification-container');
        if (!container) return;

        container.innerHTML = App.state.notification ? this.render() : '';
    }

    static render() {
        if (!App.state.notification) return '';
        
        const { message, type } = App.state.notification;
        const typeClasses = this.#getTypeClasses(type);
        
        return `
            <div class="px-4 py-2 rounded-lg text-white font-medium shadow-lg notification text-center ${typeClasses}">
                ${message}
            </div>
        `;
    }

    static #getTypeClasses(type) {
        const classes = {
            'success': 'bg-green-500',
            'error': 'bg-red-500',
            'warning': 'bg-yellow-500',
            'info': 'bg-blue-500'
        };
        
        return classes[type] || classes.info;
    }
}

// 편의 함수들
export function showNotification(message, type = 'info', duration = 3000) {
    Notifications.show(message, type, duration);
}

export function updateNotification() {
    Notifications.update();
}