import { useEffect, useRef, useState } from 'react';
import axios from '../../utils/axiosInstance';
import { useParams } from 'react-router-dom';
import { createWebSocket } from '../../utils/websocket';

export default function ChatPage() {
  const { username } = useParams();
  const [contactId, setContactId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [mediaFile, setMediaFile] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const recordingInterval = useRef(null);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setRecording(false);
        clearInterval(recordingInterval.current);
      };

      mediaRecorder.start();
      setRecording(true);
      setRecordingTime(0);
      recordingInterval.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Erreur micro:', err);
      setError("Impossible d'accéder au micro.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleCancelAudio = () => {
    setAudioBlob(null);
    setRecordingTime(0);
  };

  useEffect(() => {
    const fetchContactId = async () => {
      try {
        const res = await axios.get(`/accounts/get-id/${username}/`);
        setContactId(res.data.id);
      } catch (err) {
        setError("Utilisateur introuvable.");
      }
    };
    fetchContactId();
  }, [username]);

  const fetchMessages = async () => {
    if (!contactId) return;
    try {
      const res = await axios.get(`/chat/messages/${contactId}/`);
      setMessages(res.data);
    } catch (err) {
      setError("Erreur lors du chargement des messages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contactId) fetchMessages();
  }, [contactId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !mediaFile && !audioBlob) return;
    const formData = new FormData();
    formData.append('receiver', contactId);
    if (newMessage.trim()) formData.append('content', newMessage);
    if (mediaFile) formData.append('media', mediaFile);
    if (audioBlob) formData.append('audio', audioBlob);

    try {
      await axios.post('/chat/messages/send/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setNewMessage('');
      setMediaFile(null);
      setAudioBlob(null);
      setRecordingTime(0);
      fetchMessages();
    } catch (err) {
      setError("Impossible d'envoyer le message.");
    }
  };

  useEffect(() => {
    const username = localStorage.getItem('user');
    const ws = createWebSocket(username, () => {
      fetchMessages();
    });
    return () => ws.close();
  }, [contactId]);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">💬 Discussion avec {username}</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <div className="space-y-3 max-w-2xl mx-auto">
          <div className="bg-white p-4 rounded shadow h-96 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-gray-500">Aucun message.</p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`mb-3 p-2 rounded max-w-sm ${
                    msg.sender_username === username
                      ? 'bg-white text-left'
                      : 'bg-blue-100 text-right ml-auto'
                  }`}
                >
                  {msg.content && <p className="text-sm mb-1">{msg.content}</p>}

                  {msg.media_url && (
                    msg.media_url.match(/\.(jpg|jpeg|png|gif)$/) ? (
                      <img src={msg.media_url} alt="media" className="rounded max-w-xs my-2" />
                    ) : (
                      <video controls className="rounded max-w-xs my-2">
                        <source src={msg.media_url} />
                      </video>
                    )
                  )}

                  {msg.audio_url && (
                    <div className="bg-blue-500 text-white px-3 py-1 rounded-full flex items-center space-x-2 mt-2 w-fit">
                      <audio controls src={msg.audio_url} className="w-48" />
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(msg.timestamp).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-col gap-2">
            {/* Zone de saisie texte */}
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="border rounded p-2"
              placeholder="Écrire un message..."
            />

            {/* Prévisualisation image ou vidéo */}
            {mediaFile && (
              <div className="flex items-center bg-white p-2 border rounded shadow">
                {mediaFile.type.startsWith('image/') ? (
                  <img
                    src={URL.createObjectURL(mediaFile)}
                    alt="preview"
                    className="h-32 rounded mr-4"
                  />
                ) : (
                  <video
                    src={URL.createObjectURL(mediaFile)}
                    controls
                    className="h-32 rounded mr-4"
                  />
                )}
                <button
                  onClick={() => setMediaFile(null)}
                  className="text-red-600 text-sm underline"
                >
                  Supprimer
                </button>
              </div>
            )}

            {/* Prévisualisation audio enregistré */}
            {audioBlob && (
              <div className="flex items-center bg-blue-500 text-white px-4 py-2 rounded-full mt-2">
                <button onClick={handleCancelAudio} className="mr-2 text-white">✖</button>
                <audio controls src={URL.createObjectURL(audioBlob)} className="mr-2" />
                <span>{formatDuration(recordingTime)}</span>
              </div>
            )}

            {/* Boutons en bas */}
            <div className="flex items-center gap-3">
              {!recording ? (
                <button onClick={handleStartRecording}>
                  <img src="/mic-icon.svg" alt="mic" className="w-6 h-6" />
                </button>
              ) : (
                <div className="flex items-center bg-blue-500 text-white px-4 py-1 rounded-full">
                  <button onClick={handleCancelAudio} className="mr-2">✖</button>
                  <button onClick={handleStopRecording} className="mr-2">⏹</button>
                  <span>{formatDuration(recordingTime)}</span>
                </div>
              )}

              <label htmlFor="media-upload">
                <img src="/image-icon.svg" alt="media" className="w-6 h-6 cursor-pointer" />
              </label>
              <input
                id="media-upload"
                type="file"
                accept="image/*,video/*"
                onChange={(e) => setMediaFile(e.target.files[0])}
                className="hidden"
              />

              <button
                onClick={handleSendMessage}
                className="ml-auto bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
