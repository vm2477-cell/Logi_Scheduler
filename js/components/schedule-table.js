import { AgencySelector } from './agency-selector.js';
import { TimePicker } from './time-picker.js';
import { Calculations } from '../utils/calculations.js';

export class ScheduleTable {
    static render(rotation) {
        const { course, stops } = rotation;
        const courseId = course.id;
        const departureTime = App.state.departureTimesByCourse[courseId] || '07:30';
        
        const stopsWithTimes = App.calculations.calculateScheduleTimes(
            stops,
            departureTime,
            App.state.cache.agenciesMap,
            App.state.travelTimes
        );

        const totals = Calculations.calculateTotals(stopsWithTimes);
        const gridTemplateColumns = this.#getGridTemplateColumns();

        return `
            <div class="space-y-4">
                ${this.#renderHeader(course)}
                ${this.#renderControls(courseId)}
                <div class="overflow-x-auto">
                    ${this.#renderTableHeader(gridTemplateColumns)}
                    <div class="schedule-rows space-y-4 md:space-y-0" data-course-id="${courseId}">
                        ${this.#renderFactoryRow(gridTemplateColumns, course.id)}
                        ${stopsWithTimes.length > 0 ? 
                            stopsWithTimes.map((stop, index) => this.#renderStopRow(stop, index, gridTemplateColumns)).join('') : 
                            this.#renderEmptyState()
                        }
                    </div>
                    ${this.#renderFactoryReturnRow(gridTemplateColumns, course.id)}
                    ${this.#renderTotalsRow(totals, gridTemplateColumns)}
                </div>
            </div>
        `;
    }

    static #renderFactoryReturnRow(gridTemplateColumns, courseId) {
        const isCorrectionMode = App.state.activeCorrectionCourseId === courseId;
        const isGpsOn = App.state.isGpsAutoRecordEnabled;
        if (!isCorrectionMode) return '';

        const correctionState = App.state.correctionStatesByCourse[courseId];
        if (!correctionState) return '';

        const factoryId = App.calculations.ASAN_FACTORY.id;

        // 마지막 경유지 출발 후, 공장 도착 단계일 때만 이 행을 표시
        const isFactoryReturnStep = correctionState.currentStep.type === 'arrive' && correctionState.currentStep.locationId === factoryId;
        if (!isFactoryReturnStep) {
            return '';
        }

        const factoryRecordedTimes = correctionState.recordedTimes[factoryId] || {};
        const arrivalTime = factoryRecordedTimes.arrival || '-';

        return `
            <div class="text-sm border-t border-dashed border-gray-400 dark:border-gray-600 mt-4"></div>
            <div class="text-sm bg-gray-100 dark:bg-gray-700/50 rounded-lg shadow-sm p-4 md:grid md:p-0 md:rounded-none md:shadow-none" 
                 style="grid-template-columns: ${gridTemplateColumns};">
                <div class="hidden md:block md:p-2 md:border-r dark:border-r-gray-700 text-center"></div>
                <div class="md:p-2 md:border-r dark:border-r-gray-700 flex items-center space-x-2">
                    <span class="font-bold pl-8">${App.calculations.ASAN_FACTORY.name} 복귀</span>
                </div>
                <div class="hidden md:block md:p-2 md:border-r dark:border-r-gray-700 text-center">-</div>
                <div class="mt-2 md:mt-0 md:p-2 md:border-r dark:border-r-gray-700 md:text-center font-bold">
                    <span class="text-gray-600 dark:text-gray-300 md:hidden">도착: </span>
                    <span class="${arrivalTime !== '-' ? 'text-green-600 dark:text-green-400' : ''}">${arrivalTime}</span>
                </div>
                <div class="hidden md:block md:p-2 md:border-r dark:border-r-gray-700 text-center">-</div>
                <div class="hidden md:block md:p-2 md:border-r dark:border-r-gray-700 text-center">-</div>
                <div class="hidden md:block md:p-2 md:border-r dark:border-r-gray-700 text-center">-</div>
                <div class="hidden md:block md:p-2 md:border-r dark:border-r-gray-700 text-center">-</div>
                <div class="mt-2 md:mt-0 md:p-2 text-center flex items-center justify-center space-x-2">
                    ${isCorrectionMode && !factoryRecordedTimes.arrival ? `
                        <button data-action="correction-arrive" 
                                data-location-id="${factoryId}" 
                                data-course-id="${courseId}"
                                class="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600 disabled:bg-gray-400"
                                ${isGpsOn || !isFactoryReturnStep ? 'disabled' : ''}>
                            도착
                        </button><button data-action="get-factory-directions"
                                class="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600">
                            길찾기
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    static #getGridTemplateColumns() {
        const { columnWidths } = App.state;
        return `40px ${columnWidths.agency}px ${columnWidths.travelTime}px ${columnWidths.arrivalTime}px ${columnWidths.workTime}px ${columnWidths.departureTime}px ${columnWidths.actions}px`;
    }

    static #renderHeader(course) {
        const isRecording = App.state.activeCorrectionCourseId === course.id;
        const isGpsEnabled = App.state.isGpsAutoRecordEnabled;

        let recordBtnClass = isRecording ? 'bg-red-500' : 'bg-orange-500';
        let recordBtnContent = '이동시간 기록';

        if (isRecording) {
            if (isGpsEnabled) {
                recordBtnContent = `<span class="flex items-center"><span class="animate-pulse mr-1">📡</span>GPS 자동 기록 중</span>`;
            } else {
                recordBtnContent = `<span class="flex items-center"><span class="mr-1">✍️</span>수동 기록 중</span>`;
            }
        }

        return `
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100">${course.name}</h2>
                ${!App.state.isEditingLocked ? `
                    <div class="flex items-center gap-2">
                        <button data-action="toggle-correction-mode"
                                data-course-id="${course.id}"
                                class="${recordBtnClass} text-white px-4 py-2 rounded text-sm hover:opacity-80 transition-colors font-medium">
                            ${recordBtnContent}
                        </button>
                        <button data-action="toggle-course-completion" 
                                data-course-id="${course.id}" 
                                class="${App.state.courseCompletionStatus[course.id] ? 'bg-gray-500' : 'bg-green-500'} text-white px-4 py-2 rounded text-sm hover:opacity-80 transition-colors font-medium">
                            ${App.state.courseCompletionStatus[course.id] ? '완료 취소' : '코스 완료'}
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    static #renderControls(courseId) {
        return `
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <!-- 왼쪽: 출발 시간 설정 -->
                <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                    <div class="flex items-center gap-2">
                        <label for="initialDeparture-${courseId}" class="text-sm text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">출발 시간:</label>
                        <input type="text" id="initialDeparture-${courseId}" 
                               data-course-id="${courseId}" 
                               value="${App.state.departureTimesByCourse[courseId] || '07:30'}" 
                               maxlength="5"
                               class="departure-time-input border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2 rounded text-sm w-20 ${App.state.isEditingLocked ? 'opacity-50 cursor-not-allowed' : ''}"
                               ${App.state.isEditingLocked ? 'readonly' : ''} placeholder="HH:MM" data-time-input="true" data-time-picker="true">
                        <button data-action="open-time-picker" 
                                data-target="initialDeparture-${courseId}"
                                class="bg-indigo-500 text-white px-2 py-2 rounded text-sm hover:bg-indigo-600 transition-colors ${App.state.isEditingLocked ? 'opacity-50 cursor-not-allowed' : ''}" 
                                ${App.state.isEditingLocked ? 'disabled' : ''} title="시간 선택">
                            🕐
                        </button>
                        <button data-action="set-departure-now" 
                                data-course-id="${courseId}" 
                                class="bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600 transition-colors ${App.state.isEditingLocked ? 'opacity-50 cursor-not-allowed' : ''}" 
                                ${App.state.isEditingLocked ? 'disabled' : ''}>
                            현재 시간
                        </button>
                    </div>
                </div>
                
                <!-- 오른쪽: 경유지 관리 버튼들 -->
                <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                    <div class="flex items-center gap-2">
                        <button data-action="add-stop" 
                                data-course-id="${courseId}" 
                                class="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 transition-colors ${App.state.isEditingLocked || App.state.activeCorrectionCourseId !== null ? 'opacity-50 cursor-not-allowed' : ''}" 
                                ${App.state.isEditingLocked || App.state.activeCorrectionCourseId !== null ? 'disabled' : ''}>
                            경유지 추가
                        </button>
                        <input type="number" id="add-stop-count-${courseId}" value="1" min="1" max="10" 
                               class="w-16 p-2 text-center border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded text-sm">
                    </div>
                    <button data-action="sort-course" 
                            data-course-id="${courseId}" 
                            class="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600 transition-colors ${App.state.isEditingLocked || App.state.activeCorrectionCourseId !== null ? 'opacity-50 cursor-not-allowed' : ''}" 
                            ${App.state.isEditingLocked || App.state.activeCorrectionCourseId !== null ? 'disabled' : ''}>
                        코스 정렬
                    </button>
                </div>
            </div>
        `;
    }

    static #renderTableHeader(gridTemplateColumns) {
        return `
            <div class="hidden md:grid sticky top-0 bg-gray-100 dark:bg-gray-800 z-10 text-sm shadow-sm border-b border-gray-300 dark:border-gray-600" 
                 style="grid-template-columns: ${gridTemplateColumns};">
                <div class="px-3 py-3 border-r dark:border-r-gray-700 text-center font-semibold text-gray-600 dark:text-gray-400">
                    선택
                </div>
                <div class="px-3 py-3 border-r dark:border-r-gray-700 relative">
                    <span class="resize-handle" data-column="agency"></span>대리점/주소
                </div>
                <div class="px-3 py-3 border-r dark:border-r-gray-700 relative">
                    <span class="resize-handle" data-column="travelTime"></span>이동시간
                </div>
                <div class="px-3 py-3 border-r dark:border-r-gray-700 relative">
                    <span class="resize-handle" data-column="arrivalTime"></span>도착시간
                </div>
                <div class="px-3 py-3 border-r dark:border-r-gray-700 relative">
                    <span class="resize-handle" data-column="workTime"></span>작업시간
                </div>
                <div class="px-3 py-3 border-r dark:border-r-gray-700 relative">
                    <span class="resize-handle" data-column="departureTime"></span>출발시간
                </div>
                <div class="px-3 py-3">액션</div>
            </div>
        `;
    }

    static #renderFactoryRow(gridTemplateColumns, courseId) {
        const isCorrectionMode = App.state.activeCorrectionCourseId === courseId;
        const isGpsOn = App.state.isGpsAutoRecordEnabled;
        const correctionState = isCorrectionMode ? App.state.correctionStatesByCourse[courseId] : null;
        const factoryRecordedTime = isCorrectionMode && correctionState ? correctionState.recordedTimes[Calculations.ASAN_FACTORY.id]?.departure : null;
        const factoryDepartureTime = isCorrectionMode ? (factoryRecordedTime || App.state.departureTimesByCourse[courseId] || '07:30') : (App.state.departureTimesByCourse[courseId] || '07:30');

        return `
            <div class="text-sm border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700/50 rounded-lg shadow-sm p-4 md:grid md:p-0 md:rounded-none md:shadow-none" 
                 style="grid-template-columns: ${gridTemplateColumns};">
                <div class="hidden md:block md:p-2 md:border-r dark:border-r-gray-700 text-center"></div>
                <div class="md:p-2 md:border-r dark:border-r-gray-700 flex items-center space-x-2">
                    <span class="font-bold pl-8">${Calculations.ASAN_FACTORY.name}</span>
                </div>
                <div class="hidden md:block md:p-2 md:border-r dark:border-r-gray-700 text-center">-</div>
                <div class="hidden md:block md:p-2 md:border-r dark:border-r-gray-700 text-center">-</div>
                <div class="hidden md:block md:p-2 md:border-r dark:border-r-gray-700 text-center">-</div>
                <div class="mt-2 md:mt-0 md:p-2 md:border-r dark:border-r-gray-700 md:text-center font-bold">
                    <span class="text-gray-600 dark:text-gray-300 md:hidden">출발: </span>
                    <span class="${factoryRecordedTime ? 'text-blue-600 dark:text-blue-400' : ''}">${factoryDepartureTime}</span>
                </div>
                <div class="mt-2 md:mt-0 md:p-2 text-center">
                    ${isCorrectionMode && !factoryRecordedTime ? `
                        <button data-action="correction-depart" 
                                data-location-id="${Calculations.ASAN_FACTORY.id}" 
                                data-course-id="${courseId}"
                                class="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 disabled:bg-gray-400"
                                ${isGpsOn || !correctionState || correctionState.currentStep.type !== 'depart' || correctionState.currentStep.locationId !== Calculations.ASAN_FACTORY.id ? 'disabled' : ''}>
                            출발
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    static #renderStopRow(stop, index, gridTemplateColumns) {
        const agency = stop.agency;
        const isRowDisabled = App.state.isEditingLocked || App.state.activeCorrectionCourseId !== null;
        const rowColorClass = this.#getRowColorClass(agency);
        const isSelectedForGrouping = App.state.selectedStopsForGrouping.has(stop.id);
        const groupColor = stop.groupId ? this.#getGroupColor(stop.groupId) : null;

        return `
            <div class="schedule-row group block rounded-lg shadow-md border md:border-b border-gray-200 dark:border-gray-700 md:shadow-none md:rounded-none md:grid text-xs relative select-none ${isSelectedForGrouping ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''}" 
                 data-stop-id="${stop.id}" 
                 data-group-id="${stop.groupId || ''}"
                 draggable="${!isRowDisabled}" 
                 style="grid-template-columns: ${gridTemplateColumns};">
                
                ${groupColor ? `<div class="absolute left-0 top-0 bottom-0 w-1.5 z-10" style="background-color: ${groupColor};" title="그룹화된 경유지"></div>` : ''}

                <!-- 그룹 선택 체크박스 (데스크톱) -->
                <div class="hidden md:flex items-center justify-center px-0.5 py-0.5 border-r dark:border-r-gray-700 bg-white dark:bg-gray-800 ${isSelectedForGrouping ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''}">
                    <input type="checkbox" data-action="toggle-group-selection" data-stop-id="${stop.id}"
                           class="h-3 w-3 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-gray-900 ${isRowDisabled ? 'cursor-not-allowed opacity-50' : ''}"
                           ${isSelectedForGrouping ? 'checked' : ''}
                           ${isRowDisabled ? 'disabled' : ''}>
                </div>

                <!-- 대리점 셀 -->
                <div class="px-0.5 py-0.5 md:border-r dark:md:border-gray-700 flex items-center space-x-0.5 relative rounded-t-lg md:rounded-none ${rowColorClass} overflow-hidden">
                    <!-- 모바일용 체크박스 -->
                    <div class="md:hidden mr-1 flex items-center flex-shrink-0 z-20">
                        <input type="checkbox" data-action="toggle-group-selection" data-stop-id="${stop.id}"
                               class="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-gray-900 ${isRowDisabled ? 'cursor-not-allowed opacity-50' : ''}"
                               ${isSelectedForGrouping ? 'checked' : ''}
                               ${isRowDisabled ? 'disabled' : ''}>
                    </div>
                    ${AgencySelector.render(stop)}
                </div>

                <!-- 시간, 수량, 액션 버튼을 포함하는 컨테이너 -->
                <div class="md:contents ${rowColorClass} rounded-b-lg md:rounded-none">
                    ${this.#renderTimeAndQuantityCells(stop)}
                    
                    <!-- 액션 버튼 영역 (데스크톱에서는 단일 셀) -->
                    <div class="px-0.5 py-0.5 flex items-center md:border-r dark:md:border-gray-700">
                        ${this.#renderActionButtons(stop)}
                    </div>
                </div>
            </div>
        `;
    }

    static #getRowColorClass(agency) {
        if (!agency) return 'bg-white dark:bg-gray-800 md:hover:bg-gray-50 dark:md:hover:bg-gray-700/50';
        
        switch (agency.type) {
            case '중장거리':
                return 'bg-yellow-50 dark:bg-yellow-900/40 md:hover:bg-yellow-100 dark:md:hover:bg-yellow-800/50';
            case '초장거리':
                return 'bg-red-50 dark:bg-red-900/40 md:hover:bg-red-100 dark:md:hover:bg-red-800/50';
            default:
                return 'bg-white dark:bg-gray-800 md:hover:bg-gray-50 dark:md:hover:bg-gray-700/50';
        }
    }

    static #renderTimeAndQuantityCells(stop) {
        const isCorrectionMode = App.state.activeCorrectionCourseId === stop.courseId;
        const correctionState = isCorrectionMode ? App.state.correctionStatesByCourse[stop.courseId] : null;
        const recordedTimes = isCorrectionMode && correctionState && stop.agencyId ? correctionState.recordedTimes[stop.agencyId] : null;
        const isRowDisabled = App.state.isEditingLocked;
        
        const calculatedArrivalTime = Calculations.calculateTime(
            App.state.departureTimesByCourse[stop.courseId] || '07:30',
            stop.arrivalTimeInSeconds
        );
        const arrivalTime = isCorrectionMode ? (recordedTimes?.arrival || '') : (stop.manualArrivalTime || calculatedArrivalTime);

        const calculatedDepartureTime = Calculations.calculateTime(
            App.state.departureTimesByCourse[stop.courseId] || '07:30',
            stop.departureTimeInSeconds
        );
        const departureTime = isCorrectionMode ? (recordedTimes?.departure || '') : (stop.manualDepartureTime || calculatedDepartureTime);

        const travelTimeValue = stop.manualTravelTimeInMinutes ?? Math.round(stop.travelTimeInSeconds / 60);

        const arrivalWarning = this.#renderArrivalWarning(stop, arrivalTime);

        // 보정 모드에서는 recordedTimes에 직접 저장하도록 속성 변경
        const arrivalProperty = isCorrectionMode ? 'correctionArrivalTime' : 'manualArrivalTime';
        const departureProperty = isCorrectionMode ? 'correctionDepartureTime' : 'manualDepartureTime';

        return `
            <!-- 데이터 필드를 위한 Wrapper (모바일에서만 그리드, 데스크톱에선 컨텐츠) -->
            <div class="p-3 grid grid-cols-2 gap-x-4 md:hidden">
                
                <!-- 왼쪽 열 -->
                <div class="space-y-2">
                    <div class="grid grid-cols-2 items-center">
                        <label for="travelTime-${stop.id}-mobile" class="font-medium text-gray-500 dark:text-gray-400">이동시간(분):</label>
                        <input id="travelTime-${stop.id}-mobile" type="number" 
                               class="w-20 text-center stop-time-input p-1 rounded border-gray-300 dark:border-gray-500 bg-gray-50 dark:bg-gray-700 ${isRowDisabled ? 'cursor-not-allowed' : ''}" 
                               data-property="manualTravelTimeInMinutes" value="${travelTimeValue}" min="0" ${isRowDisabled ? 'readonly' : ''}>
                    </div>
                    <div class="grid grid-cols-2 items-center">
                        <span class="font-medium text-gray-500 dark:text-gray-400">작업시간:</span>
                        <span data-value="workTime">${App.calculations.formatMinutes(stop.actualWorkTimeInSeconds)}</span>
                    </div>
                </div>

                <!-- 오른쪽 열 -->
                <div class="space-y-2">
                    <div class="grid grid-cols-2 items-center">
                        <label for="arrivalTime-${stop.id}-mobile" class="font-medium text-gray-500 dark:text-gray-400">도착시간:</label>
                        <div class="flex items-center gap-1">
                            <input id="arrivalTime-${stop.id}-mobile" type="text" 
                                   class="w-20 text-center stop-time-input p-1 rounded border-gray-300 dark:border-gray-500 bg-gray-50 dark:bg-gray-700 ${isRowDisabled ? 'cursor-not-allowed' : ''}" 
                                   data-property="${arrivalProperty}" data-stop-id="${stop.id}" value="${arrivalTime}" ${isRowDisabled ? 'readonly' : ''} maxlength="5" placeholder="HH:MM" data-time-input="true" data-time-picker="true">
                            <button data-action="open-time-picker" 
                                    data-target="arrivalTime-${stop.id}-mobile"
                                    class="bg-indigo-500 text-white px-1 py-1 rounded text-xs hover:bg-indigo-600 ${isRowDisabled ? 'opacity-50 cursor-not-allowed' : ''}" 
                                    ${isRowDisabled ? 'disabled' : ''} title="시간 선택">🕐</button>
                        </div>
                        ${arrivalWarning}
                    </div>
                    <div class="grid grid-cols-2 items-center">
                        <label for="departureTime-${stop.id}-mobile" class="font-medium text-gray-500 dark:text-gray-400">출발시간:</label>
                        <div class="flex items-center gap-1">
                            <input id="departureTime-${stop.id}-mobile" type="text" 
                                   class="w-20 text-center stop-time-input p-1 rounded border-gray-300 dark:border-gray-500 bg-gray-50 dark:bg-gray-700 ${isRowDisabled ? 'cursor-not-allowed' : ''}" 
                                   data-property="${departureProperty}" data-stop-id="${stop.id}" value="${departureTime}" ${isRowDisabled ? 'readonly' : ''} maxlength="5" placeholder="HH:MM" data-time-input="true" data-time-picker="true">
                            <button data-action="open-time-picker" 
                                    data-target="departureTime-${stop.id}-mobile"
                                    class="bg-indigo-500 text-white px-1 py-1 rounded text-xs hover:bg-indigo-600 ${isRowDisabled ? 'opacity-50 cursor-not-allowed' : ''}" 
                                    ${isRowDisabled ? 'disabled' : ''} title="시간 선택">🕐</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 데스크톱용 숨겨진 셀들 -->
            <div class="hidden md:px-0.5 md:py-0.5 md:border-r dark:md:border-gray-700 md:flex md:items-center md:justify-center">
                <input type="number" class="w-12 text-center stop-time-input px-0.5 py-0.5 rounded border-gray-300 dark:border-gray-500 bg-gray-50 dark:bg-gray-700 ${isRowDisabled ? 'cursor-not-allowed' : ''}" 
                       data-property="manualTravelTimeInMinutes" data-stop-id="${stop.id}" value="${travelTimeValue}" min="0" max="300" ${isRowDisabled ? 'readonly' : ''} title="분 단위로 입력 (최대 300분)" style="-webkit-appearance: none; -moz-appearance: textfield;">
            </div>
            <div class="hidden md:px-0.5 md:py-0.5 md:border-r dark:md:border-gray-700 md:flex md:items-center md:justify-center">
                <div class="flex items-center gap-1">
                    <input id="arrivalTime-${stop.id}-desktop" type="text" class="w-14 text-center stop-time-input px-0.5 py-0.5 rounded border-gray-300 dark:border-gray-500 bg-gray-50 dark:bg-gray-700 ${isRowDisabled ? 'cursor-not-allowed' : ''}" 
                           data-property="${arrivalProperty}" data-stop-id="${stop.id}" value="${arrivalTime}" ${isRowDisabled ? 'readonly' : ''} maxlength="5" placeholder="HH:MM" data-time-input="true" data-time-picker="true">
                    <button data-action="open-time-picker" 
                            data-target="arrivalTime-${stop.id}-desktop"
                            class="bg-indigo-500 text-white px-1 py-1 rounded text-xs hover:bg-indigo-600 ${isRowDisabled ? 'opacity-50 cursor-not-allowed' : ''}" 
                            ${isRowDisabled ? 'disabled' : ''} title="시간 선택">🕐</button>
                </div>
                ${arrivalWarning}
            </div>
            <div class="hidden md:px-0.5 md:py-0.5 md:border-r dark:md:border-gray-700 md:flex md:items-center md:justify-center">${App.calculations.formatMinutes(stop.actualWorkTimeInSeconds)}</div>
            <div class="hidden md:px-0.5 md:py-0.5 md:border-r dark:md:border-gray-700 md:flex md:items-center md:justify-center">
                <div class="flex items-center gap-1">
                    <input id="departureTime-${stop.id}-desktop" type="text" class="w-14 text-center stop-time-input px-0.5 py-0.5 rounded border-gray-300 dark:border-gray-500 bg-gray-50 dark:bg-gray-700 ${isRowDisabled ? 'cursor-not-allowed' : ''}" 
                           data-property="${departureProperty}" data-stop-id="${stop.id}" value="${departureTime}" ${isRowDisabled ? 'readonly' : ''} maxlength="5" placeholder="HH:MM" data-time-input="true" data-time-picker="true">
                    <button data-action="open-time-picker" 
                            data-target="departureTime-${stop.id}-desktop"
                            class="bg-indigo-500 text-white px-1 py-1 rounded text-xs hover:bg-indigo-600 ${isRowDisabled ? 'opacity-50 cursor-not-allowed' : ''}" 
                            ${isRowDisabled ? 'disabled' : ''} title="시간 선택">🕐</button>
                </div>
            </div>
        `;
    }

    static #renderArrivalWarning(stop, arrivalTime) {
        if (App.state.activeCorrectionCourseId !== null || arrivalTime === '-' || !stop.agencyId) return '';
        
        const agency = App.state.cache.agenciesMap.get(stop.agencyId);
        if (agency && App.utils.isTimeInUnavailableRange(arrivalTime, agency.unavailableTimes)) {
            return `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-500 inline-block ml-1" viewBox="0 0 20 20" fill="currentColor" title="배송 불가 시간입니다.">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clip-rule="evenodd" />
                </svg>
            `;
        }
        return '';
    }

    static #renderActionButtons(stop) {
        const agency = stop.agency;
        const isRowDisabled = App.state.isEditingLocked || App.state.activeCorrectionCourseId !== null;
        const hasPhone = agency && agency.phone;
        const hasAddress = agency && agency.address;
        const hasMemo = agency && agency.memo;

        return `
            <div class="flex items-center justify-between w-full space-x-2">
                <!-- 수정 버튼 -->
                <button data-action="open-agency-edit-modal" 
                        data-agency-id="${agency?.id}"
                        class="flex-shrink-0 p-1 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:cursor-not-allowed disabled:text-gray-300 dark:disabled:text-gray-600" 
                        title="대리점 정보 수정"
                        ${!agency || isRowDisabled ? 'disabled' : ''}>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 pointer-events-none" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg>
                </button>
                
                <!-- 메모 버튼 -->
                <button data-action="show-memo" 
                        class="flex-shrink-0 p-1 rounded-full ${hasMemo ? 'text-yellow-500 dark:text-yellow-400 hover:text-yellow-600 dark:hover:text-yellow-300' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}" 
                        title="${hasMemo ? '메모 보기/수정' : '메모 추가'}" 
                        ${!agency ? 'disabled' : ''}>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 pointer-events-none" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" /><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" /></svg>
                </button>

                <!-- 전화 버튼 -->
                <button data-action="make-call" 
                        class="flex-shrink-0 p-1 rounded-full disabled:cursor-not-allowed disabled:text-gray-300 disabled:dark:text-gray-600 ${hasPhone ? 'text-green-500 hover:text-green-600 dark:text-green-400 dark:hover:text-green-500' : 'text-gray-400 dark:text-gray-500'}" 
                        title="전화걸기" 
                        ${!hasPhone ? 'disabled' : ''}>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 pointer-events-none" viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>
                </button>

                <!-- 길안내 버튼 -->
                <button data-action="get-directions" 
                        class="flex-grow bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed" 
                        title="길안내" 
                        ${!hasAddress ? 'disabled' : ''}>
                    길안내
                </button>

                <!-- 보정 또는 삭제 버튼 -->
                <div class="flex-shrink-0">
                    ${App.state.activeCorrectionCourseId === stop.courseId && stop.agencyId ? 
                        this.#renderCorrectionButtons(stop) : 
                        this.#renderDeleteButton(stop, isRowDisabled)
                    }
                </div>
            </div>
        `;
    }

    static #renderCorrectionButtons(stop) {
        const correctionState = App.state.correctionStatesByCourse[stop.courseId];
        const isGpsOn = App.state.isGpsAutoRecordEnabled;
        
        return `
            <div class="flex space-x-2">
                <button data-action="correction-arrive" 
                        data-location-id="${stop.agencyId}" 
                        data-course-id="${stop.courseId}"
                        class="bg-green-500 text-white px-4 py-2 rounded text-base hover:bg-green-600 disabled:bg-gray-400"
                        ${isGpsOn || !correctionState || correctionState.currentStep.type !== 'arrive' || correctionState.currentStep.locationId !== stop.agencyId ? 'disabled' : ''}>
                    도착
                </button>
                <button data-action="correction-depart" 
                        data-location-id="${stop.agencyId}" 
                        data-course-id="${stop.courseId}"
                        class="bg-blue-500 text-white px-4 py-2 rounded text-base hover:bg-blue-600 disabled:bg-gray-400"
                        ${isGpsOn || !correctionState || correctionState.currentStep.type !== 'depart' || correctionState.currentStep.locationId !== stop.agencyId ? 'disabled' : ''}>
                    출발
                </button>
            </div>
        `;
    }

    static #renderDeleteButton(stop, isRowDisabled) {
        if (isRowDisabled) return '';
        
        return `
            <button data-action="remove-stop" 
                    class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" 
                    aria-label="${stop.agency?.name || '경유지'} 삭제">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.728-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" />
                </svg>
            </button>
        `;
    }

    static #renderEmptyState() {
        return `
            <div class="p-4 text-center text-gray-500 dark:text-gray-400 col-span-8">
                경유지를 추가해주세요.
            </div>
        `;
    }

    static #renderTotalsRow(totals, gridTemplateColumns) {
        return `
            <div class="schedule-totals bg-gray-200 dark:bg-gray-700 font-bold mt-2 text-sm rounded-lg p-4 md:grid md:p-0 md:rounded-none" 
                 style="grid-template-columns: ${gridTemplateColumns};">
                <div class="hidden md:block p-2 border-r dark:border-r-gray-600 text-center"></div>
                <div class="md:p-2 md:border-r dark:border-r-gray-600 md:text-right font-bold text-lg md:text-sm">총계:</div>
                <div class="flex justify-between mt-2 md:mt-0 md:p-2 md:border-r dark:border-r-gray-600 md:text-center">
                    <span class="md:hidden">총 이동시간:</span>
                    <span data-total="travelTime">${App.calculations.formatHHMM(totals.totalTravelTime)}</span>
                </div>
                <div class="hidden md:block p-2 border-r dark:border-r-gray-600 text-center"></div>
                <div class="flex justify-between md:p-2 md:border-r dark:border-r-gray-600 md:text-center">
                    <span class="md:hidden">총 작업시간:</span>
                    <span data-total="workTime">${App.calculations.formatHHMM(totals.totalWorkTime)}</span>
                </div>
                <div class="hidden md:block p-2 text-center"></div>
            </div>
        `;
    }

    static #getGroupColor(groupId) {
        if (!groupId) return null;
        let hash = 0;
        for (let i = 0; i < groupId.length; i++) {
            hash = groupId.charCodeAt(i) + ((hash << 5) - hash);
            hash = hash & hash;
        }
        const hue = Math.abs(hash % 360);
        return `hsl(${hue}, 60%, 80%)`;
    }
}