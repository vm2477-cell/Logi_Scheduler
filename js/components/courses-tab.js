import { App } from '../app.js';

export class CoursesTab {
    static render() {
        const isAddingOrEditing = App.state.editingCourseId !== null;
        
        return `
            <div class="space-y-4">
                <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div class="w-full sm:w-auto">
                        <label for="course-settings-search" class="sr-only">코스 검색</label>
                        <input type="text" id="course-settings-search" 
                               placeholder="코스 이름 검색..." 
                               value="${App.state.courseSettingsSearchQuery || ''}" 
                               class="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2 rounded text-sm w-full sm:w-48">
                    </div>
                    <div class="w-full sm:w-auto flex justify-end">
                        <button data-action="add-new-course-row" 
                                class="bg-indigo-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed w-full sm:w-auto" 
                                ${isAddingOrEditing ? 'disabled' : ''}>
                            코스 추가
                        </button>
                    </div>
                </div>

                <div id="courses-list-mobile" class="md:hidden space-y-4">
                    ${this.#renderMobileList()}
                </div>

                <div class="hidden md:block overflow-x-auto shadow border-b border-gray-200 dark:border-gray-700 sm:rounded-lg">
                    ${this.#renderDesktopTable()}
                </div>
            </div>
        `;
    }

    static #renderMobileList() {
        const courses = this.#getCoursesWithCounts();
        let html = '';
        
        if (App.state.editingCourseId === 'new') {
            html += this.#renderCourseRow(null, true);
        }
        
        if (courses.length === 0 && App.state.editingCourseId !== 'new') {
            const message = App.state.courseSettingsSearchQuery ? '검색 결과가 없습니다.' : '등록된 코스가 없습니다.';
            return `<div class="p-4 text-center text-gray-500 dark:text-gray-400 border rounded-lg dark:border-gray-700">${message}</div>`;
        }

        html += courses.map(course => {
            const isEditingThisRow = App.state.editingCourseId === course.id;
            return this.#renderCourseRow(course, isEditingThisRow);
        }).join('');
        
        return html;
    }

    static #renderDesktopTable() {
        const courses = this.#getCoursesWithCounts();
        const headerButtonClass = "w-full font-medium uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded";
        
        return `
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead class="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th scope="col" class="p-0 text-xs text-gray-500 dark:text-gray-300">
                            <button data-action="sort-courses" data-key="name" class="${headerButtonClass} px-3 py-3 text-left">
                                코스 이름${this.#renderSortIcon('name')}
                            </button>
                        </th>
                        <th scope="col" class="p-0 text-xs text-gray-500 dark:text-gray-300">
                            <button data-action="sort-courses" data-key="agencyCount" class="${headerButtonClass} px-3 py-3 text-center">
                                소속 대리점 수${this.#renderSortIcon('agencyCount')}
                            </button>
                        </th>
                        <th scope="col" class="p-0 text-xs text-gray-500 dark:text-gray-300">
                            <button data-action="sort-courses" data-key="midRangeMinStops" class="${headerButtonClass} px-3 py-3 text-center">
                                중장거리 기준${this.#renderSortIcon('midRangeMinStops')}
                            </button>
                        </th>
                        <th scope="col" class="p-0 text-xs text-gray-500 dark:text-gray-300">
                            <button data-action="sort-courses" data-key="longRangeMinStops" class="${headerButtonClass} px-3 py-3 text-center">
                                초장거리 기준${this.#renderSortIcon('longRangeMinStops')}
                            </button>
                        </th>
                        <th scope="col" class="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">액션</th>
                    </tr>
                </thead>
                <tbody id="courses-list-desktop" class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    ${this.#renderDesktopTableBody(courses)}
                </tbody>
            </table>
        `;
    }

    static #renderDesktopTableBody(courses) {
        let html = '';
        
        if (App.state.editingCourseId === 'new') {
            html += `<tr><td colspan="5">${this.#renderCourseRow(null, true)}</td></tr>`;
        }
        
        html += courses.map(course => {
            if (App.state.editingCourseId === course.id) {
                return `<tr><td colspan="5">${this.#renderCourseRow(course, true)}</td></tr>`;
            }
            return this.#renderDesktopTableRow(course);
        }).join('');
        
        if (courses.length === 0 && App.state.editingCourseId !== 'new') {
            const message = App.state.courseSettingsSearchQuery ? '검색 결과가 없습니다.' : '등록된 코스가 없습니다.';
            html += `<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">${message}</td></tr>`;
        }
        
        return html;
    }

    static #renderDesktopTableRow(course) {
        const tdClass = "px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300";
        const isAddingOrEditing = App.state.editingCourseId !== null;
        
        const mainRow = `
            <tr data-course-id="${course.id}">
                <td class="${tdClass} font-medium text-gray-900 dark:text-gray-100">${course.name}</td>
                <td class="${tdClass} text-center">${course.agencyCount}</td>
                <td class="${tdClass} text-center">${course.midRangeMinStops ? `${course.midRangeMinStops}곳+` : '-'}</td>
                <td class="${tdClass} text-center">${course.longRangeMinStops ? `${course.longRangeMinStops}곳+` : '-'}</td>
                <td class="px-3 py-2 whitespace-nowrap text-sm space-x-2">
                    <button data-action="start-edit-course-inline" 
                            class="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium" 
                            ${isAddingOrEditing ? 'disabled' : ''}>
                        수정
                    </button>
                    <button data-action="delete-course" 
                            class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300" 
                            ${isAddingOrEditing ? 'disabled' : ''}>
                        삭제
                    </button>
                </td>
            </tr>
        `;

        const memoRow = course.memo ? `
            <tr class="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <td colspan="5" class="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    <span class="font-bold mr-2">메모:</span>${course.memo}
                </td>
            </tr>
        ` : '';

        return mainRow + memoRow;
    }

    static #renderCourseRow(course, isEditing) {
        const data = isEditing ? App.state.editingCourseData : course;
        const agencyCount = isEditing ? '—' : course.agencyCount;
        const inputClass = "w-full bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded p-1 text-sm";

        if (isEditing) {
            return `
                <div data-editing-course-row="true" class="bg-indigo-50 dark:bg-indigo-900/50 p-4 border rounded-lg shadow-md space-y-2">
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label class="font-bold text-xs">코스 이름*</label>
                            <input type="text" name="name" value="${data.name}" class="${inputClass}" required>
                        </div>
                        <div>
                            <label class="font-bold text-xs">중장거리 기준 대리점 수</label>
                            <input type="number" name="midRangeMinStops" value="${data.midRangeMinStops ?? ''}" class="${inputClass}" min="1" placeholder="">
                        </div>
                        <div>
                            <label class="font-bold text-xs">초장거리 기준 대리점 수</label>
                            <input type="number" name="longRangeMinStops" value="${data.longRangeMinStops ?? ''}" class="${inputClass}" min="1" placeholder="">
                        </div>
                    </div>
                    <div>
                        <label class="font-bold text-xs">메모</label>
                        <textarea name="memo" class="${inputClass}" rows="2" placeholder="메모 입력">${data.memo ?? ''}</textarea>
                    </div>
                    <p class="text-sm text-gray-500 dark:text-gray-400">소속 대리점 수: ${agencyCount}</p>
                    <div class="flex justify-end space-x-2 pt-2">
                        <button data-action="save-course-inline" class="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 font-medium">저장</button>
                        <button data-action="cancel-edit-course-inline" class="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100">취소</button>
                    </div>
                </div>
            `;
        } else {
            return `
                <div data-course-id="${course.id}" class="bg-white dark:bg-gray-800 p-4 border rounded-lg shadow-md flex justify-between items-center">
                    <div class="space-y-1">
                        <p class="font-medium text-gray-900 dark:text-gray-100">${course.name}</p>
                        <p class="text-sm text-gray-500 dark:text-gray-400">소속 대리점 수: ${agencyCount}</p>
                        <p class="text-sm text-gray-500 dark:text-gray-400">중장거리 기준: ${course.midRangeMinStops ? `${course.midRangeMinStops}곳 이상` : '미설정'}</p>
                        <p class="text-sm text-gray-500 dark:text-gray-400">초장거리 기준: ${course.longRangeMinStops ? `${course.longRangeMinStops}곳 이상` : '미설정'}</p>
                        ${course.memo ? `<p class="text-sm text-gray-500 dark:text-gray-400 whitespace-pre-wrap">메모: ${course.memo}</p>` : ''}
                    </div>
                    <div class="space-x-2 flex-shrink-0">
                        <button data-action="start-edit-course-inline" 
                                class="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium" 
                                ${App.state.editingCourseId !== null ? 'disabled' : ''}>
                            수정
                        </button>
                        <button data-action="delete-course" 
                                class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300" 
                                ${App.state.editingCourseId !== null ? 'disabled' : ''}>
                            삭제
                        </button>
                    </div>
                </div>
            `;
        }
    }

    static #getCoursesWithCounts() {
        let filteredCourses = App.state.courses;
        const searchQuery = App.state.courseSettingsSearchQuery;
        if (searchQuery && searchQuery.trim() !== '') {
            filteredCourses = filteredCourses.filter(c => App.utils.matchText(c.name, searchQuery));
        }

        const coursesWithCounts = filteredCourses.map(course => ({
            ...course,
            agencyCount: App.state.agencies.filter(a => 
                !a.isDeleted && (a.courseIds || []).includes(course.id)
            ).length
        }));

        const { key: sortKey, order: sortOrder } = App.state.courseSort;
        
        return coursesWithCounts.sort((a, b) => {
            const valA = a[sortKey];
            const valB = b[sortKey];
            let comparison = 0;
            
            if (sortKey === 'agencyCount' || sortKey === 'midRangeMinStops' || sortKey === 'longRangeMinStops') {
                const numA = valA == null ? Infinity : valA;
                const numB = valB == null ? Infinity : valB;
                comparison = numA - numB;
            } else {
                comparison = String(valA || '').localeCompare(String(valB || ''), 'ko-KR');
            }
            
            return sortOrder === 'asc' ? comparison : -comparison;
        });
    }

    static #renderSortIcon(columnKey) {
        if (App.state.courseSort.key !== columnKey) return '';
        return App.state.courseSort.order === 'asc' ? ' ▲' : ' ▼';
    }

    static updateList() {
        const mobileContainer = document.getElementById('courses-list-mobile');
        const desktopContainer = document.getElementById('courses-list-desktop');
        
        if (mobileContainer) {
            mobileContainer.innerHTML = this.#renderMobileList();
        }
        
        if (desktopContainer) {
            desktopContainer.innerHTML = this.#renderDesktopTableBody(this.#getCoursesWithCounts());
        }
    }
}