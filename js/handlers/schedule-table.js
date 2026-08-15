import { App } from '../app.js';
import { AgencySelector } from './agency-selector.js';
import { Calculations } from '../utils/calculations.js';

export class ScheduleTable {
    static render(rotation) {
        const { course, stops } = rotation;
        const courseId = course ? course.id : null;
        const isEditingLocked = App.state.isEditingLocked;

        // [Bug Fix] 빈 스케줄이거나 대리점이 지정되지 않은 상태에서 기록 모드가 활성화된 경우 강제 종료
        if (App.state.activeCorrectionCourseId === courseId && (!stops || stops.length === 0 || !stops.some(s => s.agencyId > 0))) {
            App.state.activeCorrectionCourseId = null;
            App.services.storage.clearCorrectionState(App.state.selectedDate);
        }

        const isCorrectionModeActive = App.state.activeCorrectionCourseId === courseId;

        const departureTime = App.state.departureTimesByCourse[courseId] || '07:30';
        const stopsWithTimes = Calculations.calculateScheduleTimes(stops, departureTime, App.state.cache.agenciesMap, App.state.travelTimes);

        // 상태에 정의된 컬럼 너비를 기반으로 그리드 스타일 생성
        const columnWidths = App.state.columnWidths;
        const gridStyle = `grid-template-columns: 
            ${columnWidths.group || 40}px 
            ${columnWidths.agency || 200}px 
            ${columnWidths.travelTime || 80}px 
            ${columnWidths.arrivalTime || 80}px 
            ${columnWidths.workTime || 80}px 
            ${columnWidths.departureTime || 80}px 
            ${columnWidths.priority || 40}px 
            ${columnWidths.actions || 120}px;`.replace(/\s+/g, ' ');

        return `
            <div class="schedule-table-container overflow-x-auto">
                ${this.renderCourseHeader(course, departureTime, isEditingLocked, isCorrectionModeActive)}
                <div class="schedule-table text-sm border-l border-r border-gray-200 dark:border-gray-700">
                    ${this.renderHeader(gridStyle)}
                    <div class="schedule-rows" data-course-id="${courseId}">
                        ${stopsWithTimes.map(stop => this.renderRow(stop, gridStyle, isEditingLocked, isCorrectionModeActive, departureTime)).join('')}
                    </div>
                </div>
                ${!isEditingLocked ? this.renderAddStopButton(courseId) : ''}
            </div>
        `;
    }

    static renderCourseHeader(course, departureTime, isLocked, isCorrectionMode) {
        const courseName = course ? course.name : '코스 미지정';
        const courseId = course ? course.id : null;
        const isCompleted = App.state.courseCompletionStatus[courseId];

        return `
            <div class="flex flex-wrap items-center justify-between gap-y-2 gap-x-4 mb-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-t-lg">
                <div class="flex items-center gap-3">
                    <h3 class="text-lg font-bold text-gray-800 dark:text-gray-200">${courseName}</h3>
                    <div class="flex items-center">
                        <label for="departure-time-${courseId}" class="text-xs font-medium mr-2">출발:</label>
                        <input type="time" id="departure-time-${courseId}" data-course-id="${courseId}" 
                               class="departure-time-input bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm w-28" data-time-input-wheel="true"
                               value="${departureTime}" ${isLocked ? 'disabled' : ''}>
                        <button data-action="set-departure-now" data-course-id="${courseId}" class="ml-2 text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-500" ${isLocked ? 'disabled' : ''}>
                            현재
                        </button>
                    </div>
                </div>
                <div class="flex items-center gap-4">
                    ${!isLocked && App.state.selectedStopsForGrouping.size > 0 ? `
                        <button data-action="open-group-modal" class="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded font-bold hover:bg-indigo-700 shadow-sm transition-colors">
                            그룹 관리 (${App.state.selectedStopsForGrouping.size}개)
                        </button>
                    ` : ''}
                    
                    <button data-action="sort-course" data-course-id="${courseId}" class="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-500" ${isLocked ? 'disabled' : ''}>
                        순서 정렬
                    </button>
                    <button data-action="toggle-correction-mode" data-course-id="${courseId}" class="text-xs px-3 py-1.5 rounded font-semibold ${isCorrectionMode ? 'bg-orange-500 text-white' : 'bg-white dark:bg-gray-700'}">
                        ${isCorrectionMode ? '기록 중단' : '이동시간 기록'}
                    </button>
                </div>
            </div>
        `;
    }

    static renderHeader(gridStyle) {
        const headers = [
            { key: 'group', label: '선택', style: 'w-10 text-center' },
            { key: 'agency', label: '대리점' },
            { key: 'travelTime', label: '이동' },
            { key: 'arrivalTime', label: '도착' },
            { key: 'workTime', label: '작업' },
            { key: 'departureTime', label: '출발' },
            { key: 'priority', label: '우선', style: 'w-10 text-center' },
            { key: 'actions', label: '관리' }
        ];

        return `
            <div class="schedule-header grid md:grid bg-gray-50 dark:bg-gray-700/50 font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase" style="${gridStyle}">
                ${headers.map(h => `
                    <div class="px-2 py-2 border-t border-b border-gray-200 dark:border-gray-600 ${h.style || ''}">
                        ${h.label}
                        ${App.state.columnWidths[h.key] ? `<div class="resize-handle" data-column="${h.key}"></div>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    static renderRow(stop, gridStyle, isLocked, isCorrectionMode, departureTime) {
        const agency = App.state.cache.agenciesMap.get(stop.agencyId);
        const isSelectedForGrouping = App.state.selectedStopsForGrouping.has(stop.id);
        const groupColor = stop.groupId ? this.#getGroupColor(stop.groupId) : null;

        // 코스별 개별 우선순위 가져오기 (없으면 기본 우선순위 사용)
        const courseId = stop.courseId;
        const prioKey = courseId === null ? 'null' : courseId;
        const displayPriority = (agency?.coursePriorities && agency.coursePriorities[prioKey] !== undefined)
            ? agency.coursePriorities[prioKey]
            : (agency?.priority || 99);

        return `
            <div class="schedule-row grid md:grid items-center border-b border-gray-200 dark:border-gray-600 relative ${isSelectedForGrouping ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'bg-white dark:bg-gray-800'}" 
                 style="${gridStyle}"
                 data-stop-id="${stop.id}" draggable="${!isLocked}">
                
                ${groupColor ? `<div class="absolute left-0 top-0 bottom-0 w-1.5" style="background-color: ${groupColor};" title="그룹화된 경유지"></div>` : ''}

                <!-- 그룹 선택 체크박스 -->
                <div class="flex items-center justify-center h-full">
                    ${!isLocked ? `
                        <input type="checkbox" data-action="toggle-group-selection" data-stop-id="${stop.id}"
                               class="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-gray-900"
                               ${isSelectedForGrouping ? 'checked' : ''}>
                    ` : ''}
                </div>

                <!-- 대리점 정보 -->
                <div class="px-2 py-1">${AgencySelector.render(stop, agency)}</div>

                <!-- 시간 정보 -->
                ${this.renderTimeCell('travelTime', stop.travelTimeInSeconds, isLocked, null, stop, departureTime)}
                ${this.renderTimeCell('arrivalTime', stop.arrivalTimeInSeconds, isLocked, stop.manualArrivalTime, null, departureTime)}
                ${this.renderTimeCell('workTime', stop.workTimeInSeconds, isLocked, null, null, departureTime)}
                ${this.renderTimeCell('departureTime', stop.departureTimeInSeconds, isLocked, stop.manualDepartureTime, null, departureTime)}

                <!-- 코스별 우선순위 설정 -->
                <div class="px-1 py-1 text-center font-mono">
                    <input type="number" value="${displayPriority}" 
                           class="w-full text-center bg-transparent border-0 p-0 focus:ring-0 text-xs text-gray-400 focus:text-indigo-600 appearance-none" 
                           data-action="update-agency-priority" 
                           data-agency-id="${stop.agencyId}" 
                           data-course-id="${courseId}"
                           ${isLocked ? 'disabled' : ''}
                           placeholder="99">
                </div>

                <!-- 관리 버튼 -->
                <div class="px-2 py-1 flex items-center justify-center gap-1">
                    ${!isLocked ? `<button class="drag-handle p-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600" aria-label="순서 변경"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg></button>` : ''}
                    <button data-action="get-directions" class="p-1 text-blue-500 hover:text-blue-700" title="길안내"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg></button>
                    <button data-action="make-call" class="p-1 text-green-500 hover:text-green-700" title="전화"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.79 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></button>
                    <button data-action="show-memo" class="p-1 ${agency?.memo ? 'text-yellow-500' : 'text-gray-400 hover:text-gray-600'}" title="메모"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></button>
                    ${!isLocked ? `<button data-action="remove-stop" class="p-1 text-red-500 hover:text-red-700" title="삭제"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>` : ''}
                </div>
            </div>
        `;
    }

    static renderTimeCell(key, seconds, isLocked, manualValue = null, stop = null, departureTime = '07:30') {
        // 이동시간은 출력 전용(Read-only)으로 전환하여 계산된/실측된 값의 일관성 유지
        if (key === 'travelTime') {
            const isRecorded = stop?.manualArrivalTime;
            const colorClass = isRecorded ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-500 dark:text-gray-400';
            return `<div class="px-2 py-1 text-center font-mono ${colorClass}" data-value="${key}">${Calculations.formatMinutes(seconds)}</div>`;
        }

        // 작업시간은 '분' 단위의 숫자 입력으로 처리
        if (key === 'workTime') {
            const minutes = Math.round((seconds || 0) / 60);
            const colorClass = 'text-gray-500 dark:text-gray-400';

            if (isLocked) {
                return `<div class="px-2 py-1 text-center font-mono ${colorClass}" data-value="${key}">${Calculations.formatMinutes(seconds)}</div>`;
            }
            const propertyName = `manual${key.charAt(0).toUpperCase() + key.slice(1)}InMinutes`;
            return `
                <div class="px-2 py-1 text-center font-mono ${colorClass}" data-value="${key}">
                    <input type="number" value="${minutes}" 
                           class="stop-time-input w-full text-center bg-transparent border-0 p-0 focus:ring-0" 
                           data-property="${propertyName}" placeholder="분">
                </div>
            `;
        }

        // 도착시간, 출발시간은 'HH:MM' 형식의 시간 입력으로 처리
        const formattedTime = Calculations.calculateTime(departureTime, seconds); // 코스 출발 시간 기준 시각 계산
        if (isLocked) {
            const displayValue = manualValue || formattedTime;
            const colorClass = manualValue ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-500 dark:text-gray-400';
            return `<div class="px-2 py-1 text-center font-mono ${colorClass}" data-value="${key}">${displayValue}</div>`;
        }
        return `
            <div class="px-2 py-1 text-center font-mono" data-value="${key}">
                <input type="time" value="${manualValue || formattedTime}" 
                       class="stop-time-input w-full text-center bg-transparent border-0 p-0 focus:ring-0 ${manualValue ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-500 dark:text-gray-400'}"
                       data-property="manual${key.charAt(0).toUpperCase() + key.slice(1)}" data-time-input-wheel="true">
            </div>
        `;
    }

    static renderAddStopButton(courseId) {
        return `
            <div class="mt-2 flex items-center justify-center gap-2">
                <input type="number" id="add-stop-count-${courseId}" value="1" min="1" max="10" class="w-16 text-center border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md text-sm p-1">
                <button data-action="add-stop" data-course-id="${courseId}" 
                        class="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-3 py-1 rounded text-xs hover:bg-gray-300 dark:hover:bg-gray-500">
                    경유지 추가
                </button>
            </div>
        `;
    }

    /**
     * 그룹 ID를 기반으로 일관된 색상을 생성합니다.
     * @param {string} groupId 
     * @returns {string} HSL 색상 문자열
     */
    static #getGroupColor(groupId) {
        if (!groupId) return null;
        
        let hash = 0;
        for (let i = 0; i < groupId.length; i++) {
            hash = groupId.charCodeAt(i) + ((hash << 5) - hash);
            hash = hash & hash; // Convert to 32bit integer
        }
        
        const hue = Math.abs(hash % 360);
        return `hsl(${hue}, 60%, 80%)`; // Light pastel color
    }
}

// SVG 아이콘들을 클래스 내부에 정적 속성으로 관리하면 더 깔끔할 수 있습니다.
// 예: static ICONS = { directions: '...', call: '...' };