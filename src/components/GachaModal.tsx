import { useState, useEffect, useMemo } from 'react';
import { CHARACTER_DATA } from '../data/characters';
import { getCardImageUrl } from '../utils/assets';
import './GachaModal.css';

interface Props {
  results: string[];
  onClose: () => void;
  onPullAgain: (times: number | 'max') => void;
}

export function GachaResultModal({ results, onClose, onPullAgain }: Props) {
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    setAnimationKey(prev => prev + 1);
  }, [results]);

  const isBulk = results.length > 10;

  const aggregatedResults = useMemo(() => {
    if (!isBulk) return [];
    
    const counts: Record<string, number> = {};
    results.forEach(id => {
      counts[id] = (counts[id] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([id, count]) => {
        const char = CHARACTER_DATA.find(c => c.id === id);
        return { char, count };
      })
      .filter(item => item.char !== undefined)
      .sort((a, b) => {
        const tierOrder: Record<string, number> = { 'SR': 4, 'R': 3, 'U': 2, 'C': 1 };
        const tierDiff = tierOrder[b.char!.tier] - tierOrder[a.char!.tier];
        if (tierDiff !== 0) return tierDiff;
        return a.char!.name.localeCompare(b.char!.name);
      });
  }, [results, isBulk]);

  return (
    <div className="modal-overlay gacha-fullscreen-overlay">
      <div className="gacha-fullscreen-content" key={animationKey}>
        <h2 className="gacha-title">사원 모집 결과 ({results.length}회)</h2>
        
        {isBulk ? (
          <div className="gacha-bulk-grid">
            {aggregatedResults.map((item, idx) => (
              <div 
                key={item.char!.id} 
                className="gacha-bulk-item"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className={`bulk-avatar tier-border-${item.char!.tier}`}>
                  <img src={getCardImageUrl(item.char!.id)} alt="character" />
                </div>
                <div className="bulk-info">
                  <span className={`bulk-tier tier-color-${item.char!.tier}`}>{item.char!.tier}</span>
                  <span className="bulk-name">{item.char!.name}</span>
                </div>
                <div className="bulk-count">x {item.count.toLocaleString()}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="gacha-result-grid">
            {results.map((id, idx) => {
              const char = CHARACTER_DATA.find(c => c.id === id);
              return (
                <div 
                  key={`${idx}-${id}`} 
                  className="gacha-card-container"
                  style={{ animationDelay: `${idx * 0.08}s` }}
                >
                  <div className={`gacha-card-visual tier-border-${char?.tier}`}>
                    <div className={`card-tier-badge tier-color-${char?.tier || 'C'}`}>{char?.tier === 'SR' ? 'P.B' : char?.tier}</div>
                    <img src={getCardImageUrl(char?.id || '')} alt="character" className="gacha-card-image" />
                  </div>
                  <div className="gacha-card-name">{char?.name}</div>
                </div>
              );
            })}
          </div>
        )}

        <div className="gacha-actions-bottom">
          <button className="gacha-btn-action pull" onClick={() => onPullAgain(1)}>
            1회
          </button>
          <button className="gacha-btn-action pull" onClick={() => onPullAgain(10)}>
            10회
          </button>
          <button className="gacha-btn-action pull" onClick={() => onPullAgain(100)}>
            100회
          </button>
          <button className="gacha-btn-action max-btn" onClick={() => onPullAgain('max')}>
            모두 소모
          </button>
          <button className="gacha-btn-action confirm" onClick={onClose}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
