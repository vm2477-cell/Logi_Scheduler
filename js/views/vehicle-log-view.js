import { App } from '../app.js';
import { Helpers } from '../utils/helpers.js';
import { Calculations } from '../utils/calculations.js';

export class VehicleLogView {
    // 정비 알림 계산 (공통 로직 사용)
    static calculateMaintenanceAlerts() {
        return Calculations.calculateMaintenanceAlerts(
            App.state.vehicleLog,
            App.state.maintenanceCategories
        );
    }
    static render() {
        const selectedMonth = App.state.selectedVehicleLogMonth;
        let currentMonthRecords = [];
        
        // "전체" 보기, 연도별 필터, 또는 특정 월별 필터
        if (selectedMonth === 'all') {
            currentMonthRecords = [...App.state.vehicleLog.mileage];
        } else if (selectedMonth && selectedMonth.startsWith('year-')) {
            // 년도 필터
            const year = parseInt(selectedMonth.split('-')[1]);
            currentMonthRecords = App.state.vehicleLog.mileage.filter(record => {
                const recordDate = new Date(record.date);
                return recordDate.getFullYear() === year;
            });
        } else {
            // 월 필터
            const [year, month] = selectedMonth.split('-');
            currentMonthRecords = App.state.vehicleLog.mileage.filter(record => {
                const recordDate = new Date(record.date);
                return recordDate.getFullYear() === parseInt(year) && (recordDate.getMonth() + 1) === parseInt(month);
            });
        }

        // 월별 일주행거리의 합과 주유량 계산
        const allRecordsSorted = [...App.state.vehicleLog.mileage].sort((a, b) => new Date(a.date) - new Date(b.date));
        let totalMileage = 0;
        let totalFuelAmount = 0;
        let totalFuelCost = 0;
        let fuelEntries = 0;

        // 먼저 월별 기록의 일주행거리 계산
        const monthlyRecordIds = new Set(currentMonthRecords.map(r => r.id));
        for (let i = 0; i < allRecordsSorted.length; i++) {
            const curr = allRecordsSorted[i];
            if (monthlyRecordIds.has(curr.id) && i > 0) {
                const prev = allRecordsSorted[i - 1];
                totalMileage += curr.value - prev.value;
            }
        }

        // 월별 주유량 및 금액 합산
        currentMonthRecords.forEach(record => {
            if (record.fuelAmount) {
                totalFuelAmount += record.fuelAmount;
                fuelEntries++;
            }
            if (record.fuelCost) {
                totalFuelCost += record.fuelCost;
            }
        });

        // 현실적인 연비 계산: 주유한 기록만으로 계산
        let totalEfficiencyMileage = 0;
        let totalEfficiencyFuel = 0;
        let lastFuelRecord = null;

        for (const record of allRecordsSorted) {
            if (record.fuelAmount && record.fuelAmount > 0) {
                if (lastFuelRecord) {
                    // 이전 주유부터 현재 주유까지의 주행거리
                    const distanceSinceLastFuel = record.value - lastFuelRecord.value;
                    totalEfficiencyMileage += distanceSinceLastFuel;
                    totalEfficiencyFuel += record.fuelAmount;
                }
                lastFuelRecord = record;
            }
        }

        const averageFuelEfficiency = (totalEfficiencyFuel > 0 && totalEfficiencyMileage > 0)
            ? (totalEfficiencyMileage / totalEfficiencyFuel).toFixed(2)
            : 'N/A';
        
        // 정비 알림 계산
        const maintenanceAlerts = this.calculateMaintenanceAlerts();
        
        let displayPeriod = '전체';
        let buttonText = '전체';
        if (selectedMonth === 'all') {
            displayPeriod = '전체';
            buttonText = '전체';
        } else if (selectedMonth && selectedMonth.startsWith('year-')) {
            displayPeriod = selectedMonth.split('-')[1] + '년';
            buttonText = selectedMonth.split('-')[1] + '년';
        } else if (selectedMonth) {
            displayPeriod = selectedMonth;
            buttonText = selectedMonth;
        }

        return `
            <div class="p-3 sm:p-4 md:p-6 bg-white dark:bg-gray-900 min-h-screen">
                <h2 class="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 sm:mb-6">차계부</h2>

                <!-- 월 선택 필터 -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
                    <h3 class="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200">주행 및 주유 기록 (${displayPeriod})</h3>
                    <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <button id="vehicle-log-month-filter" data-action="toggle-vehicle-log-month-filter"
                                class="px-3 sm:px-4 py-2 sm:py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-xs sm:text-sm font-medium min-h-[44px] w-full sm:w-auto flex items-center justify-center gap-2">
                            <span>📅</span>
                            <span>${buttonText}</span>
                        </button>
                    </div>
                </div>

                <!-- 월 필터 모달 -->
                ${App.state.showVehicleLogMonthFilterModal ? `
                    <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center" data-action="close-vehicle-log-month-filter-modal">
                        <div class="bg-white dark:bg-gray-800 w-full sm:w-auto sm:rounded-lg rounded-t-lg p-4 sm:p-6 space-y-3 sm:space-y-4 shadow-lg">
                            <h4 class="text-lg font-semibold text-gray-800 dark:text-gray-100">기간 선택</h4>
                            <div class="space-y-2">
                                <button data-action="select-vehicle-log-current-month" 
                                        class="w-full p-3 text-left bg-gray-100 dark:bg-gray-700 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded-md text-gray-800 dark:text-gray-200 font-medium transition-colors min-h-[44px]">
                                    이번 달
                                </button>
                                <button data-action="select-vehicle-log-year-picker" 
                                        class="w-full p-3 text-left bg-gray-100 dark:bg-gray-700 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded-md text-gray-800 dark:text-gray-200 font-medium transition-colors min-h-[44px]">
                                    년
                                </button>
                                <button data-action="select-vehicle-log-month-picker" 
                                        class="w-full p-3 text-left bg-gray-100 dark:bg-gray-700 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded-md text-gray-800 dark:text-gray-200 font-medium transition-colors min-h-[44px]">
                                    월
                                </button>
                                <button data-action="select-vehicle-log-all" 
                                        class="w-full p-3 text-left bg-gray-100 dark:bg-gray-700 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded-md text-gray-800 dark:text-gray-200 font-medium transition-colors min-h-[44px]">
                                    전체
                                </button>
                            </div>
                            <button class="w-full p-3 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 rounded-md text-gray-800 dark:text-gray-200 font-medium transition-colors min-h-[44px]"
                                    data-action="close-vehicle-log-month-filter-modal">
                                닫기
                            </button>
                        </div>
                    </div>
                ` : ''}

                <!-- 월 선택기 모달 -->
                ${App.state.showVehicleLogMonthPickerModal ? `
                    ${(() => {
                        const now = new Date();
                        const currentYear = now.getFullYear();
                        const months = [];
                        
                        // 지난 12개월 + 현재월 + 미래 12개월 = 총 25개월
                        for (let i = -12; i <= 12; i++) {
                            const date = new Date(currentYear, now.getMonth() + i, 1);
                            months.push({
                                year: date.getFullYear(),
                                month: date.getMonth() + 1,
                                label: date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })
                            });
                        }
                        
                        return `
                            <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center" data-action="close-vehicle-log-month-picker-modal">
                                <div class="bg-white dark:bg-gray-800 w-full sm:w-96 sm:rounded-lg rounded-t-lg p-4 sm:p-6 shadow-lg">
                                    <h4 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">월 선택</h4>
                                    <div class="space-y-2 max-h-64 overflow-y-auto">
                                        ${months.map(m => `
                                            <button data-action="select-vehicle-log-specific-month" data-year="${m.year}" data-month="${String(m.month).padStart(2, '0')}"
                                                    class="w-full p-3 text-left bg-gray-100 dark:bg-gray-700 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded-md text-gray-800 dark:text-gray-200 font-medium transition-colors min-h-[44px]">
                                                ${m.label}
                                            </button>
                                        `).join('')}
                                    </div>
                                    <button class="w-full p-3 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 rounded-md text-gray-800 dark:text-gray-200 font-medium transition-colors min-h-[44px] mt-4"
                                            data-action="close-vehicle-log-month-picker-modal">
                                        닫기
                                    </button>
                                </div>
                            </div>
                        `;
                    })()}
                ` : ''}

                <!-- 년 선택기 모달 -->
                ${App.state.showVehicleLogYearPickerModal ? `
                    ${(() => {
                        const now = new Date();
                        const currentYear = now.getFullYear();
                        const years = [];
                        
                        // 지난 10년 + 현재년 + 미래 5년 = 총 16년
                        for (let i = -10; i <= 5; i++) {
                            const year = currentYear + i;
                            years.push({
                                year: year,
                                label: `${year}년`
                            });
                        }
                        
                        return `
                            <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center" data-action="close-vehicle-log-year-picker-modal">
                                <div class="bg-white dark:bg-gray-800 w-full sm:w-96 sm:rounded-lg rounded-t-lg p-4 sm:p-6 shadow-lg">
                                    <h4 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">년 선택</h4>
                                    <div class="space-y-2 max-h-64 overflow-y-auto">
                                        ${years.map(y => `
                                            <button data-action="select-vehicle-log-specific-year" data-year="${y.year}"
                                                    class="w-full p-3 text-left bg-gray-100 dark:bg-gray-700 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded-md text-gray-800 dark:text-gray-200 font-medium transition-colors min-h-[44px]">
                                                ${y.label}
                                            </button>
                                        `).join('')}
                                    </div>
                                    <button class="w-full p-3 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 rounded-md text-gray-800 dark:text-gray-200 font-medium transition-colors min-h-[44px] mt-4"
                                            data-action="close-vehicle-log-year-picker-modal">
                                        닫기
                                    </button>
                                </div>
                            </div>
                        `;
                    })()}
                ` : ''}

                <!-- 월별 요약 -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 text-center">
                    <div class="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-sm">
                        <p class="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">총 주행거리</p>
                        <p class="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400">${totalMileage.toLocaleString()} km</p>
                    </div>
                    <div class="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-sm">
                        <p class="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">총 주유량</p>
                        <p class="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400">${totalFuelAmount.toLocaleString()} L</p>
                    </div>
                    <div class="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-sm">
                        <p class="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">총 주유금액</p>
                        <p class="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400">${totalFuelCost.toLocaleString()} 원</p>
                    </div>
                    <div class="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-sm">
                        <p class="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">평균 연비</p>
                        <p class="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400">${averageFuelEfficiency} km/L</p>
                    </div>
                </div>

                <!-- 정비 알림 섹션 -->
                ${maintenanceAlerts.length > 0 ? `
                    <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                        <div class="flex justify-between items-center mb-3">
                            <h3 class="text-lg font-semibold text-yellow-800 dark:text-yellow-200">⚠️ 정비 알림</h3>
                            <span class="text-sm text-yellow-600 dark:text-yellow-400">${maintenanceAlerts.length}개 항목 확인 필요</span>
                        </div>
                        <div class="space-y-3">
                            ${maintenanceAlerts.map(alert => {
                                const statusColors = {
                                    urgent: 'bg-red-500',
                                    warning: 'bg-yellow-500',
                                    caution: 'bg-orange-500'
                                };
                                const statusText = {
                                    urgent: '긴급',
                                    warning: '주의',
                                    caution: '예고'
                                };
                                const bgColor = statusColors[alert.overallStatus];
                                return `
                                    <div class="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                                        <div class="flex justify-between items-center mb-2">
                                            <span class="font-medium text-gray-800 dark:text-gray-200">${alert.category}</span>
                                            <span class="text-xs px-2 py-1 rounded-full text-white ${bgColor}">${statusText[alert.overallStatus]}</span>
                                        </div>
                                        ${alert.kmStatus !== 'none' ? `
                                            <div class="mb-2">
                                                <div class="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                                                    <span>주행거리</span>
                                                    <span>${alert.kmRemaining.toLocaleString()}km 남음</span>
                                                </div>
                                                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                    <div class="${bgColor} h-2 rounded-full transition-all duration-300" style="width: ${alert.kmProgress}%"></div>
                                                </div>
                                            </div>
                                        ` : ''}
                                        ${alert.monthStatus !== 'none' ? `
                                            <div>
                                                <div class="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                                                    <span>기간</span>
                                                    <span>${alert.monthRemaining}개월 남음</span>
                                                </div>
                                                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                    <div class="${bgColor} h-2 rounded-full transition-all duration-300" style="width: ${alert.monthProgress}%"></div>
                                                </div>
                                            </div>
                                        ` : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- 주행 기록 추가 폼 -->
                <div class="bg-gray-100 dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-md mb-4 sm:mb-6">
                    <h4 class="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3">주행 기록 추가</h4>
                    <form data-action="add-mileage-record" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3 items-end">
                        <div class="sm:col-span-1">
                            <label for="mileage-date" class="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">날짜</label>
                            <input type="date" id="mileage-date" name="date" value="${Helpers.formatDate(new Date())}" class="mt-1 block w-full p-2 sm:p-3 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-sm sm:text-base">
                        </div>
                        <div class="sm:col-span-1">
                            <label for="mileage-value" class="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">주행거리 (km)</label>
                            <input type="number" id="mileage-value" name="value" placeholder="예: 123456" class="mt-1 block w-full p-2 sm:p-3 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-sm sm:text-base">
                        </div>
                        <div class="sm:col-span-1">
                            <label for="mileage-fuel-amount" class="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">주유량 (L)</label>
                            <input type="number" step="0.1" id="mileage-fuel-amount" name="fuelAmount" placeholder="예: 50.5" class="mt-1 block w-full p-2 sm:p-3 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-sm sm:text-base">
                        </div>
                        <div class="sm:col-span-1">
                            <label for="mileage-fuel-cost" class="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">주유금액 (원)</label>
                            <input type="number" id="mileage-fuel-cost" name="fuelCost" placeholder="예: 80000" class="mt-1 block w-full p-2 sm:p-3 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-sm sm:text-base">
                        </div>
                        <div class="sm:col-span-1">
                            <button type="submit" class="w-full bg-indigo-600 text-white p-2 sm:p-3 rounded-md hover:bg-indigo-700 text-sm sm:text-base min-h-[44px] font-medium">추가</button>
                        </div>
                    </form>
                </div>

                <!-- 주행 기록 목록 -->
                <div class="overflow-x-auto mb-6 sm:mb-8 shadow-md rounded-lg">
                    <table class="min-w-full bg-white dark:bg-gray-800 overflow-hidden">
                        <thead>
                            <tr>
                                <th class="py-2 px-2 sm:px-4 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">날짜</th>
                                <th class="py-2 px-2 sm:px-4 bg-gray-100 dark:bg-gray-700 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">누적거리</th>
                                <th class="py-2 px-2 sm:px-4 bg-gray-100 dark:bg-gray-700 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">일주행</th>
                                <th class="py-2 px-2 sm:px-4 bg-gray-100 dark:bg-gray-700 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">주유량</th>
                                <th class="py-2 px-2 sm:px-4 bg-gray-100 dark:bg-gray-700 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">주유금액</th>
                                <th class="py-2 px-2 sm:px-4 bg-gray-100 dark:bg-gray-700 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.renderMileageRecords(currentMonthRecords)}
                        </tbody>
                    </table>
                </div>

                <!-- 정비 기록 섹션 -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
                    <h3 class="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200">정비 기록</h3>
                    <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                        <select id="maintenance-filter" data-action="change-maintenance-filter"
                                class="p-2 sm:p-3 w-full sm:w-auto border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-sm sm:text-base">
                            <option value="">전체</option>
                            ${App.state.maintenanceCategories.map(category => `
                                <option value="${category}" ${App.state.selectedMaintenanceFilter === category ? 'selected' : ''}>
                                    ${category}
                                </option>
                            `).join('')}
                        </select>
                        <button data-action="add-maintenance-category" class="bg-blue-500 text-white p-2 sm:p-3 rounded-md hover:bg-blue-600 text-xs sm:text-sm font-medium min-h-[44px] w-full sm:w-auto">항목 추가</button>
                    </div>
                </div>

                <!-- 정비 기록 추가 폼 -->
                <div class="bg-gray-100 dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-md mb-4 sm:mb-6">
                    <h4 class="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3">정비 기록 추가</h4>
                    <form data-action="add-maintenance-record" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3 items-end">
                        <div class="sm:col-span-1">
                            <label for="maint-date" class="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">날짜</label>
                            <input type="date" id="maint-date" name="date" value="${Helpers.formatDate(new Date())}" class="mt-1 block w-full p-2 sm:p-3 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-sm sm:text-base">
                        </div>
                        <div class="sm:col-span-1">
                            <label for="maint-item-select" class="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">항목</label>
                            <select id="maint-item-select" name="item" class="mt-1 block w-full p-2 sm:p-3 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-sm sm:text-base" onchange="if(this.value === '기타') document.getElementById('maint-item-other-container').classList.remove('hidden'); else document.getElementById('maint-item-other-container').classList.add('hidden');">
                                ${App.state.maintenanceCategories.map(category => `<option value="${category}">${category}</option>`).join('')}
                            </select>
                            <div id="maint-item-other-container" class="mt-2 hidden">
                                <input type="text" id="maint-item-other" name="item-other" placeholder="직접 입력" class="block w-full p-2 sm:p-3 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-sm sm:text-base">
                            </div>
                        </div>
                        <div class="sm:col-span-1">
                            <label for="maint-cost" class="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">비용 (원)</label>
                            <input type="number" id="maint-cost" name="cost" placeholder="예: 50000" class="mt-1 block w-full p-2 sm:p-3 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-sm sm:text-base">
                        </div>
                        <div class="sm:col-span-1">
                            <label for="maint-mileage" class="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">주행거리 (km)</label>
                            <input type="number" id="maint-mileage" name="mileage" placeholder="예: 123456" class="mt-1 block w-full p-2 sm:p-3 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-sm sm:text-base">
                        </div>
                        <div class="sm:col-span-1">
                            <button type="submit" class="w-full bg-indigo-600 text-white p-2 sm:p-3 rounded-md hover:bg-indigo-700 text-sm sm:text-base min-h-[44px] font-medium">추가</button>
                        </div>
                        <div class="sm:col-span-2 lg:col-span-5">
                            <label for="maint-notes" class="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">메모</label>
                            <textarea id="maint-notes" name="notes" rows="2" class="mt-1 block w-full p-2 sm:p-3 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-sm sm:text-base"></textarea>
                        </div>
                    </form>
                </div>

                <!-- 정비 기록 목록 -->
                <div class="overflow-x-auto mb-6 sm:mb-8 shadow-md rounded-lg">
                    <table class="min-w-full bg-white dark:bg-gray-800 overflow-hidden">
                        <thead>
                            <tr>
                                <th class="py-2 px-2 sm:px-4 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">날짜</th>
                                <th class="py-2 px-2 sm:px-4 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">항목</th>
                                <th class="py-2 px-2 sm:px-4 bg-gray-100 dark:bg-gray-700 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">비용</th>
                                <th class="py-2 px-2 sm:px-4 bg-gray-100 dark:bg-gray-700 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">주행거리</th>
                                <th class="py-2 px-2 sm:px-4 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">메모</th>
                                <th class="py-2 px-2 sm:px-4 bg-gray-100 dark:bg-gray-700 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.renderMaintenanceRecords(currentMonthRecords)}
                        </tbody>
                    </table>
                </div>

                <!-- 정비 주기 설정 -->
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200">정비 주기 설정</h3>
                    <button data-action="toggle-maintenance-intervals" 
                            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded transition-colors">
                        <span id="maintenance-intervals-toggle-icon">${App.state.isMaintenanceIntervalsCollapsed ? '▼' : '▲'}</span>
                    </button>
                </div>
                <div class="bg-gray-100 dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-md ${App.state.isMaintenanceIntervalsCollapsed ? 'hidden' : ''}">
                    <form data-action="save-maintenance-intervals" class="space-y-3 sm:space-y-4">
                        ${App.state.maintenanceCategories.filter(cat => cat !== '기타').map(category => {
                            const intervalData = App.state.vehicleLog.settings.maintenanceIntervals[category] || { km: 0, months: 0 };
                            const kmValue = typeof intervalData === 'object' ? intervalData.km : intervalData;
                            const monthValue = typeof intervalData === 'object' ? intervalData.months : 0;
                            return `
                                <div class="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 items-center">
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">${category}</label>
                                    <div>
                                        <input type="number" name="interval-km-${category}" value="${kmValue}" placeholder="주행거리 (km)"
                                               class="block w-full p-2 sm:p-3 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-sm sm:text-base">
                                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">km 주기</p>
                                    </div>
                                    <div>
                                        <input type="number" name="interval-months-${category}" value="${monthValue}" placeholder="기간 (개월)"
                                               class="block w-full p-2 sm:p-3 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-sm sm:text-base">
                                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">개월 주기</p>
                                    </div>
                                    <div class="flex justify-end">
                                        <button type="button" data-action="delete-maintenance-category" data-category="${category}"
                                                class="text-red-500 hover:text-red-700 text-sm font-medium p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                            삭제
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                        <button type="submit" class="w-full bg-indigo-600 text-white p-2 sm:p-3 rounded-md hover:bg-indigo-700 text-sm sm:text-base min-h-[44px] font-medium mt-4">정비 주기 저장</button>
                    </form>
                </div>
            </div>
        `;
    }

    static renderMileageRecords(records) {
        // 시간 순으로 정렬하여 이전 기록과의 차이 계산
        const allRecordsSorted = [...App.state.vehicleLog.mileage].sort((a, b) => new Date(a.date) - new Date(b.date));
        const dailyDistanceMap = new Map();

        for (let i = 0; i < allRecordsSorted.length; i++) {
            const curr = allRecordsSorted[i];
            let dailyDistance = 0;

            if (i > 0) {
                const prev = allRecordsSorted[i - 1];
                dailyDistance = curr.value - prev.value;
            }

            dailyDistanceMap.set(curr.id, dailyDistance);
        }

        records.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (records.length === 0) {
            return `<tr><td colspan="6" class="text-center py-4 text-gray-500 dark:text-gray-400">주행 기록이 없습니다.</td></tr>`;
        }

        return records.map(record => {
            const isEditing = App.state.editingMileageId === record.id;
            const displayRecord = isEditing ? App.state.editingMileageData : record;
            const dailyDistance = dailyDistanceMap.get(record.id) || 0;

            if (isEditing) {
                return `
                    <tr class="border-b border-gray-200 dark:border-gray-700" data-editing-mileage-row="true">
                        <td class="py-2 px-2 sm:px-4">
                            <input type="date" name="date" value="${displayRecord.date}" class="w-full bg-transparent border-0 p-0 text-xs sm:text-sm">
                        </td>
                        <td class="py-2 px-2 sm:px-4 text-right">
                            <input type="number" name="value" value="${displayRecord.value}" class="w-full bg-transparent border-0 p-0 text-xs sm:text-sm text-right">
                        </td>
                        <td class="py-2 px-2 sm:px-4 text-right text-gray-500">-</td>
                        <td class="py-2 px-2 sm:px-4 text-right">
                            <input type="number" step="0.1" name="fuelAmount" value="${displayRecord.fuelAmount || ''}" class="w-full bg-transparent border-0 p-0 text-xs sm:text-sm text-right">
                        </td>
                        <td class="py-2 px-2 sm:px-4 text-right">
                            <input type="number" name="fuelCost" value="${displayRecord.fuelCost || ''}" class="w-full bg-transparent border-0 p-0 text-xs sm:text-sm text-right">
                        </td>
                        <td class="py-2 px-2 sm:px-4 text-center whitespace-nowrap">
                            <button data-action="save-mileage-record" data-id="${record.id}" class="text-green-500 hover:text-green-700 mr-1 sm:mr-2 text-xs sm:text-sm">저장</button>
                            <button data-action="cancel-edit-mileage-record" class="text-gray-500 hover:text-gray-700 text-xs sm:text-sm">취소</button>
                        </td>
                    </tr>
                `;
            } else {
                return `
                    <tr class="border-b border-gray-200 dark:border-gray-700">
                        <td class="py-2 px-2 sm:px-4 text-xs sm:text-sm">${Helpers.formatDate(new Date(record.date), 'MM-DD')}</td>
                        <td class="py-2 px-2 sm:px-4 text-right text-xs sm:text-sm">${record.value.toLocaleString()}</td>
                        <td class="py-2 px-2 sm:px-4 text-right text-gray-600 dark:text-gray-300 text-xs sm:text-sm">${dailyDistance > 0 ? '+' + dailyDistance.toLocaleString() : '-'}</td>
                        <td class="py-2 px-2 sm:px-4 text-right text-xs sm:text-sm">${record.fuelAmount ? record.fuelAmount.toLocaleString() : '-'}</td>
                        <td class="py-2 px-2 sm:px-4 text-right text-xs sm:text-sm">${record.fuelCost ? record.fuelCost.toLocaleString() : '-'}</td>
                        <td class="py-2 px-2 sm:px-4 text-center whitespace-nowrap">
                            <button data-action="start-edit-mileage-record" data-id="${record.id}" class="text-blue-500 hover:text-blue-700 mr-1 sm:mr-2 text-xs sm:text-sm">수정</button>
                            <button data-action="delete-mileage" data-id="${record.id}" class="text-red-500 hover:text-red-700 text-xs sm:text-sm">삭제</button>
                        </td>
                    </tr>
                `;
            }
        }).join('');
    }

    static renderMaintenanceRecords(records) {
        // 정비 기록은 주행 기록과 별개로 존재할 수 있으므로 모든 정비 기록을 가져옴
        let maintenanceRecords = App.state.vehicleLog.maintenance || [];

        const filter = App.state.selectedMaintenanceFilter;
        if (filter && filter !== '') {
            maintenanceRecords = maintenanceRecords.filter(record => record.item === filter);
        }

        maintenanceRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (maintenanceRecords.length === 0) {
            return `<tr><td colspan="6" class="text-center py-4 text-gray-500 dark:text-gray-400 text-xs sm:text-sm">정비 기록이 없습니다.</td></tr>`;
        }

        return maintenanceRecords.map(record => {
            const isEditing = App.state.editingMaintenanceId === record.id;
            const displayRecord = isEditing ? App.state.editingMaintenanceData : record;

            if (isEditing) {
                return `
                    <tr class="border-b border-gray-200 dark:border-gray-700" data-editing-maintenance-row="true">
                        <td class="py-2 px-2 sm:px-4">
                            <input type="date" name="date" value="${displayRecord.date}" class="w-full bg-transparent border-0 p-0 text-xs sm:text-sm">
                        </td>
                        <td class="py-2 px-2 sm:px-4">
                            <select name="item-select" class="w-full bg-transparent border-0 p-0 text-xs sm:text-sm" onchange="if(this.value === '기타') this.nextElementSibling.classList.remove('hidden'); else this.nextElementSibling.classList.add('hidden');">
                                ${App.state.maintenanceCategories.map(category => `
                                    <option value="${category}" ${displayRecord.item === category ? 'selected' : ''}>${category}</option>
                                `).join('')}
                                <option value="기타" ${!App.state.maintenanceCategories.includes(displayRecord.item) ? 'selected' : ''}>기타</option>
                            </select>
                            <div class="${App.state.maintenanceCategories.includes(displayRecord.item) ? 'hidden' : ''} mt-1">
                                <input type="text" name="item-other" value="${!App.state.maintenanceCategories.includes(displayRecord.item) ? displayRecord.item : ''}" placeholder="직접 입력" class="w-full bg-transparent border-0 p-0 text-xs sm:text-sm">
                            </div>
                        </td>
                        <td class="py-2 px-2 sm:px-4 text-right">
                            <input type="number" name="cost" value="${displayRecord.cost || ''}" class="w-full bg-transparent border-0 p-0 text-xs sm:text-sm text-right">
                        </td>
                        <td class="py-2 px-2 sm:px-4 text-right">
                            <input type="number" name="mileage" value="${displayRecord.mileage || ''}" class="w-full bg-transparent border-0 p-0 text-xs sm:text-sm text-right">
                        </td>
                        <td class="py-2 px-2 sm:px-4">
                            <textarea name="notes" rows="1" class="w-full bg-transparent border-0 p-0 text-xs sm:text-sm">${displayRecord.notes || ''}</textarea>
                        </td>
                        <td class="py-2 px-2 sm:px-4 text-center whitespace-nowrap">
                            <button data-action="save-maintenance-record" data-id="${record.id}" class="text-green-500 hover:text-green-700 mr-1 sm:mr-2 text-xs sm:text-sm">저장</button>
                            <button data-action="cancel-edit-maintenance-record" class="text-gray-500 hover:text-gray-700 text-xs sm:text-sm">취소</button>
                        </td>
                    </tr>
                `;
            } else {
                return `
                    <tr class="border-b border-gray-200 dark:border-gray-700">
                        <td class="py-2 px-2 sm:px-4 text-xs sm:text-sm">${Helpers.formatDate(new Date(record.date), 'MM-DD')}</td>
                        <td class="py-2 px-2 sm:px-4 text-xs sm:text-sm">${record.item}</td>
                        <td class="py-2 px-2 sm:px-4 text-right text-xs sm:text-sm">${record.cost ? record.cost.toLocaleString() : '-'}</td>
                        <td class="py-2 px-2 sm:px-4 text-right text-xs sm:text-sm">${record.mileage ? record.mileage.toLocaleString() : '-'}</td>
                        <td class="py-2 px-2 sm:px-4 truncate max-w-[100px] sm:max-w-[150px] text-xs sm:text-sm">${record.notes || '-'}</td>
                        <td class="py-2 px-2 sm:px-4 text-center whitespace-nowrap">
                            <button data-action="start-edit-maintenance-record" data-id="${record.id}" class="text-blue-500 hover:text-blue-700 mr-1 sm:mr-2 text-xs sm:text-sm">수정</button>
                            <button data-action="delete-maintenance" data-id="${record.id}" class="text-red-500 hover:text-red-700 text-xs sm:text-sm">삭제</button>
                        </td>
                    </tr>
                `;
            }
        }).join('');
    }
}