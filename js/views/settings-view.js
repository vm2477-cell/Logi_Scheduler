import { AgenciesTab } from '../components/agencies-tab.js';
import { CoursesTab } from '../components/courses-tab.js';
import { DriversTab } from '../components/drivers-tab.js';
import { SystemTab } from '../components/system-tab.js';

export class SettingsView {
    static render() {
        return `
            <div class="space-y-4">
                ${this.renderTabs()}
                <div id="settings-content"></div>
                <div class="mt-8 text-center">
                    <span class="text-xs text-gray-400 dark:text-gray-500">ver ${App.state.appVersion}</span>
                </div>
            </div>
        `;
    }

    static renderTabs() {
        const tabs = [
            { id: 'agencies', name: '대리점' },
            { id: 'courses', name: '코스' },
            { id: 'drivers', name: '배송기사' },
            { id: 'system', name: '시스템' }
        ];

        return `
            <nav class="flex space-x-1 sm:space-x-2 border-b border-gray-200 dark:border-gray-700" 
                 role="navigation" aria-label="Settings tabs">
                ${tabs.map(tab => `
                    <button data-action="switch-settings-tab" 
                            data-tab="${tab.id}" 
                            class="flex-1 sm:flex-none px-2 sm:px-4 py-2 rounded-t text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${this.getTabClass(tab.id)}" 
                            id="${tab.id}-tab-btn">
                        ${tab.name}
                    </button>
                `).join('')}
            </nav>
        `;
    }

    static getTabClass(tabId) {
        const isActive = App.state.activeTab === tabId;
        if (isActive) {
            return 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400';
        } else {
            return 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200';
        }
    }

    static updateContent() {
        if (App.state.viewMode !== 'settings') return;
        
        const settingsContent = document.getElementById('settings-content');
        if (!settingsContent) return;

        let content = '';
        switch (App.state.activeTab) {
            case 'agencies':
                content = AgenciesTab.render();
                break;
            case 'courses':
                content = CoursesTab.render();
                break;
            case 'drivers':
                content = DriversTab.render();
                break;
            case 'system':
                content = SystemTab.render();
                break;
        }

        settingsContent.innerHTML = content;
    }
}