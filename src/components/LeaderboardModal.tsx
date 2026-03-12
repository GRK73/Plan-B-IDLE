import { useState, useEffect } from 'react';
import { fetchLeaderboard, LeaderboardEntry } from '../utils/leaderboardApi';
import './LeaderboardModal.css';

interface Props {
    onClose: () => void;
}

export function LeaderboardModal({ onClose }: Props) {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Fetch data when modal opens
        setIsLoading(true);
        fetchLeaderboard().then(data => {
            setLeaderboard(data);
            setIsLoading(false);
        });
    }, []);

    return (
        <div className="modal-overlay" style={{ zIndex: 3000 }}>
            <div className="modal-content leaderboard-modal">
                <button className="close-btn" onClick={onClose}>X</button>
                <h2 className="leaderboard-title">🏆 명예의 전당 (Top 5)</h2>

                <div className="leaderboard-list">
                    {isLoading ? (
                        <div className="loading-text">기록을 불러오는 중...</div>
                    ) : leaderboard.length === 0 ? (
                        <div className="empty-text">아직 등록된 랭커가 없습니다!<br />첫 번째 랭커에 도전하세요.</div>
                    ) : (
                        leaderboard.map((entry, idx) => (
                            <div key={idx} className={`leaderboard-item rank-${idx + 1}`}>
                                <div className="rank-badge">{idx === 0 ? '👑' : `#${idx + 1}`}</div>
                                <div className="player-name">{entry.nickname}</div>
                                <div className="player-stage">스테이지 {entry.stage}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
