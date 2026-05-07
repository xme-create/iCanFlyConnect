import React, { useEffect, useRef, useState } from 'react';
import { listenToMessages, sendMessage, uploadFile } from '../firebase/chat';
import { useToast } from '../context/ToastContext';

const MAX_TEXTAREA_HEIGHT = 160;

const ChatRoom = ({ sessionId, myName, myRole }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const textAreaRef = useRef(null);
  const recognitionRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return undefined;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setInputText((prev) => (prev ? `${prev}\n${transcript}` : transcript));
      }
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      if (event?.error === 'not-allowed') {
        toast('Microphone access is blocked. Please allow mic permission and try again.', 'error');
        return;
      }
      toast('Voice input is unavailable here. Safari on iPhone works best for this feature.', 'error');
    };

    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [toast]);

  useEffect(() => {
    if (!sessionId) return undefined;
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

  useEffect(() => {
    if (!textAreaRef.current) return;
    textAreaRef.current.style.height = '0px';
    textAreaRef.current.style.height = `${Math.min(textAreaRef.current.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [inputText]);

  const handleSend = async (event) => {
    event?.preventDefault();
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

  const handleComposerKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleVoiceToggle = () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      toast('Voice input is not supported in this browser.', 'error');
      return;
    }

    if (!window.isSecureContext && location.hostname !== 'localhost') {
      toast('Voice input needs a secure HTTPS page to work on mobile browsers.', 'error');
      return;
    }

    if (isListening) {
      recognition.stop();
      return;
    }

    try {
      setIsListening(true);
      recognition.start();
    } catch (error) {
      setIsListening(false);
      toast('Voice input could not start. Safari on iPhone is the most reliable option.', 'error');
      console.error('Failed to start voice input:', error);
    }
  };

  const handleFileClick = () => fileInputRef.current?.click();

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
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
    } catch (error) {
      toast(error?.message || 'Failed to upload file.', 'error');
      console.error('Failed to upload chat file:', error);
    } finally {
      setSending(false);
      event.target.value = '';
    }
  };

  return (
    <div
      className="chat-panel card"
      style={{
        padding: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'rgba(10,9,24,0.4)',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      <div
        style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <span style={{ fontSize: '1.25rem' }}>Chat</span>
      </div>

      <div className="chat-messages" style={{ flex: 1, padding: '1.5rem' }}>
        {messages.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--text-muted)',
              marginTop: '4rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ fontSize: '3rem', opacity: 0.5 }}>...</div>
            <p>Ready to collaborate! Say hello!</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.sender === myRole;
          return (
            <div
              key={msg.id}
              className={`chat-bubble ${isMe ? 'me' : 'other'}`}
              style={{
                maxWidth: '85%',
                marginBottom: '1rem',
                borderRadius: isMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                padding: '0.75rem 1rem',
              }}
            >
              <div
                className="bubble-meta"
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  marginBottom: '0.25rem',
                  opacity: 0.8,
                  color: isMe ? 'white' : 'var(--primary-light)',
                }}
              >
                {msg.senderName}
              </div>

              {msg.fileUrl && (
                <div style={{ marginBottom: '0.5rem' }}>
                  {msg.fileType?.startsWith('image/') ? (
                    <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                      <img
                        src={msg.fileUrl}
                        alt="Attached"
                        style={{
                          maxWidth: '100%',
                          borderRadius: 8,
                          cursor: 'pointer',
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}
                      />
                    </a>
                  ) : (
                    <a
                      href={msg.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={msg.fileName || true}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: 8,
                        color: 'inherit',
                        textDecoration: 'none',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      <span>File</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        {msg.fileName || 'Download File'}
                      </span>
                    </a>
                  )}
                </div>
              )}

              <div style={{ lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{msg.text}</div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div
        className="chat-compose-wrap"
        style={{
          padding: '1rem 1.5rem',
          background: 'rgba(255,255,255,0.03)',
          borderTop: '1px solid var(--border)',
        }}
      >
        <form onSubmit={handleSend} className="chat-compose">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />

          <div className="chat-compose-editor">
            <textarea
              id="chat-input"
              ref={textAreaRef}
              placeholder={isListening ? 'Listening...' : 'Type your message here...'}
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              disabled={sending}
              rows={1}
              className="chat-text-input"
              style={{
                width: '100%',
                padding: '0.9rem 1rem',
                borderRadius: 20,
                background: 'rgba(255,255,255,0.05)',
                fontSize: '1rem',
                lineHeight: 1.45,
                color: 'var(--text-primary)',
                border: '1px solid rgba(255,255,255,0.1)',
                outline: 'none',
                resize: 'none',
                overflowY: 'auto',
              }}
            />
          </div>

          <div className="chat-compose-footer">
            <div className="chat-compose-tools">
              <button
                type="button"
                className={`chat-icon-btn btn btn-sm ${sending ? 'btn-disabled' : 'btn-secondary'}`}
                onClick={handleFileClick}
                disabled={sending}
                title="Upload File"
                style={{ padding: '0.6rem', borderRadius: 12, minWidth: 44, height: 44, fontSize: '1rem' }}
              >
                Attach
              </button>

              <button
                type="button"
                className={`chat-icon-btn btn btn-sm ${isListening ? 'btn-danger' : 'btn-secondary'}`}
                onClick={handleVoiceToggle}
                disabled={sending}
                title="Voice Input"
                style={{
                  padding: '0.6rem',
                  borderRadius: 12,
                  minWidth: 44,
                  height: 44,
                  fontSize: '1rem',
                  animation: isListening ? 'pulse-red 1.5s infinite' : 'none',
                }}
              >
                {isListening ? 'Stop Mic' : 'Mic'}
              </button>
            </div>

            <button
              type="submit"
              className="chat-send-btn btn btn-primary"
              disabled={!inputText.trim() || sending}
              id="chat-send-btn"
              style={{ padding: '0.75rem 1.5rem', borderRadius: 100, fontWeight: 700 }}
            >
              Send
            </button>
          </div>
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
