import { CourseManager } from '../components/course-manager.js';
import { ScheduleTable } from '../components/schedule-table.js';
import { MessagePreview } from '../components/message-preview.js';

export class ScheduleView {
    static render() {
        const isAllCoursesCompleted = this.checkAllCoursesCompleted();
        const isScheduleCompleted = App.state.isCompleted || isAllCoursesCompleted;

        return `
            <div class="max-w-7xl mx-auto space-y-6">
                ${this.renderHeader(isScheduleCompleted)}
                ${this.renderScheduleToolbar()}
                <div id="schedule-content-area"></div>
                ${this.renderFooter()}
                ${MessagePreview.render()}
            </div>
        `;
    }

    static checkAllCoursesCompleted() {
        // 경유지가 없으면 완료 상태가 아님
        if (App.state.editableStops.length === 0) return false;

        const courseIdsInSchedule = [...new Set(App.state.editableStops.map(s => s.courseId).filter(id => id !== null))];
        
        if (courseIdsInSchedule.length === 0) {
            return App.state.courseCompletionStatus[null] || false;
        }
        
        return courseIdsInSchedule.every(id => App.state.courseCompletionStatus[id]);
    }

    static renderHeader(isScheduleCompleted) {
        const statusText = this.getStatusText(isScheduleCompleted);
        const actionButton = this.getActionButton(isScheduleCompleted);

        return `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <!-- 숨김 새로고침 버튼 (좌측 최상단) -->
                <button data-action="reload-app" 
                        class="absolute -top-4 -left-2 w-8 h-8 opacity-0 cursor-default z-50" 
                        title="새로고침 (Ctrl+F5)" 
                        aria-hidden="true"
                        tabindex="-1">
                </button>
                
                <!-- 상단 바: 기사/코스 선택 + 상태 + 액션 -->
                <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 border-b border-gray-200 dark:border-gray-700">
                    <!-- 왼쪽: 기사 및 코스 선택 -->
                    <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
                        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                            <div class="w-full sm:w-auto">
                                <label for="driverName" class="text-xs text-gray-500 dark:text-gray-400 font-medium block mb-1">기사</label>
                                <select id="driverName" class="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2 rounded text-sm w-full sm:w-40" 
                                        ${App.state.isEditingLocked ? 'disabled' : ''}>
                                    <option value="">기사 선택</option>
                                    ${App.state.drivers.map(driver => `
                                        <option value="${driver.name}" ${App.state.driverName === driver.name ? 'selected' : ''}>
                                            ${driver.name}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            <div class="w-full sm:w-auto">
                                <label class="text-xs text-gray-500 dark:text-gray-400 font-medium block mb-1">코스</label>
                                ${CourseManager.renderDropdown()}
                            </div>
                        </div>
                    </div>
                    
                    <!-- 오른쪽: 상태 및 액션 -->
                    <div class="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
                        <p class="text-sm font-medium ${this.getStatusClass(isScheduleCompleted)}">
                            ${statusText}
                        </p>
                        ${actionButton}
                    </div>
                </div>
                
                <!-- 하단 바: 도구 버튼들 -->
                <div class="flex flex-wrap items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-b-lg">
                    <button data-action="auto-resize-columns" 
                            class="bg-teal-500 text-white px-4 py-2 rounded text-sm hover:bg-teal-600 font-medium transition-colors">
                        너비 자동조절
                    </button>
                </div>
            </div>
        `;
    }

    static renderScheduleToolbar() {
        const selectedCount = App.state.selectedStopsForGrouping.size;
        if (App.state.isEditingLocked || selectedCount < 2) return '';

        return `
            <div id="group-toolbar" class="mb-4 p-4 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all">
                <p class="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                    <span class="font-bold text-lg">${selectedCount}</span>개 경유지 선택됨
                </p>
                <div class="flex items-center gap-2 w-full sm:w-auto">
                    <button data-action="group-selected-stops" 
                            class="flex-1 sm:flex-none bg-indigo-500 text-white px-4 py-2 rounded text-sm hover:bg-indigo-600 transition-colors font-medium"
                            title="선택된 경유지들을 하나의 그룹으로 묶습니다.">
                        선택 묶기
                    </button>
                    <button data-action="ungroup-selected-stops"
                            class="flex-1 sm:flex-none bg-gray-500 text-white px-4 py-2 rounded text-sm hover:bg-gray-600 transition-colors font-medium"
                            title="선택된 경유지들의 그룹을 해제합니다.">
                        그룹 해제
                    </button>
                </div>
            </div>
        `;
    }

    static getStatusText(isScheduleCompleted) {
        if (isScheduleCompleted) return '✅ 완료됨';
        if (App.state.isEditingLocked) return '읽기 전용';
        return '편집 가능';
    }

    static getStatusClass(isScheduleCompleted) {
        if (isScheduleCompleted) return 'text-green-600 dark:text-green-400 font-bold';
        return 'text-gray-500 dark:text-gray-400';
    }

    static getActionButton(isScheduleCompleted) {
        if (isScheduleCompleted) {
            return `<button data-action="reopen-schedule" 
                            class="w-full sm:w-auto bg-yellow-500 text-white px-3 sm:px-4 py-2 sm:py-3 rounded text-xs sm:text-sm hover:bg-yellow-600 min-h-[44px] font-medium">
                        스케줄 다시 열기
                    </button>`;
        } else {
            if (App.state.isEditingLocked) {
                return `<button data-action="unlock-editing" 
                                class="w-full sm:w-auto bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 sm:px-4 py-2 sm:py-3 rounded text-xs sm:text-sm hover:bg-gray-300 dark:hover:bg-gray-500 min-h-[44px] font-medium">
                            수정 잠금 해제
                        </button>`;
            } else {
                return `<button data-action="complete-schedule" 
                                class="w-full sm:w-auto bg-green-500 text-white px-3 sm:px-4 py-2 sm:py-3 rounded text-xs sm:text-sm hover:bg-green-600 min-h-[44px] font-medium">
                            수정 잠금
                        </button>`;
            }
        }
    }

    static renderFooter() {
        return `
            <div class="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                ${this.renderAdditionalMessageEditor()}
                <div class="mt-6 text-center">
                    <span class="text-xs text-gray-400 dark:text-gray-500">ver ${App.state.appVersion}</span>
                </div>
            </div>
        `;
    }

    static renderAdditionalMessageEditor() {
        const rotations = App.getters.getRotationsForDay();
        const coursesInSchedule = rotations.map(r => r.course).filter(c => c.id !== null);
        const selectedCourseId = App.state.messagePreviewFilterCourseId;
        const message = App.state.additionalMessagesByCourse[selectedCourseId] || '';

        return `
            <div class="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-3">
                    <label for="additional-message-course-selector" class="text-sm text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">추가 메시지 (코스):</label>
                    <select id="additional-message-course-selector" 
                            class="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2 rounded text-sm" 
                            ${App.state.isEditingLocked ? 'disabled' : ''}>
                        <option value="null" ${selectedCourseId === null ? 'selected' : ''}>코스 미지정</option>
                        ${coursesInSchedule.map(course => `
                            <option value="${course.id}" ${selectedCourseId == course.id ? 'selected' : ''}>
                                ${course.name}
                            </option>
                        `).join('')}
                    </select>
                </div>
                <textarea id="additionalMessage" 
                          class="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-3 rounded text-sm h-24 resize-y" 
                          placeholder="선택된 코스에 대한 추가 메시지" 
                          ${App.state.isEditingLocked ? 'readonly' : ''}>${message}</textarea>
            </div>
        `;
    }

    static updateScheduleContent() {
        if (App.state.viewMode !== 'schedule') return;
        
        const scheduleContent = document.getElementById('schedule-content-area');
        if (!scheduleContent) return;

        const rotations = App.getters.getRotationsForDay();
        
        if (rotations.length <= 1) {
            const rotation = rotations[0] || { 
                course: { id: null, name: '코스 미지정' }, 
                stops: App.state.editableStops 
            };
            const memoHtml = this.renderCourseMemo(rotation.course);
            scheduleContent.innerHTML = memoHtml + ScheduleTable.render(rotation);
        } else {
            scheduleContent.innerHTML = rotations.map((rotation, index) => {
                const activeStop = App.state.activeAgencySelectorStopId ? 
                    App.state.editableStops.find(s => s.id === App.state.activeAgencySelectorStopId) : null;
                const activeCourseId = activeStop ? activeStop.courseId : null;
                const isActiveCourse = rotation.course.id === activeCourseId;
                const memoHtml = this.renderCourseMemo(rotation.course);

                return `
                    <div class="relative ${isActiveCourse ? 'z-10' : 'z-0'} mt-8 pt-6 border-t-4 border-indigo-500 dark:border-indigo-400 rounded-lg bg-gray-50 dark:bg-gray-900/50 shadow-lg p-4">
                        ${memoHtml}
                        ${ScheduleTable.render(rotation)}
                    </div>
                `;
            }).join('');
        }
        
        MessagePreview.update();
    }

    static renderCourseMemo(course) {
        if (!course || !course.memo) return '';
        return `
            <div class="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 text-sm text-gray-700 dark:text-gray-300 flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-yellow-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span class="whitespace-pre-wrap">${course.memo}</span>
            </div>
        `;
    }
}