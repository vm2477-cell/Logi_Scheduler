import { App } from '../app.js';

export class ManualView {
    static render() {
        return `
            <div class="space-y-6 p-4 pb-20">
                <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100">사용 설명서</h2>
                
                <!-- 목차 -->
                <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                    <h3 class="font-bold mb-2 text-lg text-gray-800 dark:text-gray-100">목차</h3>
                    <ul class="list-disc list-inside space-y-1 text-blue-600 dark:text-blue-400">
                        <li><a href="#section-basic" class="hover:underline">기본 사용법</a></li>
                        <li><a href="#section-tracking" class="hover:underline">이동시간 기록 & GPS</a></li>
                        <li><a href="#section-sms" class="hover:underline">자동 문자 발송</a></li>
                        <li><a href="#section-management" class="hover:underline">대리점 및 코스 관리</a></li>
                        <li><a href="#section-drivers" class="hover:underline">배송기사 관리</a></li>
                        <li><a href="#section-vehicle" class="hover:underline">차계부 관리</a></li>
                        <li><a href="#section-history" class="hover:underline">과거 기록</a></li>
                        <li><a href="#section-message" class="hover:underline">메시지 기능</a></li>
                        <li><a href="#section-backup" class="hover:underline">데이터 백업 및 복원</a></li>
                        <li><a href="#section-cloud" class="hover:underline">클라우드 동기화</a></li>
                    </ul>
                </div>

                <!-- 기본 사용법 -->
                <section id="section-basic" class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-3">
                    <h3 class="text-xl font-bold text-indigo-600 dark:text-indigo-400">1. 기본 사용법</h3>
                    <div class="text-gray-700 dark:text-gray-300 space-y-2">
                        <p><strong>스케줄 확인:</strong> 메인 화면 상단의 날짜를 선택하면 해당 날짜의 배송 스케줄을 확인할 수 있습니다. 각 코스별로 대리점 목록, 도착/출발 시간, 작업 시간이 표시됩니다.</p>
                        <p><strong>코스 선택:</strong> '코스 설정' 드롭다운을 통해 오늘 운행할 코스를 선택하거나 해제할 수 있습니다. 선택된 코스의 대리점들만 스케줄 목록에 표시됩니다.</p>
                        <p><strong>순서 변경:</strong> 각 경유지 행의 핸들(점 3개)을 드래그하거나, 모바일에서 경유지 이름을 길게 눌러 순서를 변경할 수 있습니다.</p>
                        <p><strong>화면 전환 (모바일):</strong> 모바일 환경에서는 화면을 좌우로 스와이프하여 '스케줄', '파일 분석', '설정' 등 다른 메뉴로 빠르게 이동할 수 있습니다.</p>
                        <p><strong>대리점 선택:</strong> '대리점 선택' 버튼을 눌러 검색을 통해 원하는 대리점을 할당할 수 있습니다. 초성 검색을 지원합니다. (예: 'ㅇㅅ' -> '연세')</p>
                        <p><strong>시간 수동 입력:</strong> '이동', '작업', '도착', '출발' 시간은 직접 클릭하여 수정할 수 있습니다. '이동'과 '작업' 시간은 분 단위 숫자로 입력합니다. 수동으로 입력된 시간은 스케줄 계산에 우선적으로 반영됩니다.</p>
                        <p><strong>강제 새로고침:</strong> 화면이 제대로 표시되지 않을 경우, 좌측 상단 모서리의 보이지 않는 버튼을 누르거나 Ctrl+F5를 눌러 앱을 강제로 새로고침할 수 있습니다.</p>
                        <p><strong>수정 잠금:</strong> 모든 스케줄 작성이 완료되면 우측 상단의 '수정 잠금' 버튼을 눌러 스케줄을 완료 처리합니다. 잠금 후에는 수정이 불가능하며, '스케줄 다시 열기'를 통해 다시 편집할 수 있습니다.</p>
                    </div>
                </section>

                <!-- 이동시간 기록 & GPS -->
                <section id="section-tracking" class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-3">
                    <h3 class="text-xl font-bold text-indigo-600 dark:text-indigo-400">2. 이동시간 기록 & GPS</h3>
                    <div class="text-gray-700 dark:text-gray-300 space-y-4">
                        <div>
                            <h4 class="font-bold text-lg mb-1">이동시간 기록 모드</h4>
                            <p>
                                각 코스 헤더의 <span class="text-orange-500 font-bold">이동시간 기록</span> 버튼을 누르면 기록 모드가 시작됩니다.
                                이 모드에서는 실제 도착/출발 시간을 기록하여, 향후 배차 시간 계산의 정확도를 높이는 데 사용됩니다.
                            </p>
                            <ol class="list-decimal list-inside mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                <li>'공장 출발' 버튼을 눌러 시작합니다.</li>
                                <li>각 경유지에 도착하면 '도착' 버튼을, 작업을 마치고 출발할 때 '출발' 버튼을 누릅니다.</li>
                                <li>모든 경유지를 마치고 공장으로 복귀 시 '공장 도착' 버튼을 누르면 기록이 완료되고 평균 시간이 업데이트됩니다.</li>
                                <li class="text-sm text-gray-500 dark:text-gray-400">※ 계획된 순서와 다른 경유지에 먼저 도착하더라도 해당 경유지의 '도착' 버튼을 누르면 순서가 자동 보정되어 기록됩니다.</li>
                            </ol>
                            <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                <strong>수동 시간 입력:</strong> 지오펜스 오류나 버튼 누락으로 기록이 누락된 경우, 보정 모드에서 도착/출발 시간 필드를 직접 클릭하여 시간을 입력하거나 수정할 수 있습니다.
                            </p>
                        </div>
                        
                        <div>
                            <h4 class="font-bold text-lg mb-1">GPS 자동 기록</h4>
                            <div class="space-y-1">
                                <p>
                                    시스템 설정에서 <strong>'GPS 자동 기록'</strong>을 활성화하면, 대리점 설정 반경(기본 20m, 대리점별 설정 가능) 진입/이탈 시 자동으로 도착/출발이 기록됩니다.
                                </p>
                                <ul class="list-disc list-inside text-sm ml-4 space-y-1 text-gray-600 dark:text-gray-400">
                                    <li><strong>최초 사용 시:</strong> 브라우저가 위치 정보 접근 권한을 요청합니다. '허용'을 선택해야 기능이 작동합니다.</li>
                                    <li><strong>작동 원리:</strong> 각 대리점의 좌표를 중심으로 설정된 반경에 진입하거나 이탈할 때 자동으로 '도착' 또는 '출발'이 기록됩니다.</li>
                                    <li><strong>주의:</strong> GPS 정확도에 따라 오차가 발생할 수 있습니다. GPS 신호가 약한 곳(지하 주차장 등)에서는 수동 버튼을 함께 사용하는 것을 권장합니다.</li>
                                    <li><strong>화면 꺼짐 방지:</strong> GPS 기록 중에는 앱이 화면 꺼짐을 방지하여 기록이 중단되지 않도록 합니다.</li>
                                </ul>
                            </div>
                        </div>

                        <div>
                            <h4 class="font-bold text-lg mb-1">아산공장 복귀</h4>
                            <p>
                                코스의 마지막 경유지에서 출발하면 '아산공장 복귀' 행이 표시됩니다.
                                여기서 <strong>'길찾기'</strong> 버튼을 눌러 공장까지의 경로를 내비게이션(카카오내비, 네이버지도, TMAP, 아틀란 등)으로 바로 안내받을 수 있습니다.
                            </p>
                        </div>
                    </div>
                </section>

                <!-- 자동 문자 발송 -->
                <section id="section-sms" class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-3">
                    <h3 class="text-xl font-bold text-indigo-600 dark:text-indigo-400">3. 자동 문자 발송</h3>
                    <div class="text-gray-700 dark:text-gray-300 space-y-2">
                        <p>'설정 > 시스템'에서 '출발 시 자동 문자 발송'을 활성화하면, '이동시간 기록' 모드에서 '출발' 버튼을 누를 때 다음 목적지로 자동으로 출발 문자를 보냅니다. 메시지는 "OO점에서 XX시 XX분에 출발 하였습니다." 형식으로 발송됩니다.</p>
                    </div>
                </section>

                <!-- 대리점 및 코스 관리 -->
                <section id="section-management" class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-3">
                    <h3 class="text-xl font-bold text-indigo-600 dark:text-indigo-400">4. 대리점 및 코스 관리</h3>
                    <div class="text-gray-700 dark:text-gray-300 space-y-2">
                        <p>
                            <strong>대리점 추가/수정:</strong> 설정 탭 > 대리점 관리에서 대리점을 추가하거나 수정할 수 있습니다.
                        </p>
                        <ul class="list-disc list-inside text-sm ml-2 space-y-1">
                            <li><strong>좌표 입력:</strong> 주소를 입력하고 '재검색'을 누르면 위도/경도가 자동 입력됩니다. (GPS 자동 기록에 필수)</li>
                            <li><strong>지오펜스 반경:</strong> 대리점의 크기에 따라 인식 반경(m)을 개별적으로 설정할 수 있습니다. (기본 20m)</li>
                            <li><strong>코스 설정:</strong> 해당 대리점이 속한 코스를 여러 개 선택할 수 있습니다.</li>
                            <li><strong>우선순위:</strong> 대리점별로 기본 우선순위를 설정할 수 있으며, 코스별로 개별 우선순위도 지정할 수 있습니다.</li>
                        </ul>
                        <p>
                            <strong>메모 및 사진 첨부:</strong> 각 대리점 정보에는 텍스트 메모와 함께 사진을 첨부할 수 있습니다. 스케줄 화면의 말풍선 아이콘을 눌러 확인 및 수정이 가능합니다.
                        </p>
                        <p>
                            <strong>길안내 앱 설정:</strong> '설정 > 시스템'에서 TMAP, 카카오내비 등 선호하는 길안내 앱을 기본으로 설정할 수 있습니다.
                        </p>
                        <p>
                            <strong>코스 관리:</strong> 설정 탭 > 코스 관리에서 코스를 추가하거나 수정할 수 있습니다. 코스별로 대리점을 그룹화하여 관리할 수 있습니다.
                        </p>
                    </div>
                </section>

                <!-- 배송기사 관리 -->
                <section id="section-drivers" class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-3">
                    <h3 class="text-xl font-bold text-indigo-600 dark:text-indigo-400">5. 배송기사 관리</h3>
                    <div class="text-gray-700 dark:text-gray-300 space-y-2">
                        <p>
                            <strong>기사 추가/수정:</strong> 설정 탭 > 배송기사에서 기사를 추가하거나 수정할 수 있습니다.
                        </p>
                        <ul class="list-disc list-inside text-sm ml-2 space-y-1">
                            <li><strong>기사 이름:</strong> 기사의 이름을 입력하여 등록합니다.</li>
                            <li><strong>기사 삭제:</strong> 등록된 기사를 삭제할 수 있습니다.</li>
                        </ul>
                        <p>
                            <strong>기사 선택:</strong> 스케줄 화면 상단의 기사 선택 드롭다운을 통해 오늘 운행할 기사를 선택할 수 있습니다.
                        </p>
                    </div>
                </section>

                <!-- 차계부 관리 -->
                <section id="section-vehicle" class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-3">
                    <h3 class="text-xl font-bold text-indigo-600 dark:text-indigo-400">6. 차계부 관리</h3>
                    <div class="text-gray-700 dark:text-gray-300 space-y-2">
                        <p>
                            차량의 운행 및 정비 이력을 관리할 수 있습니다.
                        </p>
                        <ul class="list-disc list-inside space-y-2 pl-4">
                            <li><strong>주행 및 주유 기록:</strong> 날짜별 주행거리와 주유량, 주유 금액을 기록합니다. 월별 요약 통계와 평균 연비가 자동으로 계산됩니다.</li>
                            <li><strong>정비 기록:</strong> 엔진오일 교환 등 정비 내역과 비용을 기록합니다.</li>
                            <li><strong>정비 주기 알림:</strong> '정비 주기 설정'에서 항목별 교체 주기(km, 개월)를 설정하면, 다음 정비 시점이 얼마나 남았는지 프로그레스 바로 시각적으로 확인할 수 있습니다. 긴급도에 따라 빨간색(긴급), 노란색(주의), 주황색(예고)으로 표시됩니다.</li>
                            <li><strong>정비 주기 설정:</strong> 기본 정비 항목(엔진오일, 타이어 등)과 사용자 정의 항목의 교체 주기를 설정할 수 있습니다. 섹션 우측 상단의 화살표 버튼으로 접기/펼치기가 가능합니다.</li>
                            <li><strong>정비 항목 관리:</strong> '항목 추가' 버튼으로 사용자 정의 정비 항목을 추가할 수 있으며, 모든 항목(기본 포함)은 삭제 버튼으로 제거할 수 있습니다.</li>
                        </ul>
                    </div>
                </section>

                <!-- 과거 기록 -->
                <section id="section-history" class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-3">
                    <h3 class="text-xl font-bold text-indigo-600 dark:text-indigo-400">7. 과거 기록</h3>
                    <div class="text-gray-700 dark:text-gray-300 space-y-2">
                        <p>
                            과거의 스케줄 기록을 조회하고 관리할 수 있습니다.
                        </p>
                        <ul class="list-disc list-inside text-sm ml-2 space-y-1">
                            <li><strong>월 필터:</strong> 특정 월의 기록만 필터링하여 볼 수 있습니다.</li>
                            <li><strong>검색:</strong> 코스, 대리점, 메모 내용으로 검색할 수 있습니다.</li>
                            <li><strong>요약 통계:</strong> 일반, 2회전, 중장거리, 초장거리 운행 횟수를 요약하여 볼 수 있습니다.</li>
                            <li><strong>스케줄 보기:</strong> 과거 날짜의 스케줄을 조회할 수 있습니다.</li>
                            <li><strong>현재 날짜로 불러오기:</strong> 과거 스케줄을 현재 날짜로 복사하여 불러올 수 있습니다.</li>
                            <li><strong>삭제:</strong> 과거 기록을 삭제할 수 있습니다.</li>
                        </ul>
                    </div>
                </section>

                <!-- 메시지 기능 -->
                <section id="section-message" class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-3">
                    <h3 class="text-xl font-bold text-indigo-600 dark:text-indigo-400">8. 메시지 기능</h3>
                    <div class="text-gray-700 dark:text-gray-300 space-y-2">
                        <p>
                            배송 관련 메시지를 미리 작성하고 관리할 수 있습니다.
                        </p>
                        <ul class="list-disc list-inside text-sm ml-2 space-y-1">
                            <li><strong>기사 이름:</strong> 스케줄 화면 상단에서 기사 이름을 입력하여 메시지에 포함할 수 있습니다.</li>
                            <li><strong>추가 메시지:</strong> 코스별로 추가 메시지를 입력하여 기본 메시지에 포함할 수 있습니다.</li>
                            <li><strong>메시지 미리보기:</strong> 실제 발송될 메시지를 미리 확인할 수 있습니다.</li>
                            <li><strong>도착 시간 표시:</strong> 메시지에 도착 예정 시간을 포함할지 설정할 수 있습니다.</li>
                            <li><strong>폰트 크기:</strong> 메시지의 폰트 크기를 조절할 수 있습니다.</li>
                        </ul>
                    </div>
                </section>

                <!-- 데이터 백업 및 복원 -->
                <section id="section-backup" class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-3">
                    <h3 class="text-xl font-bold text-indigo-600 dark:text-indigo-400">9. 데이터 백업 및 복원</h3>
                    <div class="text-gray-700 dark:text-gray-300 space-y-2">
                        <p>
                            <strong>설정 탭 > 시스템</strong>에서 모든 데이터를 파일로 백업하거나 복원할 수 있습니다.
                        </p>
                        <ul class="list-disc list-inside text-sm ml-2 space-y-1">
                            <li><strong>전체 데이터 백업:</strong> 현재 앱의 모든 설정, 스케줄, 차계부 데이터를 JSON 파일로 저장합니다.</li>
                            <li><strong>자동 백업:</strong> 매일 앱 실행 시 또는 스케줄 완료 시 자동으로 백업하도록 설정할 수 있습니다.</li>
                            <li><strong>데이터 복원:</strong> 백업된 JSON 파일을 선택하여 데이터를 복원할 수 있습니다.</li>
                        </ul>
                    </div>
                </section>

                <!-- 클라우드 동기화 -->
                <section id="section-cloud" class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-3">
                    <h3 class="text-xl font-bold text-indigo-600 dark:text-indigo-400">10. 클라우드 동기화</h3>
                    <div class="text-gray-700 dark:text-gray-300 space-y-2">
                        <p>
                            <strong>설정 탭 > 시스템</strong>에서 Supabase 클라우드 동기화를 활성화하여 여러 기기 간에 데이터를 동기화할 수 있습니다.
                        </p>
                        <ul class="list-disc list-inside text-sm ml-2 space-y-1">
                            <li><strong>로그인:</strong> 이메일과 비밀번호로 로그인하여 클라우드 동기화를 시작합니다.</li>
                            <li><strong>실시간 동기화:</strong> 데이터 변경 시 자동으로 클라우드에 동기화되며, 다른 기기에서도 실시간으로 반영됩니다.</li>
                            <li><strong>로그아웃:</strong> 로그아웃하면 로컬 데이터만 사용하게 됩니다.</li>
                        </ul>
                    </div>
                </section>

                <div class="text-center text-sm text-gray-500 mt-8">
                    <p>배송 스케줄러 v${App.state.appVersion}</p>
                </div>
            </div>
        `;
    }
}