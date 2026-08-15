// IndexedDB 기반 데이터 서비스
export class DBService {
    constructor() {
        this.db = null;
        this.dbName = 'LogisticsAppDB';
        this.version = 2;
    }

    async open() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                resolve(this.db);
                return;
            }

            const request = indexedDB.open(this.dbName, this.version);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 파일 핸들 저장소
                if (!db.objectStoreNames.contains('fileHandles')) {
                    db.createObjectStore('fileHandles', { keyPath: 'id' });
                }
                
                // 세션 상태 저장소
                if (!db.objectStoreNames.contains('sessionState')) {
                    db.createObjectStore('sessionState', { keyPath: 'id' });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error("IndexedDB error:", event.target.errorCode);
                reject(event.target.errorCode);
            };
        });
    }

    async set(storeName, value) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            
            const store = transaction.objectStore(storeName);
            store.put(value);
        });
    }

    async get(storeName, key) {
        const db = await this.open();
        return new Promise((resolve) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                resolve(undefined);
            };
        });
    }

    async delete(storeName, key) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            
            const store = transaction.objectStore(storeName);
            store.delete(key);
        });
    }

    async getAll(storeName) {
        const db = await this.open();
        return new Promise((resolve) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                resolve([]);
            };
        });
    }

    // 세션 상태 관리
    async saveSessionState(state) {
        const stateToSave = { ...state };
        // 저장할 수 없는 속성 제외
        delete stateToSave.analysisDirHandle;
        delete stateToSave.notificationTimer;
        delete stateToSave.draggedStopId;
        delete stateToSave.isResizing;
        
        // 모든 모달 상태 false로 초기화
        Object.keys(stateToSave).forEach(key => {
            if (key.startsWith('show') && key.endsWith('Modal')) {
                stateToSave[key] = false;
            }
        });

        return this.set('sessionState', { 
            id: 'lastSession', 
            state: stateToSave,
            timestamp: new Date().toISOString()
        });
    }

    async loadSessionState() {
        const saved = await this.get('sessionState', 'lastSession');
        if (saved && saved.state) {
            return saved.state;
        }
        return null;
    }

    // 파일 핸들 관리
    async saveFileHandle(id, handle) {
        return this.set('fileHandles', { id, handle });
    }

    async getFileHandle(id) {
        const result = await this.get('fileHandles', id);
        return result ? result.handle : null;
    }
}