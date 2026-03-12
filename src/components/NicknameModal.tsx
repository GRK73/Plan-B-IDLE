import { useState } from 'react';

interface Props {
    onConfirm: (nickname: string) => void;
    onCancel: () => void;
}

export function NicknameModal({ onConfirm, onCancel }: Props) {
    const [name, setName] = useState('');

    return (
        <div className="modal-overlay" style={{ zIndex: 4000 }}>
            <div className="modal-content" style={{ textAlign: 'center', width: '320px', padding: '30px 20px' }}>
                <h3 style={{ marginTop: 0, color: '#ffb142' }}>리더보드 닉네임 설정</h3>
                <p style={{ fontSize: '0.9rem', color: '#ccc', lineHeight: '1.4' }}>
                    닉네임을 입력해주세요.<br />(등록을 원치 않으면 건너뛰기를 누르세요)
                </p>
                <input
                    type="text"
                    maxLength={10}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="최대 10자"
                    autoFocus
                    style={{
                        width: '80%', padding: '12px', margin: '20px 0',
                        borderRadius: '8px', border: '2px solid #555',
                        background: '#222', color: 'white',
                        textAlign: 'center', fontSize: '1.2rem',
                        outline: 'none'
                    }}
                />
                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                    <button
                        onClick={() => onConfirm(name.trim())}
                        disabled={!name.trim()}
                        style={{
                            padding: '10px 25px', background: name.trim() ? '#2ecc71' : '#555',
                            color: 'white', border: 'none', borderRadius: '8px',
                            fontWeight: 'bold', cursor: name.trim() ? 'pointer' : 'not-allowed',
                            fontSize: '1.1rem'
                        }}
                    >
                        확인
                    </button>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '10px 25px', background: '#34495e', color: 'white',
                            border: 'none', borderRadius: '8px', cursor: 'pointer',
                            fontSize: '1.1rem'
                        }}
                    >
                        건너뛰기
                    </button>
                </div>
            </div>
        </div>
    );
}
