// src/utils/leaderboardApi.ts

// The public CSV URL for reading the leaderboard data
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT5VdIRH9XKBagHI-SyRXRZ5_y0qcmCXmeYqpihp78NeQpldb7-Ch5pIz8pNhVi_k6uKeLjfLQSJ1yl/pub?gid=1410995490&single=true&output=csv";

// The Google Apps Script Web App URL for submitting scores (POST)
const POST_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwoOXupPaTSpAO3VkbaYCIvU8T7IGlzQJwYFoKUzbEPNAjwmGTAeTrwqOcuiZYif-sRPg/exec";

export interface LeaderboardEntry {
    nickname: string;
    stage: number;
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
        const response = await fetch(CSV_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        const lines = csvText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        // 첫번째 줄이 헤더일 수 있으므로(Nickname, Stage, Timestamp), 숫자가 아닌 데이터는 무시합니다.
        const entries: LeaderboardEntry[] = [];
        for (const line of lines) {
            const parts = line.split(',');
            if (parts.length >= 2) {
                // 쌍따옴표가 포함될 수 있는 CSV 양식 처리
                const rawNickname = parts[0].replace(/^"|"$/g, '');
                const stage = parseInt(parts[1].replace(/^"|"$/g, ''), 10);

                if (!isNaN(stage)) {
                    entries.push({ nickname: rawNickname, stage });
                }
            }
        }

        // 자체적으로 스테이지 기준 내림차순 정렬 후 Top 5
        entries.sort((a, b) => b.stage - a.stage);
        return entries.slice(0, 5);
    } catch (error) {
        console.error("Failed to fetch CSV leaderboard:", error);
        return [];
    }
}

export async function submitScore(nickname: string, stage: number): Promise<boolean> {
    try {
        await fetch(POST_SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            body: JSON.stringify({ nickname, stage }),
            headers: {
                "Content-Type": "text/plain;charset=utf-8",
            }
        });

        return true;
    } catch (error) {
        console.error("Failed to submit score:", error);
        return false;
    }
}
