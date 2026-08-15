import { App } from '../app.js';

export class HistoryView {
    static render() {
        const currentMonth = App.state.historySelectedMonth;
        const availableMonths = this.#getAvailableMonths(); // YYYY-MM 형식
        const filteredSchedules = this.#getFilteredSchedules();

        return `
            <div class="p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">과거 기록</h2>

                <!-- 검색 및 월 선택 필터 -->
                <div class="mb-6 flex flex-col sm:flex-row gap-3 items-center">
                    <!-- 월 선택 드롭다운 -->
                    <div class="w-full sm:w-auto flex-shrink-0">
                        <label for="history-month-select" class="sr-only">월 선택</label>
                        <select id="history-month-select" data-action="filter-history-by-month"
                                class="block w-full sm:w-40 p-2.5 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                            <option value="">전체</option>
                            ${availableMonths.map(month => `
                                <option value="${month}" ${currentMonth === month ? 'selected' : ''}>${month.replace('-', '년 ')}월</option>
                            `).join('')}
                        </select>
                    </div>

                    <!-- 통합 검색창 -->
                    <div class="relative flex-grow">
                        <!-- 돋보기 아이콘 -->
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        
                        <!-- 검색 입력창 (엔터키 지원) -->
                        <input type="text"
                               id="history-search-input"
                               value="${App.state.historySearchQuery}"
                               placeholder="코스, 대리점, 메모 내용 검색..."
                               class="block w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all shadow-sm">

                        <!-- 검색어가 있을 때만 보여주는 'X' 초기화 버튼 -->
                        ${App.state.historySearchQuery ? `
                            <button data-action="clear-history-search"
                                    class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                                    title="검색어 초기화">
                                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        ` : ''}
                    </div>

                    <!-- 검색 실행 버튼 -->
                    <button data-action="search-history"
                            class="flex items-center justify-center px-6 py-2.5 border border-transparent text-sm font-bold rounded-xl shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-95 sm:w-28">
                        <svg class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        검색
                    </button>
                </div>

                ${this.renderSummaryBox(this.calculateSummary(filteredSchedules), currentMonth)}

                <!-- 과거 기록 목록 -->
                <div class="space-y-4 mt-6">
                    ${filteredSchedules.length > 0 ? this.renderHistoryRows(filteredSchedules) : `
                        <div class="text-center py-10 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                            <p class="text-lg font-semibold mb-2">검색 결과가 없습니다.</p>
                            <p>다른 검색어를 입력하거나 월 필터를 변경해보세요.</p>
                        </div>
                    `}
                </div>
                <div class="mt-4 text-center">
                    <span class="text-xs text-gray-400 dark:text-gray-500">ver ${App.state.appVersion}</span>
                </div>
            </div>
        `;
    }

    static #getAvailableMonths() {
        const months = new Set();
        App.state.historySchedules.forEach(schedule => {
            if (schedule.date) months.add(schedule.date.substring(0, 7));
        });
        return Array.from(months).sort().reverse();
    }

    static #getFilteredSchedules() {
        const query = (App.state.historySearchQuery || '').toLowerCase();
        const selectedMonth = App.state.historySelectedMonth;

        return App.state.historySchedules.filter(schedule => {
            const matchesMonth = !selectedMonth || schedule.date.startsWith(selectedMonth);
            const matchesQuery = App.utils.matchText(schedule.searchMetadata, query);
            return matchesMonth && matchesQuery;
        }).sort((a, b) => b.date.localeCompare(a.date));
    }

    static renderHistoryRows(schedules) {
        return schedules.map(schedule => this.#renderScheduleCard(schedule)).join('');
    }

    static #renderScheduleCard(schedule) {
        const isCompletedClass = schedule.isCompleted ? 'border-green-400 dark:border-green-600' : 'border-gray-300 dark:border-gray-600';
        const isCompletedText = schedule.isCompleted ? '완료됨' : '미완료';
        const isCompletedTextColor = schedule.isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400';
        const pendingCorrectionDates = App.state.pendingCorrectionDates || new Set();
        const hasPendingCorrection = pendingCorrectionDates.has(schedule.date);
        
        // 배경색 구분 (2회전, 중장거리, 초장거리)
        let bgClass = 'bg-gray-50 dark:bg-gray-700';
        if (schedule.turnCount > 1) {
            bgClass = 'bg-blue-50 dark:bg-blue-900/30';
        } else if (schedule.distanceType === '초장거리') {
            bgClass = 'bg-red-50 dark:bg-red-900/30';
        } else if (schedule.distanceType === '중장거리') {
            bgClass = 'bg-yellow-50 dark:bg-yellow-900/30';
        }

        return `
            <div class="${bgClass} p-4 rounded-lg shadow-sm border-l-4 ${isCompletedClass}">
                <div class="flex justify-between items-center mb-2">
                    <h3 class="text-xl font-bold text-gray-900 dark:text-white">${schedule.date}</h3>
                    <div class="flex items-center gap-2">
                        <span class="text-sm font-semibold ${isCompletedTextColor}">${isCompletedText}</span>
                        ${hasPendingCorrection ? '<span class="text-orange-500 text-sm font-semibold" title="진행중인 이동시간 기록이 있습니다.">⏱️</span>' : ''}
                    </div>
                </div>
                <p class="text-gray-700 dark:text-gray-300 mb-1">
                    <span class="font-semibold">코스:</span> ${schedule.courseNames} 
                    ${schedule.turnCount > 1 ? `<span class="font-bold text-indigo-500 dark:text-indigo-400">(${schedule.turnCount}회전)</span>` : ''}
                </p>
                <p class="text-gray-700 dark:text-gray-300 mb-3">
                    <span class="font-semibold">대리점:</span> ${schedule.agencyNames}
                </p>
                <div class="flex justify-end space-x-2">
                    <button data-action="view-past" data-date="${schedule.date}" class="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 text-sm font-medium">스케줄 보기</button>
                    <button data-action="load-past" data-date="${schedule.date}" class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm font-medium">현재 날짜로 불러오기</button>
                    <button data-action="request-delete-history" data-date="${schedule.date}" class="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm font-medium">삭제</button>
                </div>
            </div>
        `;
    }

    static calculateSummary(schedules) {
        return schedules.reduce((acc, schedule) => {
            if (schedule.turnCount > 1) acc.turns++;
            else if (schedule.distanceType === '초장거리') acc.longHaul++;
            else if (schedule.distanceType === '중장거리') acc.mediumHaul++;
            else acc.normal++;
            return acc;
        }, { normal: 0, turns: 0, mediumHaul: 0, longHaul: 0 });
    }

    static renderSummaryBox(summary, selectedMonth) {
        const total = summary.normal + summary.turns + summary.mediumHaul + summary.longHaul;
        if (total === 0) {
            return '';
        }
        
        let title;
        if (selectedMonth && selectedMonth !== 'all') {
            const [year, month] = selectedMonth.split('-');
            title = `${year}년 ${parseInt(month, 10)}월 요약`;
        } else {
            title = '요약';
        }

        return `
            <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mt-6">
                <h3 class="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">${title} (총 ${total}건)</h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                        <p class="text-sm text-gray-500 dark:text-gray-400">일반</p>
                        <p class="text-2xl font-bold text-gray-900 dark:text-white">${summary.normal}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500 dark:text-gray-400">2회전</p>
                        <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">${summary.turns}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500 dark:text-gray-400">중장거리</p>
                        <p class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">${summary.mediumHaul}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500 dark:text-gray-400">초장거리</p>
                        <p class="text-2xl font-bold text-red-600 dark:text-red-400">${summary.longHaul}</p>
                    </div>
                </div>
            </div>
        `;
    }
}