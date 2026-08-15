export class DriversTab {
    static render() {
        return `
            <div class="space-y-4">
                <h3 class="text-lg font-bold">배송기사 관리</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400 -mt-2">
                    휴차표 분석 기능에서 사용될 기사 이름을 관리합니다. PDF 파일의 '기사명'과 정확히 일치해야 합니다.
                </p>
                
                <!-- 새 기사 추가 폼 -->
                <form data-action="add-driver" class="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                    <label for="new-driver-name" class="sr-only">새 기사 이름</label>
                    <input type="text" id="new-driver-name" name="name" placeholder="새 기사 이름" required
                           class="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800">
                    <button type="submit" class="bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-600">추가</button>
                </form>
                
                <!-- 기사 목록 -->
                <div class="border border-gray-200 dark:border-gray-700 rounded-md">
                    <table class="w-full text-sm text-left">
                        <thead class="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th class="p-3">이름</th>
                                <th class="p-3 text-right">작업</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.#renderDriversList()}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    static #renderDriversList() {
        if (App.state.drivers.length === 0) {
            return `
                <tr>
                    <td colspan="2" class="p-4 text-center text-gray-500 dark:text-gray-400">
                        등록된 배송기사가 없습니다.
                    </td>
                </tr>
            `;
        }

        return App.state.drivers.map(driver => {
            if (App.state.editingDriverId === driver.id) {
                return this.#renderEditingRow(driver);
            } else {
                return this.#renderDisplayRow(driver);
            }
        }).join('');
    }

    static #renderEditingRow(driver) {
        return `
            <tr class="border-t border-gray-200 dark:border-gray-700">
                <td class="p-2" colspan="2">
                    <form data-action="save-driver" data-driver-id="${driver.id}" class="flex items-center gap-2">
                        <label for="edit-driver-name-${driver.id}" class="sr-only">기사 이름 수정</label>
                        <input type="text" id="edit-driver-name-${driver.id}" name="name" 
                               value="${App.state.editingDriverData.name}" required
                               class="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800">
                        <button type="submit" class="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-xs">저장</button>
                        <button type="button" data-action="cancel-edit-driver" 
                                class="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 text-xs">취소</button>
                    </form>
                </td>
            </tr>
        `;
    }

    static #renderDisplayRow(driver) {
        return `
            <tr class="border-t border-gray-200 dark:border-gray-700">
                <td class="p-3">${driver.name}</td>
                <td class="p-3 text-right space-x-2">
                    <button data-action="edit-driver" data-driver-id="${driver.id}" 
                            class="text-indigo-600 dark:text-indigo-400 hover:underline text-xs">수정</button>
                    <button data-action="request-delete-driver" data-driver-id="${driver.id}" 
                            class="text-red-600 dark:text-red-400 hover:underline text-xs">삭제</button>
                </td>
            </tr>
        `;
    }

    static updateList() {
        const tbody = document.querySelector('#settings-content tbody');
        if (tbody) {
            tbody.innerHTML = this.#renderDriversList();
        }
    }
}