import { useGameStore } from '../store/gameStore';
import { CHARACTER_DATA } from '../data/characters';
import { getCardImageUrl } from '../utils/assets';

interface Props {
  title: string;
  onClose: () => void;
  onSelect: (id: string) => void;
}

export function CharacterSelectModal({ title, onClose, onSelect }: Props) {
  const { ownedCharacters } = useGameStore();
  const ownedList = CHARACTER_DATA.filter(char => !!ownedCharacters[char.id]);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: '700px', maxWidth: '95%' }}>
        <button className="close-btn" onClick={onClose}>X</button>
        <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#f1c40f' }}>{title}</h2>
        
        <div className="setup-roster-grid" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {ownedList.map(char => (
            <div 
              key={char.id} 
              className="setup-card-container"
              onClick={() => {
                onSelect(char.id);
                onClose();
              }}
            >
              <div className={`setup-card-visual tier-border-${char.tier}`}>
                <div className={`card-tier-badge tier-color-${char.tier}`}>{char.tier === 'SR' ? 'P.B' : char.tier}</div>
                <img src={getCardImageUrl(char.id)} alt="character" className="setup-card-image" draggable={false} />
              </div>
              <div className="setup-card-name">{char.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
