// 코스 관리
import { CourseManager } from './course-manager.js';
import { CourseFilter } from './course-filter.js';

// 스케줄 관련
import { ScheduleTable } from './schedule-table.js';
import { AgencySelector } from './agency-selector.js';
import { MessagePreview } from './message-preview.js';

// 설정 탭
import { AgenciesTab } from './agencies-tab.js';
import { CoursesTab } from './courses-tab.js';
import { DriversTab } from './drivers-tab.js';
import { SystemTab } from './system-tab.js';

// UI 컴포넌트
import { Modals } from './modals.js';
import { Notifications, showNotification, updateNotification } from './notifications.js';
import { TimePicker } from './time-picker.js';

// Re-export for external use
export { CourseManager, CourseFilter, ScheduleTable, AgencySelector, MessagePreview, AgenciesTab, CoursesTab, DriversTab, SystemTab, Modals, Notifications, showNotification, updateNotification, TimePicker };

// 컴포넌트 업데이트 함수들
export function updateAllComponents() {
    // 코스 관리자
    if (App.state.isCourseManagerOpen) {
        const courseManager = document.getElementById('course-manager-list');
        if (courseManager) {
            courseManager.innerHTML = CourseManager.renderListContent();
        }
    }

    // 에이전시 셀렉터
    if (App.state.activeAgencySelectorStopId !== null) {
        AgencySelector.updateList();
    }

    // 메시지 프리뷰
    MessagePreview.update();

    // 설정 탭
    if (App.state.viewMode === 'settings') {
        switch (App.state.activeTab) {
            case 'agencies':
                AgenciesTab.updateList();
                break;
            case 'courses':
                CoursesTab.updateList();
                break;
            case 'drivers':
                DriversTab.updateList();
                break;
            case 'system':
                SystemTab.updateGlobalFontSizeDisplay();
                break;
        }
    }

    // 모달
    Modals.update();

    // 알림
    updateNotification();
}

// 컴포넌트 초기화
export function initializeComponents() {
    // 글로벌 폰트 크기 적용
    document.documentElement.style.fontSize = `${App.state.globalFontSize}%`;

    // 강제 새로고침 버튼 추가
    // 페이지의 첫번째 H1 태그를 앱의 메인 타이틀로 간주합니다.
    const headerTitle = document.querySelector('h1');

    if (headerTitle && headerTitle.textContent.includes('배송 스케줄러') && !headerTitle.querySelector('[data-action="request-hard-reload"]')) {
        headerTitle.style.display = 'flex';
        headerTitle.style.alignItems = 'center';
        headerTitle.style.gap = '0.5rem';

        const reloadButton = document.createElement('button');
        reloadButton.dataset.action = 'request-hard-reload';
        reloadButton.className = 'p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500';
        reloadButton.title = '캐시 지우고 새로고침 (Ctrl+F5)';
        reloadButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7V9a1 1 0 01-2 0V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13V11a1 1 0 112 0v6a1 1 0 01-1 1h-6a1 1 0 110-2h2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
        </svg>`;
        
        // 제목 텍스트 노드 뒤에 버튼을 추가합니다.
        headerTitle.appendChild(reloadButton);
    }
}