export class CourseFilter {
    static render() {
        const selectedCourseId = App.state.agencySettingsCourseFilterId;
        const selectedCourseName = this.#getSelectedCourseName(selectedCourseId);

        return `
            <div class="relative" data-course-filter-container>
                <label for="agency-course-filter-btn" class="sr-only">코스 필터</label>
                <button id="agency-course-filter-btn" 
                        data-action="toggle-agency-course-filter" 
                        class="w-full sm:w-48 text-left p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 flex justify-between items-center text-sm">
                    <span class="truncate">${selectedCourseName}</span>
                    <svg class="w-4 h-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                </button>
                ${App.state.isAgencyCourseFilterOpen ? this.#renderDropdownContent() : ''}
            </div>
        `;
    }

    static #getSelectedCourseName(courseId) {
        switch (courseId) {
            case 'all':
                return '전체 코스';
            case 'unassigned':
                return '코스 미지정';
            default:
                const course = App.state.cache.coursesMap.get(parseInt(courseId, 10));
                return course ? course.name : '전체 코스';
        }
    }

    static #renderDropdownContent() {
        return `
            <div class="absolute z-20 mt-1 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black dark:ring-gray-600 ring-opacity-5 focus:outline-none">
                <div class="p-2 border-b border-gray-200 dark:border-gray-700">
                    <input type="text" id="agency-course-filter-search" 
                           placeholder="코스 검색..." 
                           value="${App.state.agencyCourseFilterSearchQuery}" 
                           class="w-full text-sm p-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:ring-indigo-500 focus:border-indigo-500">
                </div>
                <div id="agency-course-filter-list" class="py-1 max-h-60 overflow-y-auto" role="menu" aria-orientation="vertical">
                    ${this.renderListContent()}
                </div>
            </div>
        `;
    }

    static renderListContent() {
        const query = App.state.agencyCourseFilterSearchQuery;
        
        const baseOptions = [
            { id: 'all', name: '전체 코스' },
            { id: 'unassigned', name: '코스 미지정' }
        ];

        const filteredBaseOptions = query ? 
            baseOptions.filter(opt => App.utils.matchText(opt.name, query)) : 
            baseOptions;

        const filteredCourses = App.state.courses.filter(course => 
            query ? App.utils.matchText(course.name, query) : true
        );

        const options = [...filteredBaseOptions, ...filteredCourses];
        
        if (options.length === 0) {
            return '<p class="px-4 py-2 text-sm text-gray-500">검색 결과가 없습니다.</p>';
        }

        return options.map(option => `
            <button data-action="select-agency-course-filter" 
                    data-course-id="${option.id}" 
                    class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                ${option.name}
            </button>
        `).join('');
    }

    static updateList() {
        if (!App.state.isAgencyCourseFilterOpen) return;
        
        const listContainer = document.getElementById('agency-course-filter-list');
        if (listContainer) {
            listContainer.innerHTML = this.renderListContent();
        }
    }
}