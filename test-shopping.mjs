import { chromium } from 'playwright';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const APP_URL = 'http://localhost:8787/shopping-list.html';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${label}`);
    failed++;
  }
}

const browser = await chromium.launch({
  executablePath: EDGE_PATH,
  headless: false,
});
const page = await browser.newPage();

// localStorage 초기화
await page.goto(APP_URL);
await page.evaluate(() => localStorage.removeItem('shopping'));
await page.reload();

console.log('\n🧪 [1] 아이템 추가 - 버튼 클릭');
await page.fill('#itemInput', '사과');
await page.click('button:text("추가")');
let items = await page.$$('.item');
assert(items.length === 1, '사과 추가됨 (리스트에 1개)');
let text = await page.textContent('.item-text');
assert(text === '사과', '텍스트가 "사과"로 표시됨');
let summary = await page.textContent('#summary');
assert(summary === '1개 중 0개 완료', '요약: 1개 중 0개 완료');

console.log('\n🧪 [2] 아이템 추가 - Enter 키');
await page.fill('#itemInput', '바나나');
await page.press('#itemInput', 'Enter');
items = await page.$$('.item');
assert(items.length === 2, '바나나 추가됨 (리스트에 2개)');

await page.fill('#itemInput', '우유');
await page.press('#itemInput', 'Enter');
items = await page.$$('.item');
assert(items.length === 3, '우유 추가됨 (리스트에 3개)');

console.log('\n🧪 [3] 빈 입력 무시');
const inputBefore = await page.inputValue('#itemInput');
await page.fill('#itemInput', '   ');
await page.click('button:text("추가")');
items = await page.$$('.item');
assert(items.length === 3, '공백 입력 시 아이템이 추가되지 않음');

console.log('\n🧪 [4] 체크(완료) 기능');
const firstCheckbox = page.locator('.item input[type="checkbox"]').first();
await firstCheckbox.click();
const doneItems = await page.$$('.item.done');
assert(doneItems.length === 1, '첫 번째 아이템이 완료 상태로 변경됨');
summary = await page.textContent('#summary');
assert(summary === '3개 중 1개 완료', '요약: 3개 중 1개 완료');
const remaining = await page.textContent('#remaining');
assert(remaining === '남은 항목 2개', '남은 항목 2개');

console.log('\n🧪 [5] 체크 해제 기능');
await firstCheckbox.click();
const doneItemsAfterUncheck = await page.$$('.item.done');
assert(doneItemsAfterUncheck.length === 0, '체크 해제 후 완료 아이템 없음');
summary = await page.textContent('#summary');
assert(summary === '3개 중 0개 완료', '요약: 3개 중 0개 완료');

console.log('\n🧪 [6] 필터 - 미완료');
await firstCheckbox.click(); // 사과 완료 처리
await page.click('.filter-bar button:text-is("미완료")');
items = await page.$$('.item');
assert(items.length === 2, '미완료 필터: 2개 표시 (바나나, 우유)');

console.log('\n🧪 [7] 필터 - 완료');
await page.click('.filter-bar button:text-is("완료")');
items = await page.$$('.item');
assert(items.length === 1, '완료 필터: 1개 표시 (사과)');

console.log('\n🧪 [8] 필터 - 전체');
await page.click('.filter-bar button:text-is("전체")');
items = await page.$$('.item');
assert(items.length === 3, '전체 필터: 3개 모두 표시');

console.log('\n🧪 [9] 개별 아이템 삭제');
const deleteButtons = page.locator('.delete-btn');
await deleteButtons.last().click(); // 우유 삭제
items = await page.$$('.item');
assert(items.length === 2, '삭제 후 2개 남음');
const texts = await page.$$eval('.item-text', els => els.map(e => e.textContent));
assert(!texts.includes('우유'), '"우유" 항목이 삭제됨');

console.log('\n🧪 [10] 완료 항목 일괄 삭제');
await page.click('button.clear-btn');
items = await page.$$('.item');
assert(items.length === 1, '"완료 항목 삭제" 후 1개 남음 (바나나)');
const remainingText = await page.$$eval('.item-text', els => els.map(e => e.textContent));
assert(remainingText.includes('바나나'), '미완료 "바나나"는 유지됨');
assert(!remainingText.includes('사과'), '완료된 "사과"는 삭제됨');

console.log('\n🧪 [11] localStorage 저장 확인');
await page.reload();
items = await page.$$('.item');
assert(items.length === 1, '새로고침 후 데이터 유지됨 (1개)');

console.log('\n' + '='.repeat(45));
console.log(`📊 테스트 결과: 총 ${passed + failed}개 | ✅ ${passed}개 통과 | ❌ ${failed}개 실패`);
console.log('='.repeat(45));

await browser.close();
