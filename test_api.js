const URL = "https://script.google.com/macros/s/AKfycbzCARZ_q8kKwbk0jbKvA4aLqGqQ9Ng0u97Tqo5mX_gnb-cPkVBpKULWHhBs7aHxB04zdQ/exec";
import { writeFileSync } from 'fs';

async function testApi() {
    try {
        const res = await fetch(URL, {
            method: "POST",
            body: JSON.stringify({ nickname: "TestUser", stage: 100 }),
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            }
        });

        const text = await res.text();
        console.log("Status:", res.status);
        writeFileSync('test_response.html', text);
        console.log("Full response saved to test_response.html");

        // 에러 메시지 직접 추출 시도
        const plainText = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        console.log("\n=== 텍스트만 추출 ===\n", plainText.substring(0, 1000));
    } catch (err) {
        console.error(err);
    }
}

testApi();
