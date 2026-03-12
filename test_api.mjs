import { writeFileSync } from 'fs';

const URL = "https://script.google.com/macros/s/AKfycbwoOXupPaTSpAO3VkbaYCIvU8T7IGlzQJwYFoKUzbEPNAjwmGTAeTrwqOcuiZYif-sRPg/exec";

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
        console.log("Response saved to test_response.html");

        // HTML 태그 제거하고 텍스트만 추출
        const plainText = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        console.log("\n=== Response Text ===");
        console.log(plainText.substring(0, 1500));
    } catch (err) {
        console.error("Error:", err);
    }
}

testApi();
