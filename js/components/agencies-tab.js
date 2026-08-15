export class AgenciesTab {
    static render() {
        return `
            <div class="space-y-4">
                ${this.#renderHeader()}
                <div id="agencies-list-mobile" class="md:hidden space-y-4">
                    ${this.#renderMobileList()}
                </div>
                <div class="hidden md:block overflow-x-auto shadow border-b border-gray-200 dark:border-gray-700 sm:rounded-lg">
                    ${this.#renderDesktopTable()}
                </div>
            </div>
        `;
    }

    static #renderHeader() {
        const isAddingOrEditing = App.state.editingAgencyId !== null;
        
        return `
            <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div class="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                    <div class="w-full sm:w-auto">
                        <label for="agency-settings-search" class="sr-only">대리점 검색</label>
                        <input type="text" id="agency-settings-search" 
                               placeholder="대리점 또는 코스명 검색..." 
                               value="${App.state.agencySettingsSearchQuery}" 
                               class="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2 rounded text-sm w-full sm:w-48">
                    </div>
                </div>
                <div class="w-full sm:w-auto flex justify-end">
                    <button data-action="add-new-agency-row" 
                            class="bg-indigo-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed w-full sm:w-auto" 
                            ${isAddingOrEditing ? 'disabled' : ''}>
                        대리점 추가
                    </button>
                </div>
            </div>
        `;
    }

    static #renderMobileList() {
        const agencies = this.#getFilteredAndSortedAgencies();
        let html = '';
        
        if (App.state.editingAgencyId === 'new') {
            html += this.#renderAgencyRow(null, true);
        }
        
        html += agencies.map(agency => {
            const isEditingThisRow = App.state.editingAgencyId === agency.id;
            return this.#renderAgencyRow(agency, isEditingThisRow);
        }).join('');
        
        return html;
    }

    static #renderDesktopTable() {
        const agencies = this.#getFilteredAndSortedAgencies();
        const headerButtonClass = "w-full text-left font-medium uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded";
        
        return `
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
                <thead class="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th scope="col" class="p-0 text-xs text-gray-500 dark:text-gray-300" style="width: 5%;">
                            <button data-action="sort-agencies" data-key="priority" class="${headerButtonClass} px-3 py-3 text-center">
                                우선순위${this.#renderSortIcon('priority')}
                            </button>
                        </th>
                        <th scope="col" class="p-0 text-xs text-gray-500 dark:text-gray-300" style="width: 12%;">
                            <button data-action="sort-agencies" data-key="name" class="${headerButtonClass} px-3 py-3">
                                대리점명${this.#renderSortIcon('name')}
                            </button>
                        </th>
                        <th scope="col" class="p-0 text-xs text-gray-500 dark:text-gray-300" style="width: 6%;">
                            <button data-action="sort-agencies" data-key="type" class="${headerButtonClass} px-3 py-3">
                                구분${this.#renderSortIcon('type')}
                            </button>
                        </th>
                        <th scope="col" class="p-0 text-xs text-gray-500 dark:text-gray-300" style="width: 6%;">
                            <button data-action="sort-agencies" data-key="palletMethod" class="${headerButtonClass} px-3 py-3">
                                하차방식${this.#renderSortIcon('palletMethod')}
                            </button>
                        </th>
                        <th scope="col" class="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style="width: 5%;">하차위치</th>
                        <th scope="col" class="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style="width: 22%;">주소</th>
                        <th scope="col" class="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style="width: 7%;">좌표</th>
                        <th scope="col" class="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style="width: 5%;">반경(m)</th>
                        <th scope="col" class="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style="width: 7%;">연락처</th>
                        <th scope="col" class="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style="width: 10%;">배송 불가</th>
                        <th scope="col" class="p-0 text-xs text-gray-500 dark:text-gray-300" style="width: 10%;">
                            <button data-action="sort-agencies" data-key="courseIds" class="${headerButtonClass} px-3 py-3">
                                코스${this.#renderSortIcon('courseIds')}
                            </button>
                        </th>
                        <th scope="col" class="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style="width: 4%;">액션</th>
                    </tr>
                </thead>
                <tbody id="agencies-list-desktop" class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    ${this.#renderDesktopTableBody(agencies)}
                </tbody>
            </table>
        `;
    }

    static #renderDesktopTableBody(agencies) {
        let html = '';
        
        if (App.state.editingAgencyId === 'new') {
            html += `<tr><td colspan="12">${this.#renderAgencyRow(null, true)}</td></tr>`;
        }
        
        html += agencies.map(agency => {
            if (App.state.editingAgencyId === agency.id) {
                return `<tr><td colspan="12">${this.#renderAgencyRow(agency, true)}</td></tr>`;
            }
            return this.#renderDesktopTableRow(agency);
        }).join('');
        
        if (agencies.length === 0 && App.state.editingAgencyId !== 'new') {
            html += '<tr><td colspan="12" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">표시할 대리점이 없습니다.</td></tr>';
        }
        
        return html;
    }

    static #renderDesktopTableRow(agency) {
        const tdClass = "px-3 py-2 text-sm text-gray-700 dark:text-gray-300 align-top";
        const rowColorClass = this.#getRowColorClass(agency);
        
        const mainRow = `
            <tr data-agency-id="${agency.id}" class="${rowColorClass}">
                <td class="${tdClass} text-center">${agency.priority}</td>
                <td class="${tdClass} font-medium text-gray-900 dark:text-gray-100 break-words">${agency.name}</td>
                <td class="${tdClass}">${agency.type}</td>
                <td class="${tdClass}">${agency.palletMethod === 'forklift' ? '지게차' : '수작업'}</td>
                <td class="${tdClass}">${agency.unloadingDoor === 'side' ? '옆문' : '뒷문'}</td>
                <td class="${tdClass} break-words">${agency.address}</td>
                <td class="${tdClass} break-words text-xs">${agency.latitude && agency.longitude ? `${agency.latitude},<br>${agency.longitude}` : '-'}</td>
                <td class="${tdClass} text-center">${agency.geofenceRadius || 20}</td>
                <td class="${tdClass} break-words">${agency.phone}</td>
                <td class="${tdClass} break-words">${agency.unavailableTimes}</td>
                <td class="${tdClass}">${this.#getAgencyCourseNames(agency)}</td>
                <td class="px-3 py-2 text-sm space-x-2 align-top">
                    <button data-action="start-edit-agency-inline" 
                            class="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium" 
                            ${App.state.editingAgencyId !== null ? 'disabled' : ''}>
                        수정
                    </button>
                    <button data-action="delete-agency" 
                            class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300" 
                            ${App.state.editingAgencyId !== null ? 'disabled' : ''}>
                        삭제
                    </button>
                </td>
            </tr>
        `;

        const hasMemo = agency.memo && agency.memo.trim().length > 0;
        const hasPhotos = agency.memoPhotos && agency.memoPhotos.length > 0;

        const memoRow = (hasMemo || hasPhotos) ? `
            <tr data-agency-memo-id="${agency.id}" class="${rowColorClass} border-b border-gray-200 dark:border-gray-700">
                <td colspan="12" class="px-6 py-3 text-sm">
                    <div class="font-bold text-gray-700 dark:text-gray-300">메모:</div>
                    ${hasMemo ? `<div class="whitespace-pre-wrap pl-2 text-gray-800 dark:text-gray-200">${agency.memo}</div>` : ''}
                    ${hasPhotos ? `
                        <div class="mt-2 flex gap-2 overflow-x-auto pb-2">
                            ${agency.memoPhotos.map(p => `
                                <img src="${p.data}" data-action="open-image-viewer" class="h-20 w-20 object-cover rounded border border-gray-300 dark:border-gray-600 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity" alt="메모 사진">
                            `).join('')}
                        </div>
                    ` : ''}
                </td>
            </tr>
        ` : '';

        return mainRow + memoRow;
    }

    static #renderAgencyRow(agency, isEditing) {
        const data = isEditing ? App.state.editingAgencyData : agency;
        const inputClass = "w-full bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded p-1 text-sm";

        if (isEditing) {
            const editingRowColorClass = this.#getEditingRowColorClass(data.type);
            
            return `
                <div data-editing-row="true" class="p-4 border rounded-lg shadow-md ${editingRowColorClass} space-y-2">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="font-bold text-xs">우선순위</label>
                            <input type="number" name="priority" value="${data.priority || '99'}" class="${inputClass}" min="1">
                        </div>
                        <div>
                            <label class="font-bold text-xs">대리점명*</label>
                            <input type="text" name="name" value="${data.name || ''}" class="${inputClass}" required>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="font-bold text-xs">구분</label>
                            <select name="type" class="${inputClass}">
                                <option value="일반" ${data.type === '일반' ? 'selected' : ''}>일반</option>
                                <option value="중장거리" ${data.type === '중장거리' ? 'selected' : ''}>중장거리</option>
                                <option value="초장거리" ${data.type === '초장거리' ? 'selected' : ''}>초장거리</option>
                            </select>
                        </div>
                        <div>
                            <label class="font-bold text-xs">파레트 하차방법</label>
                            <select name="palletMethod" class="${inputClass}">
                                <option value="manual" ${data.palletMethod === 'manual' ? 'selected' : ''}>수작업</option>
                                <option value="forklift" ${data.palletMethod === 'forklift' ? 'selected' : ''}>지게차</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="font-bold text-xs">하차위치</label>
                        <select name="unloadingDoor" class="${inputClass}">
                            <option value="rear" ${data.unloadingDoor === 'rear' ? 'selected' : ''}>뒷문</option>
                            <option value="side" ${data.unloadingDoor === 'side' ? 'selected' : ''}>옆문</option>
                        </select>
                    </div>
                    <div>
                        <label class="font-bold text-xs">주소</label>
                        <div class="flex gap-1">
                            <input type="text" name="address" value="${data.address || ''}" class="flex-grow bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded p-1 text-sm" onblur="App.actions.findCoordinates(event, this)">
                            <button data-action="find-coordinates" class="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 whitespace-nowrap flex-shrink-0" title="주소로 좌표 재검색">재검색</button>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="font-bold text-xs">연락처</label>
                            <input type="tel" name="phone" value="${data.phone || ''}" class="${inputClass}">
                        </div>
                        <div>
                            <label class="font-bold text-xs">지오펜스 반경 (m)</label>
                            <input type="number" name="geofenceRadius" value="${data.geofenceRadius || '20'}" class="${inputClass}" placeholder="기본: 20">
                            <div class="flex gap-1 mt-1">
                                <button type="button" onclick="const input = this.closest('[data-editing-row]').querySelector('[name=geofenceRadius]'); input.value=20; input.dispatchEvent(new Event('input', { bubbles: true }));" class="flex-1 px-1 py-0.5 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-500 dark:hover:bg-gray-400 rounded">일반(20)</button>
                                <button type="button" onclick="const input = this.closest('[data-editing-row]').querySelector('[name=geofenceRadius]'); input.value=150; input.dispatchEvent(new Event('input', { bubbles: true }));" class="flex-1 px-1 py-0.5 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-500 dark:hover:bg-gray-400 rounded">대형(150)</button>
                                <button type="button" onclick="const input = this.closest('[data-editing-row]').querySelector('[name=geofenceRadius]'); input.value=300; input.dispatchEvent(new Event('input', { bubbles: true }));" class="flex-1 px-1 py-0.5 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-500 dark:hover:bg-gray-400 rounded">물류(300)</button>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label class="font-bold text-xs">메모</label>
                        <textarea name="memo" class="${inputClass}" rows="2">${data.memo || ''}</textarea>
                    </div>
                    <div>
                        <label class="font-bold text-xs">배송 불가 시간</label>
                        <input type="text" name="unavailableTimes" value="${data.unavailableTimes || ''}" class="${inputClass}" placeholder="예: 12:00-13:00, 15:00-16:00">
                    </div>
                    <div>
                        <label class="font-bold text-xs">코스</label>
                        ${this.#renderCourseSelector()}
                    </div>
                    <div class="flex justify-end space-x-2 pt-2">
                        <button data-action="save-agency-inline" class="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 font-medium">저장</button>
                        <button data-action="cancel-edit-agency-inline" class="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100">취소</button>
                    </div>
                </div>
            `;
        } else {
            const cardColorClass = this.#getRowColorClass(agency);
            
            return `
                <div data-agency-id="${agency.id}" class="p-4 border rounded-lg shadow-md ${cardColorClass} space-y-2 text-sm">
                    <div class="flex justify-between items-start">
                        <div class="font-bold text-base text-gray-800 dark:text-gray-100">
                            ${agency.name} 
                            <span class="text-xs font-normal text-gray-500 dark:text-gray-400">
                                (${agency.type}, 우선순위: ${agency.priority})
                            </span>
                        </div>
                        <div class="flex space-x-2 flex-shrink-0">
                            <button data-action="start-edit-agency-inline" 
                                    class="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium" 
                                    ${App.state.editingAgencyId !== null ? 'disabled' : ''}>
                                수정
                            </button>
                            <button data-action="delete-agency" 
                                    class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300" 
                                    ${App.state.editingAgencyId !== null ? 'disabled' : ''}>
                                삭제
                            </button>
                        </div>
                    </div>
                    <p><span class="font-semibold w-24 inline-block">주소:</span> ${agency.address || '-'}</p>
                    <p><span class="font-semibold w-24 inline-block">연락처:</span> ${agency.phone || '-'}</p>
                    <p><span class="font-semibold w-24 inline-block">좌표:</span> ${agency.latitude && agency.longitude ? `${agency.latitude}, ${agency.longitude}` : '-'}</p>
                    <p><span class="font-semibold w-24 inline-block">반경:</span> ${agency.geofenceRadius || 20}m</p>
                    ${(agency.memo || (agency.memoPhotos && agency.memoPhotos.length > 0)) ? `
                        <div class="p-2 mt-2 rounded bg-gray-100 dark:bg-gray-700/50">
                            <p class="font-semibold">메모:</p>
                            ${agency.memo ? `<p class="pl-2 text-gray-800 dark:text-gray-200 whitespace-pre-wrap">${agency.memo}</p>` : ''}
                            ${(agency.memoPhotos && agency.memoPhotos.length > 0) ? `
                                <div class="mt-2 flex gap-2 overflow-x-auto pb-1">
                                    ${agency.memoPhotos.map(p => `
                                        <img src="${p.data}" data-action="open-image-viewer" class="h-16 w-16 object-cover rounded border border-gray-300 dark:border-gray-600 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity" alt="메모 사진">
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                    <p><span class="font-semibold w-24 inline-block">하차방식:</span> ${agency.palletMethod === 'forklift' ? '지게차' : '수작업'}</p>
                    <p><span class="font-semibold w-24 inline-block">하차위치:</span> ${agency.unloadingDoor === 'side' ? '옆문' : '뒷문'}</p>
                    <p><span class="font-semibold w-24 inline-block">배송불가:</span> ${agency.unavailableTimes || '-'}</p>
                    <p><span class="font-semibold w-24 inline-block">코스:</span> ${this.#getAgencyCourseNames(agency)}</p>
                </div>
            `;
        }
    }

    static #renderCourseSelector() {
        return `
            <div class="border rounded-md bg-white dark:bg-gray-700">
                <div class="p-2 border-b border-gray-200 dark:border-gray-500">
                    <input type="text" id="agency-course-search" 
                           placeholder="코스 검색 (초성)" 
                           value="${App.state.agencyCourseSearchQuery}" 
                           class="w-full text-sm p-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:ring-indigo-500 focus:border-indigo-500">
                </div>
                <div id="agency-course-selector-list" class="p-2 grid grid-cols-2 gap-x-4 gap-y-2 max-h-48 overflow-y-auto">
                    ${this.#renderCourseSelectorList()}
                </div>
            </div>
        `;
    }

    static #renderCourseSelectorList() {
        const query = App.state.agencyCourseSearchQuery;
        const filteredCourses = App.state.courses
            .filter(c => App.utils.matchText(c.name, query))
            .sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'));
        const currentAgencyCourseIds = App.state.editingAgencyData?.courseIds || [];

        if (filteredCourses.length === 0) {
            return App.state.courses.length === 0 ? 
                '<span class="text-xs text-gray-500 p-1 block col-span-2">등록된 코스 없음</span>' : 
                '<span class="text-xs text-gray-500 p-1 block col-span-2">검색 결과 없음</span>';
        }

        return filteredCourses.map(c => `
            <label class="flex items-center space-x-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-500 rounded px-1 py-1 cursor-pointer">
                <input type="checkbox" name="courseIds" value="${c.id}" 
                       ${currentAgencyCourseIds.includes(c.id) ? 'checked' : ''} 
                       class="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600">
                <span>${c.name}</span>
            </label>
        `).join('');
    }

    static #getFilteredAndSortedAgencies() {
        let filteredAgencies = App.state.agencies.filter(a => !a.isDeleted);

        // 검색어 필터 적용
        const searchQuery = App.state.agencySettingsSearchQuery;
        if (searchQuery && searchQuery.trim() !== '') {
            const searchTerm = searchQuery.toLowerCase();
            filteredAgencies = filteredAgencies.filter(agency => {
                const agencyNameMatch = App.utils.matchText(agency.name, searchTerm);
                const courseNames = this.#getAgencyCourseNames(agency);
                const courseNameMatch = App.utils.matchText(courseNames, searchTerm);
                return agencyNameMatch || courseNameMatch;
            });
        }

        // 정렬 적용
        const { key: sortKey, order: sortOrder } = App.state.agencySort;
        return [...filteredAgencies].sort((a, b) => {
            let valA, valB;
            
            if (sortKey === 'courseIds') {
                valA = this.#getAgencyCourseNames(a);
                valB = this.#getAgencyCourseNames(b);
            } else {
                valA = a[sortKey];
                valB = b[sortKey];
            }

            let comparison = 0;
            if (sortKey === 'priority') {
                valA = valA ?? (sortKey === 'priority' ? 99 : 100);
                valB = valB ?? (sortKey === 'priority' ? 99 : 100);
                comparison = valA - valB;
            } else {
                comparison = String(valA || '').localeCompare(String(valB || ''), 'ko-KR');
            }

            return sortOrder === 'asc' ? comparison : -comparison;
        });
    }

    static #getAgencyCourseNames(agency) {
        if (!agency || !agency.courseIds || agency.courseIds.length === 0) {
            return '미지정';
        }
        return agency.courseIds
            .map(id => App.state.cache.coursesMap.get(id)?.name)
            .filter(Boolean)
            .join(', ');
    }

    static #getRowColorClass(agency) {
        if (!agency) return '';
        
        switch (agency.type) {
            case '중장거리':
                return 'bg-yellow-50 dark:bg-yellow-900/40';
            case '초장거리':
                return 'bg-red-50 dark:bg-red-900/40';
            default:
                return '';
        }
    }

    static #getEditingRowColorClass(type) {
        switch (type) {
            case '중장거리':
                return 'bg-yellow-100 dark:bg-yellow-800/50';
            case '초장거리':
                return 'bg-red-100 dark:bg-red-800/50';
            default:
                return 'bg-indigo-50 dark:bg-indigo-900/50';
        }
    }

    static #renderSortIcon(columnKey) {
        if (App.state.agencySort.key !== columnKey) return '';
        return App.state.agencySort.order === 'asc' ? ' ▲' : ' ▼';
    }

    static updateList() {
        const mobileContainer = document.getElementById('agencies-list-mobile');
        const desktopContainer = document.getElementById('agencies-list-desktop');
        
        if (mobileContainer && desktopContainer) {
            mobileContainer.innerHTML = this.#renderMobileList();
            desktopContainer.innerHTML = this.#renderDesktopTableBody(this.#getFilteredAndSortedAgencies());
        }
    }

    static updateCourseSelectorList(inputElement) {
        if (!inputElement) {
            // If no element is provided, fall back to updating both as a failsafe,
            // though this is not ideal due to duplicate IDs.
            const allLists = document.querySelectorAll('#agency-course-selector-list');
            allLists.forEach(list => {
                list.innerHTML = this.#renderCourseSelectorList();
            });
            return;
        }

        const editingRow = inputElement.closest('[data-editing-row="true"]');
        if (!editingRow) return;

        const listContainer = editingRow.querySelector('#agency-course-selector-list');
        if (listContainer) {
            listContainer.innerHTML = this.#renderCourseSelectorList();
        }
    }
}