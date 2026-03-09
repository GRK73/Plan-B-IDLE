import './RebirthModal.css'; // 의도적으로 RebirthModal의 스타일을 일부 재사용

interface Props {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ message, onConfirm, onCancel }: Props) {
  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content" style={{ width: '400px', textAlign: 'center' }}>
        <h3 style={{ marginTop: 0, marginBottom: '30px', color: '#fff', fontSize: '1.2rem', lineHeight: '1.5' }}>
          {message}
        </h3>
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <button 
            className="buy-btn-large" 
            style={{ width: '120px', padding: '10px', fontSize: '1rem', background: '#3498db' }}
            onClick={onConfirm}
          >
            예
          </button>
          <button 
            className="buy-btn-large" 
            style={{ width: '120px', padding: '10px', fontSize: '1rem', background: '#e74c3c' }}
            onClick={onCancel}
          >
            아니오
          </button>
        </div>
      </div>
    </div>
  );
}
