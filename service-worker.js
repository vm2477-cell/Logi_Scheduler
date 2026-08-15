// 서비스 워커 버전 및 캐시 이름 정의
import { APP_VERSION } from './js/config/version.js'; // 상대 경로로 수정
const CACHE_VERSION = APP_VERSION;
const CACHE_NAME = `배송스케줄러-v${CACHE_VERSION}`;

// 캐시할 파일 목록
const FILES_TO_CACHE = [
    './',
    './index.html',
    './release-notes.json',
    './manifest.json',
    './favicon.ico',
    './js/app.js',
    './js/state.js',
    './js/supabase.js',
    './js/components/agencies-tab.js',
    './js/components/agency-selector.js',
    './js/components/course-filter.js',
    './js/components/course-manager.js',
    './js/components/courses-tab.js',
    './js/components/drivers-tab.js',
    './js/components/index.js',
    './js/components/message-preview.js',
    './js/components/modals.js',
    './js/components/notifications.js',
    './js/components/schedule-table.js',
    './js/components/system-tab.js',
    './js/handlers/action-handlers.js',
    './js/handlers/drag-drop.js',
    './js/handlers/event-handlers.js',
    './js/handlers/index.js',
    './js/handlers/resize-handlers.js',
    './js/handlers/ui-handlers.js',
    './js/services/db-service.js',
    './js/services/geolocation-service.js',
    './js/services/storage-service.js',
    './js/utils/calculations.js',
    './js/utils/helpers.js',
    './js/views/history-view.js',
    './js/views/index.js',
    './js/views/manual-view.js',
    './js/views/schedule-view.js',
    './js/views/settings-view.js',
    './js/views/analysis-view.js',
    './js/views/vehicle-log-view.js',
    './Camera202.html',

    // --- 파일 분석 기능 오프라인 지원을 위한 라이브러리 추가 ---
    // 아래 경로는 예시이며, 실제 프로젝트의 파일 경로에 맞게 수정해야 합니다.
    // './js/lib/pdf.min.js', // PDF.js 라이브러리 (파일이 없어 오류가 발생하므로 임시 비활성화)
    // './js/lib/pdf.worker.min.js', // PDF.js 워커 (파일이 없어 오류가 발생하므로 임시 비활성화)

    // --- 외부 CDN 라이브러리 캐싱 (오프라인 지원) ---
    // 중요: 여기에 명시된 URL은 리디렉션 없이 실제 파일을 직접 가리켜야 합니다.
    // 그렇지 않으면 서비스 워커 설치가 실패하여 앱 전체가 오프라인에서 동작하지 않습니다.
    // 'https://cdn.tailwindcss.com/3.4.1', // 설치 시 문제를 일으킬 수 있어 제거. fetch 이벤트에서 동적으로 캐싱됩니다.
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js',

    './images/100.png',
    './images/icon-192x192.png',
    // './images/icon-512x512.png'
];

// 서비스 워커 설치 이벤트
self.addEventListener('install', (event) => {
    console.log(`[Service Worker] v${CACHE_VERSION} 설치 중...`);
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] 필수 파일 캐싱 중...');
            // addAll()은 목록의 파일 중 하나라도 없으면 전체 캐싱이 실패합니다.
            // 오류를 확인하기 위해 .catch()를 추가합니다.
            return cache.addAll(FILES_TO_CACHE).catch(error => {
                console.error('[Service Worker] 캐싱 실패! 파일 목록에 존재하지 않는 파일이 있는지 확인하세요:', error);
                // 중요: 설치 실패를 브라우저에 알리기 위해 에러를 다시 던집니다.
                throw error;
            });
        })
    );
});

// 서비스 워커 활성화 이벤트
self.addEventListener('activate', (event) => {
    console.log(`[Service Worker] v${CACHE_VERSION} 활성화 중...`);
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[Service Worker] 이전 캐시 삭제 중:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    self.clients.claim();
});

// Fetch 이벤트
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') {
        return;
    }

    // 모바일 업데이트 안정성 강화를 위한 네비게이션 요청 특별 처리
    // index.html과 같은 네비게이션 요청은 항상 네트워크에서 최신 버전을 가져오려고 시도합니다.
    // 이는 브라우저의 HTTP 캐시가 오래된 index.html을 반환하여 업데이트를 방해하는 것을 막습니다.
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request, { cache: 'no-cache' })
                .then(networkResponse => {
                    // 네트워크 응답이 정상이 아니면(예: ngrok 오류 페이지), 오프라인으로 간주하고 캐시를 사용합니다.
                    if (!networkResponse.ok) {
                        console.warn(`[Service Worker] Navigation request for ${event.request.url} failed with status ${networkResponse.status}. Serving from cache.`);
                        throw new Error('Server returned a non-OK response for navigation request.');
                    }
                    // 네트워크 성공 시, 응답을 캐시에 저장하고 반환합니다.
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                })
                .catch(() => {
                    // 네트워크 실패(기기 오프라인) 또는 응답 오류(서버 오프라인) 시, 캐시에서 index.html을 찾아서 반환합니다.
                    console.log(`[Service Worker] Serving navigation request for ${event.request.url} from cache.`);
                    return caches.match('./index.html');
                })
        );
        return; // 네비게이션 요청 처리는 여기서 종료
    }

    event.respondWith(
        // 1. 네트워크에 먼저 요청을 보냅니다 (Network First 전략).
        fetch(event.request)
            .then((networkResponse) => {
                // 1a. 네트워크 요청은 성공했지만, 응답이 유효한지(status 200-299) 확인합니다.
                //    단, 외부 CDN 등 CORS 설정이 없는 요청(Opaque Response)은 status가 0입니다. 이는 허용해야 합니다.
                //    ngrok 에러 페이지 등은 status가 200이 아니거나 내용이 다를 수 있습니다.
                if (!networkResponse || (networkResponse.status !== 0 && !networkResponse.ok)) {
                    // 응답이 'ok'가 아니면, 네트워크 에러가 발생한 것처럼 처리하기 위해 에러를 던집니다.
                    // 이렇게 하면 아래 .catch() 블록으로 넘어가 캐시에서 응답을 찾게 됩니다.
                    throw new Error('Server response was not OK');
                }

                // 응답이 유효하면 동적으로 캐시에 추가 (목록에 없더라도 자동 업데이트)
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            })
            .catch((error) => {
                return caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // 캐시에도 없고 네트워크도 안되는 경우 이미지나 특정 페이지에 대한 폴백 제공 가능
                    if (event.request.destination === 'image') {
                        return caches.match('./images/100.png');
                    }
                    return undefined;
                });
            })
    );
});

// 클라이언트로부터의 메시지 수신 (skipWaiting)
self.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});
