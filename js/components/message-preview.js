import { Calculations } from '../utils/calculations.js';

export class MessagePreview {
    static render() {
        return `
            <div id="message-preview-container" class="bg-gray-50 dark:bg-gray-900 p-4 rounded mt-4">
                <div class="flex justify-between items-center mb-2">
                    <h3 class="font-bold text-gray-800 dark:text-gray-200">메시지 미리보기</h3>
                    <div class="flex items-center space-x-2">
                        <span class="text-sm font-medium text-gray-600 dark:text-gray-300">글자 크기:</span>
                        <button data-action="change-font-size" data-amount="-10" 
                                class="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-full text-lg font-bold hover:bg-gray-300 dark:hover:bg-gray-600" 
                                aria-label="글자 크기 줄이기">-</button>
                        <span id="font-size-display" class="text-sm w-12 text-center font-semibold">
                            ${App.state.messageFontSize}%
                        </span>
                        <button data-action="change-font-size" data-amount="10" 
                                class="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-full text-lg font-bold hover:bg-gray-300 dark:hover:bg-gray-600" 
                                aria-label="글자 크기 키우기">+</button>
                    </div>
                </div>
                <p id="message-preview" 
                   class="whitespace-pre-wrap text-gray-800 dark:text-gray-300 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 h-auto" 
                   style="font-size: ${App.state.messageFontSize}%;">
                   ${this.generateMessageText()}
                </p>
                <div class="flex flex-wrap items-center gap-4 mt-4">
                    <button data-action="send-sms" 
                            class="bg-purple-500 text-white px-4 py-2 rounded text-sm hover:bg-purple-600">
                        문자 보내기
                    </button>
                    <label for="toggle-arrival-time-display" class="flex items-center gap-2 cursor-pointer text-sm text-gray-900 dark:text-gray-200">
                        <input type="checkbox" 
                               id="toggle-arrival-time-display" 
                               data-action="toggle-arrival-time-in-message" 
                               class="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600" 
                               ${App.state.showMessageArrivalTime ? 'checked' : ''}>
                        <span>도착예정시간 표시</span>
                    </label>
                </div>
            </div>
        `;
    }

    static generateMessageText() {
        let rotations = App.getters.getRotationsForDay();
        const filterCourseId = App.state.messagePreviewFilterCourseId;

        if (filterCourseId !== null) {
            rotations = rotations.filter(r => r.course.id == filterCourseId);
        }

        if (rotations.length === 0 || App.state.editableStops.length === 0) {
            return `[${App.state.selectedDate}] 스케줄 없음`;
        }
        
        let message = `[${App.state.selectedDate}] 배송 스케줄\n`;
        if (App.state.driverName) message += `기사: ${App.state.driverName}\n`;
        message += `출발지: ${Calculations.ASAN_FACTORY.name}\n`;
        
        const allStops = App.state.editableStops;

        rotations.forEach((rotation, index) => {
            const course = rotation.course;
            const departureTime = App.state.departureTimesByCourse[course.id] || '07:30';
            const stopsWithTimes = Calculations.calculateScheduleTimes(
                rotation.stops,
                departureTime,
                App.state.cache.agenciesMap,
                App.state.travelTimes,
                {
                    workTimePerBox: App.state.workTimePerBox,
                    workTimePerPalletForklift: App.state.workTimePerPalletForklift,
                    workTimePerPalletManual: App.state.workTimePerPalletManual
                },
                App.state.commonPallets
            );
            
            const stopCount = rotation.stops.filter(s => s.agencyId).length;

            message += `\n--- ${course.name} (출발: ${departureTime}) ---\n`;
            
            if (stopCount > 0) {
                stopsWithTimes
                    .filter(s => s.agencyId)
                    .forEach((stop, idx) => {
                        let arrivalTimeDisplay = '';
                        // 도착 시간은 다음 경로 데이터 존재 여부(isPathDataComplete)와 상관없이 
                        // 계산된 시간 값이 있으면 표시하도록 수정
                        if (App.state.showMessageArrivalTime && stop.arrivalTimeInSeconds !== null) {
                            arrivalTimeDisplay = ` (도착: ${Calculations.calculateTime(departureTime, stop.arrivalTimeInSeconds)})`;
                        }
                        
                        const agency = App.state.cache.agenciesMap.get(stop.agencyId);
                        if (agency) {
                            message += `${idx + 1}. ${agency.name}${arrivalTimeDisplay}\n`;
                        }
                    });
            } else {
                message += `경유지 없음\n`;
            }
            
            // 코스별 추가 메시지
            const courseMessage = App.state.additionalMessagesByCourse[course.id];
            if (courseMessage) {
                message += `\n${courseMessage}\n`;
            }
        });

        // 코스 미지정 추가 메시지
        const unassignedMessage = App.state.additionalMessagesByCourse['null'];
        if (unassignedMessage) {
            message += `\n[코스 미지정 관련] ${unassignedMessage}\n`;
        }

        return message;
    }

    static update() {
        const preview = document.getElementById('message-preview');
        if (preview) {
            preview.textContent = this.generateMessageText();
            preview.style.fontSize = `${App.state.messageFontSize}%`;
        }
        
        const fontSizeDisplay = document.getElementById('font-size-display');
        if (fontSizeDisplay) {
            fontSizeDisplay.textContent = `${App.state.messageFontSize}%`;
        }
    }
}