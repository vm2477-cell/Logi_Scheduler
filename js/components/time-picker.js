// 시간 선택 다이얼 컴포넌트
export class TimePicker {
    static #activePicker = null;
    static #activeInput = null;
    static #activeCallback = null;

    // 시간 선택 모달 표시
    static show(inputElement, callback) {
        // 기존 모달이 있으면 닫기
        TimePicker.close();

        TimePicker.#activeInput = inputElement;
        TimePicker.#activeCallback = callback;

        // 현재 값 파싱
        const currentValue = inputElement.value || '00:00';
        const [hours, minutes] = currentValue.split(':').map(Number);
        const currentHour = isNaN(hours) ? 0 : hours;
        const currentMinute = isNaN(minutes) ? 0 : minutes;

        // 모달 생성
        const modal = document.createElement('div');
        modal.className = 'time-picker-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full">
                <h3 class="text-lg font-bold mb-4 text-gray-900 dark:text-white text-center">시간 선택</h3>
                
                <div class="flex items-center justify-center gap-4 mb-6">
                    <!-- 시간 선택 -->
                    <div class="flex flex-col items-center">
                        <label class="text-sm text-gray-600 dark:text-gray-400 mb-2">시간</label>
                        <div class="flex items-center gap-2">
                            <button class="time-hour-up bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 w-10 h-10 rounded-lg text-xl font-bold text-gray-700 dark:text-gray-300">▲</button>
                            <input type="number" 
                                   class="time-hour-input w-16 h-12 text-center text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none" 
                                   value="${currentHour}" 
                                   min="0" 
                                   max="24"
                                   readonly>
                            <button class="time-hour-down bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 w-10 h-10 rounded-lg text-xl font-bold text-gray-700 dark:text-gray-300">▼</button>
                        </div>
                    </div>
                    
                    <span class="text-3xl font-bold text-gray-500 dark:text-gray-400">:</span>
                    
                    <!-- 분 선택 -->
                    <div class="flex flex-col items-center">
                        <label class="text-sm text-gray-600 dark:text-gray-400 mb-2">분</label>
                        <div class="flex items-center gap-2">
                            <button class="time-minute-up bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 w-10 h-10 rounded-lg text-xl font-bold text-gray-700 dark:text-gray-300">▲</button>
                            <input type="number" 
                                   class="time-minute-input w-16 h-12 text-center text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none" 
                                   value="${currentMinute}" 
                                   min="0" 
                                   max="59"
                                   readonly>
                            <button class="time-minute-down bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 w-10 h-10 rounded-lg text-xl font-bold text-gray-700 dark:text-gray-300">▼</button>
                        </div>
                    </div>
                </div>
                
                <!-- 빠른 선택 버튼 -->
                <div class="grid grid-cols-4 gap-2 mb-6">
                    <button class="quick-time-btn bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm py-2 rounded text-gray-700 dark:text-gray-300" data-time="00:00">00:00</button>
                    <button class="quick-time-btn bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm py-2 rounded text-gray-700 dark:text-gray-300" data-time="06:00">06:00</button>
                    <button class="quick-time-btn bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm py-2 rounded text-gray-700 dark:text-gray-300" data-time="12:00">12:00</button>
                    <button class="quick-time-btn bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm py-2 rounded text-gray-700 dark:text-gray-300" data-time="18:00">18:00</button>
                    <button class="quick-time-btn bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm py-2 rounded text-gray-700 dark:text-gray-300" data-time="07:30">07:30</button>
                    <button class="quick-time-btn bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm py-2 rounded text-gray-700 dark:text-gray-300" data-time="08:00">08:00</button>
                    <button class="quick-time-btn bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm py-2 rounded text-gray-700 dark:text-gray-300" data-time="17:00">17:00</button>
                    <button class="quick-time-btn bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm py-2 rounded text-gray-700 dark:text-gray-300" data-time="24:00">24:00</button>
                </div>
                
                <div class="flex justify-end gap-3">
                    <button class="time-picker-cancel bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded hover:bg-gray-300 dark:hover:bg-gray-500">취소</button>
                    <button class="time-picker-confirm bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">확인</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        TimePicker.#activePicker = modal;

        // 이벤트 리스너 등록
        const hourInput = modal.querySelector('.time-hour-input');
        const minuteInput = modal.querySelector('.time-minute-input');
        const hourUp = modal.querySelector('.time-hour-up');
        const hourDown = modal.querySelector('.time-hour-down');
        const minuteUp = modal.querySelector('.time-minute-up');
        const minuteDown = modal.querySelector('.time-minute-down');
        const cancelBtn = modal.querySelector('.time-picker-cancel');
        const confirmBtn = modal.querySelector('.time-picker-confirm');
        const quickBtns = modal.querySelectorAll('.quick-time-btn');

        // 시간 증가/감소
        hourUp.addEventListener('click', () => {
            let value = parseInt(hourInput.value) || 0;
            value = value >= 24 ? 0 : value + 1;
            hourInput.value = value;
        });

        hourDown.addEventListener('click', () => {
            let value = parseInt(hourInput.value) || 0;
            value = value <= 0 ? 24 : value - 1;
            hourInput.value = value;
        });

        // 분 증가/감소
        minuteUp.addEventListener('click', () => {
            let value = parseInt(minuteInput.value) || 0;
            value = value >= 59 ? 0 : value + 5;
            minuteInput.value = value;
        });

        minuteDown.addEventListener('click', () => {
            let value = parseInt(minuteInput.value) || 0;
            value = value <= 0 ? 55 : value - 5;
            minuteInput.value = value;
        });

        // 빠른 선택 버튼
        quickBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const time = btn.dataset.time;
                const [h, m] = time.split(':').map(Number);
                hourInput.value = h;
                minuteInput.value = m;
            });
        });

        // 취소
        cancelBtn.addEventListener('click', () => TimePicker.close());

        // 확인
        confirmBtn.addEventListener('click', () => {
            const hours = parseInt(hourInput.value) || 0;
            const minutes = parseInt(minuteInput.value) || 0;
            const formattedTime = TimePicker.formatTime(hours, minutes);
            
            if (TimePicker.#activeCallback) {
                TimePicker.#activeCallback(formattedTime);
            }
            TimePicker.close();
        });

        // 모달 외부 클릭 시 닫기
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                TimePicker.close();
            }
        });

        // ESC 키로 닫기
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                TimePicker.close();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    // 시간 포맷팅 (24:00 형식 지원)
    static formatTime(hours, minutes) {
        const h = Math.min(Math.max(hours, 0), 24);
        const m = Math.min(Math.max(minutes, 0), 59);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    // 모달 닫기
    static close() {
        if (TimePicker.#activePicker) {
            TimePicker.#activePicker.remove();
            TimePicker.#activePicker = null;
        }
        TimePicker.#activeInput = null;
        TimePicker.#activeCallback = null;
    }
}
