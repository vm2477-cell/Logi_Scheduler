export class AgencySelector {
    static render(stop) {
        const agency = stop.agencyId ? App.state.cache.agenciesMap.get(stop.agencyId) : null;
        const isRowDisabled = App.state.isEditingLocked || App.state.isCorrectionModeActive;

        return this.#renderDisplayButton(stop, agency, isRowDisabled);
    }

    static #renderDisplayButton(stop, agency, isRowDisabled) {
        return `
            <div class="flex-grow" data-custom-select-id="${stop.id}">
                <button onclick="App.actions.openAgencySelectorModal(null, this)" 
                        data-stop-id="${stop.id}" 
                        class="w-full text-left bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 border-0 focus:ring-0 p-2 rounded cursor-pointer min-h-[44px] touch-manipulation" 
                        ${isRowDisabled ? 'disabled' : ''} 
                        aria-haspopup="dialog">
                    ${agency ? this.#renderAgencyInfo(agency) : this.#renderPlaceholder()}
                </button>
            </div>
        `;
    }

    static #renderAgencyInfo(agency) {
        return `
            <span class="font-medium md:text-sm">${agency.name}</span>
            ${agency.memo ? `
                <span class="block text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap">${agency.memo}</span>
            ` : ''}
        `;
    }

    static #renderPlaceholder() {
        return '<span class="text-gray-400">대리점 선택</span>';
    }

    static renderListContent() {
        const query = App.state.agencySelectorSearchQuery;
        const availableAgencies = this.#getAvailableAgencies();
        const filteredAgencies = query ? 
            availableAgencies.filter(a => App.utils.matchText(a.name, query)) : 
            availableAgencies;
        
        return `
            <button data-action="select-agency" 
                    data-agency-id="" 
                    class="block w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-700" 
                    role="option">
                - 대리점 선택 해제 -
            </button>
            ${filteredAgencies.length > 0 ? 
                filteredAgencies.map(agency => this.#renderAgencyOption(agency)).join('') : 
                this.#renderNoResults()
            }
        `;
    }

    static updateList() {
        const stopId = App.state.activeAgencySelectorStopId;
        if (stopId === null) return;
        
        const listContainer = document.getElementById(`agency-selector-list-container-${stopId}`);
        if (listContainer) {
            listContainer.innerHTML = this.renderListContent();
        }
    }

    static #getAvailableAgencies() {
        return App.state.agencies
            .filter(a => !a.isDeleted)
            .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99) || a.name.localeCompare(b.name, 'ko-KR'));
    }

    static #renderAgencyOption(agency) {
        return `
            <button data-action="select-agency" 
                    data-agency-id="${agency.id}" 
                    class="block w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-700" 
                    role="option">
                ${agency.name}
            </button>
        `;
    }

    static #renderNoResults() {
        return '<div class="px-3 py-2 text-sm text-gray-500">결과 없음</div>';
    }

    static updateForRow(stopId) {
        const row = document.querySelector(`.schedule-row[data-stop-id='${stopId}']`);
        if (!row) return;
        
        const stop = App.state.editableStops.find(s => s.id === stopId);
        if (!stop) return;
        
        const container = row.querySelector(`[data-custom-select-id="${stopId}"]`);
        if (container) {
            const newHtml = this.render(stop);
            container.outerHTML = newHtml;
        }
    }
}