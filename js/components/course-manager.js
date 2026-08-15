export class CourseManager {
    static renderDropdown() {
        if (App.state.isEditingLocked || App.state.isCorrectionModeActive) return '';
        
        const activeCourseIds = new Set(
            App.state.editableStops.map(s => s.courseId).filter(id => id !== null)
        );

        return `
            <div class="relative" data-course-manager-container>
                <button data-action="toggle-course-manager" 
                        class="w-full sm:w-48 text-left p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 flex justify-between items-center text-sm">
                    <span>${activeCourseIds.size > 0 ? `${activeCourseIds.size}개 코스 선택됨` : '코스 선택'}</span>
                    <svg class="w-4 h-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                </button>
                ${App.state.isCourseManagerOpen ? this.#renderDropdownContent() : ''}
            </div>
        `;
    }

    static #renderDropdownContent() {
        return `
            <div class="absolute z-20 mt-1 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black dark:ring-gray-600 ring-opacity-5 focus:outline-none">
                <div class="p-2 border-b border-gray-200 dark:border-gray-700">
                    <input type="text" id="course-manager-search" 
                           placeholder="코스 검색 (초성 가능)" 
                           value="${App.state.courseManagerSearchQuery}" 
                           class="w-full text-sm p-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:ring-indigo-500 focus:border-indigo-500">
                </div>
                <div id="course-manager-list" class="py-1 max-h-60 overflow-y-auto" role="menu" aria-orientation="vertical">
                    ${this.renderListContent()}
                </div>
            </div>
        `;
    }

    static renderListContent() {
        const query = App.state.courseManagerSearchQuery;
        const filteredCourses = App.state.courses.filter(course => 
            query ? App.utils.matchText(course.name, query) : true
        );
        
        const activeCourseIds = new Set(
            App.state.editableStops.map(s => s.courseId).filter(id => id !== null)
        );

        if (filteredCourses.length === 0) {
            return '<p class="px-4 py-2 text-sm text-gray-500">일치하는 코스가 없습니다.</p>';
        }

        return filteredCourses.map(course => `
            <label class="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                <input type="checkbox" 
                       data-action="update-daily-courses" 
                       data-course-id="${course.id}" 
                       class="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600" 
                       ${activeCourseIds.has(course.id) ? 'checked' : ''}>
                <span class="ml-3">${course.name}</span>
            </label>
        `).join('');
    }

    static updateList() {
        if (!App.state.isCourseManagerOpen) return;
        
        const listContainer = document.getElementById('course-manager-list');
        if (listContainer) {
            listContainer.innerHTML = this.renderListContent();
        }
    }
}