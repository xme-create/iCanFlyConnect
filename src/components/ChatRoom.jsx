import React, { useState, useEffect, useRef } from 'react';
import { sendMessage, listenToMessages, uploadFile } from '../firebase/chat';
import { useToast } from '../context/ToastContext';

const ChatRoom = ({ sessionId, myName, myRole }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const toast = useToast();

  // Speech Recognition Setup
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = SpeechRecognition ? new SpeechRecognition() : null;

  if (recognition) {
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast('Could not hear you. Please try again!', 'error');
    };

    recognition.onend = () => setIsListening(false);
  }

  useEffect(() => {
    if (!sessionId) return;
    const unsub = listenToMessages(
      sessionId,
      (nextMessages) => {
        setMessages(nextMessages);
      },
      (error) => {
        console.error('Failed to listen to chat messages:', error);
        toast('Chat could not connect. Please refresh and try again.', 'error');
      }
    );
    return unsub;
  }, [sessionId, toast]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e?.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setInputText('');
    try {
      await sendMessage(sessionId, {
        sender: myRole,
        senderName: myName,
        text: trimmed,
      });
    } catch (error) {
      console.error('Failed to send chat message:', error);
      setInputText(trimmed);
      toast('Message could not be sent. Please try again.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleVoiceToggle = () => {
    if (!recognition) {
      toast('Voice input is not supported in this browser.', 'error');
      return;
    }
    if (isListening) {
      recognition.stop();
    } else {
      setIsListening(true);
      recognition.start();
    }
  };

  const handleFileClick = () => fileInputRef.current?.click();

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast('File is too large (max 5MB)', 'error');
      return;
    }

    setSending(true);
    toast('Uploading file...', 'info');
    try {
      const uploadResult = await uploadFile(sessionId, file);
      await sendMessage(sessionId, {
        sender: myRole,
        senderName: myName,
        text: `Shared a file: ${file.name}`,
        fileUrl: uploadResult.url,
        fileType: uploadResult.type,
        fileName: uploadResult.name,
      });
      if (uploadResult.inline) {
        toast('File sent with chat fallback mode.', 'info');
      }
    } catch (err) {
      toast(err?.message || 'Failed to upload file.', 'error');
      console.error('Failed to upload chat file:', err);
    } finally {
      setSending(false);
      e.target.value = '';
    }
  };

  return (
    <div className="chat-panel card" style={{ 
      padding: 0, height: '100%', display: 'flex', flexDirection: 'column', 
      overflow: 'hidden', background: 'rgba(10,9,24,0.4)', borderColor: 'rgba(255,255,255,0.08)'
    }}>
      <div style={{ 
        padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', 
        display: 'flex', alignItems: 'center', gap: '0.75rem' 
      }}>
        <span style={{ fontSize: '1.25rem' }}>💬</span>
        <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>Chat</span>
      </div>

      <div className="chat-messages" style={{ flex: 1, padding: '1.5rem' }}>
        {messages.length === 0 && (
          <div style={{ 
            textAlign: 'center', color: 'var(--text-muted)', 
            marginTop: '4rem', display: 'flex', flexDirection: 'column', gap: '1rem' 
          }}>
            <div style={{ fontSize: '3rem', opacity: 0.5 }}>✨</div>
            <p>Ready to collaborate! Say hello! 👋</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender === myRole;
          return (
            <div key={msg.id} className={`chat-bubble ${isMe ? 'me' : 'other'}`} style={{
              maxWidth: '85%', marginBottom: '1rem',
              borderRadius: isMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
              padding: '0.75rem 1rem'
            }}>
              <div className="bubble-meta" style={{ 
                fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem', 
                opacity: 0.8, color: isMe ? 'white' : 'var(--primary-light)' 
              }}>
                {msg.senderName}
              </div>
              
              {msg.fileUrl && (
                <div style={{ marginBottom: '0.5rem' }}>
                  {msg.fileType?.startsWith('image/') ? (
                    <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                      <img src={msg.fileUrl} alt="Attached" style={{ 
                        maxWidth: '100%', borderRadius: 8, cursor: 'pointer',
                        border: '1px solid rgba(255,255,255,0.1)' 
                      }} />
                    </a>
                  ) : (
                    <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" download={msg.fileName || true} style={{ 
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: 8,
                      color: 'inherit', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <span>📄</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{msg.fileName || 'Download File'}</span>
                    </a>
                  )}
                </div>
              )}
              
              <div style={{ lineHeight: 1.5, wordBreak: 'break-word' }}>
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="chat-compose-wrap" style={{ padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.03)', borderTop: '1px solid var(--border)' }}>
        <form onSubmit={handleSend} className="chat-compose">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <button 
            type="button" 
            className={`chat-icon-btn btn btn-sm ${sending ? 'btn-disabled' : 'btn-secondary'}`}
            onClick={handleFileClick} 
            disabled={sending}
            title="Upload File"
            style={{ padding: '0.6rem', borderRadius: 12, minWidth: 44, height: 44, fontSize: '1.2rem' }}
          >
            📎
          </button>
          
          <button 
            type="button" 
            className={`chat-icon-btn btn btn-sm ${isListening ? 'btn-danger' : 'btn-secondary'}`}
            onClick={handleVoiceToggle} 
            disabled={sending}
            title="Voice Input"
            style={{ 
              padding: '0.6rem', borderRadius: 12, minWidth: 44, height: 44, fontSize: '1.2rem',
              animation: isListening ? 'pulse-red 1.5s infinite' : 'none' 
            }}
          >
            {isListening ? '🛑' : '🎤'}
          </button>

          <input
            id="chat-input"
            type="text"
            placeholder={isListening ? 'Listening...' : "Say something nice..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={sending}
            autoComplete="off"
            className="chat-text-input"
            style={{ 
              flex: 1, padding: '0.75rem 1.25rem', borderRadius: 100, 
              background: 'rgba(255,255,255,0.05)', fontSize: '1rem',
              color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.1)',
              outline: 'none'
            }}
          />
          
          <button
            type="submit"
            className="chat-send-btn btn btn-primary"
            disabled={!inputText.trim() || sending}
            id="chat-send-btn"
            style={{ padding: '0.75rem 1.5rem', borderRadius: 100, fontWeight: 700 }}
          >
            Send
          </button>
        </form>
      </div>

      <style>{`
        @keyframes pulse-red {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>
    </div>
  );
};

export default ChatRoom;
