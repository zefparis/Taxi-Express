import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './ChatComponent.css';

const ChatComponent = ({ tripId, driverId, userId, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { currentUser } = useAuth();
  
  // Simuler le chargement des messages précédents
  useEffect(() => {
    const loadInitialMessages = () => {
      setLoading(true);
      
      // Simulation de messages précédents (à remplacer par un appel API réel)
      setTimeout(() => {
        const initialMessages = [
          {
            id: 1,
            senderId: driverId,
            receiverId: userId,
            content: "Bonjour, je suis votre chauffeur. Je serai à votre position dans environ 5 minutes.",
            timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
            isRead: true
          },
          {
            id: 2,
            senderId: userId,
            receiverId: driverId,
            content: "D'accord, merci. Je vous attends à l'entrée principale.",
            timestamp: new Date(Date.now() - 14 * 60000).toISOString(),
            isRead: true
          }
        ];
        
        setMessages(initialMessages);
        setLoading(false);
        scrollToBottom();
      }, 1000);
    };
    
    loadInitialMessages();
  }, [driverId, userId]);
  
  // Faire défiler automatiquement vers le bas lorsque de nouveaux messages arrivent
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Simuler l'envoi d'un message
  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    // Créer un nouveau message
    const message = {
      id: messages.length + 1,
      senderId: currentUser.id,
      receiverId: currentUser.id === userId ? driverId : userId,
      content: newMessage,
      timestamp: new Date().toISOString(),
      isRead: false
    };
    
    // Ajouter le message à la liste
    setMessages([...messages, message]);
    setNewMessage('');
    
    // Simuler une réponse du chauffeur après un délai aléatoire
    if (currentUser.id === userId) {
      setTimeout(() => {
        const responses = [
          "Je suis en route, j'arrive bientôt.",
          "Compris, je vous vois sur la carte.",
          "Pas de problème, je serai là dans quelques minutes.",
          "Merci pour l'information, je m'approche de votre position."
        ];
        
        const responseMessage = {
          id: messages.length + 2,
          senderId: driverId,
          receiverId: userId,
          content: responses[Math.floor(Math.random() * responses.length)],
          timestamp: new Date().toISOString(),
          isRead: false
        };
        
        setMessages(prevMessages => [...prevMessages, responseMessage]);
      }, 2000 + Math.random() * 3000);
    }
  };
  
  // Formater l'heure du message
  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div className="chat-container">
      <div className="chat-header">
        <h5 className="mb-0">
          {currentUser.id === userId 
            ? 'Chat avec votre chauffeur' 
            : 'Chat avec le client'}
        </h5>
        <button 
          type="button" 
          className="btn-close" 
          aria-label="Close" 
          onClick={onClose}
        ></button>
      </div>
      
      <div className="chat-messages">
        {loading ? (
          <div className="text-center p-3">
            <div className="spinner-border spinner-border-sm text-primary" role="status">
              <span className="visually-hidden">Chargement...</span>
            </div>
            <p className="mt-2 mb-0 small">Chargement des messages...</p>
          </div>
        ) : (
          <>
            {messages.length === 0 ? (
              <div className="text-center p-3">
                <p className="text-muted mb-0">Aucun message. Commencez la conversation !</p>
              </div>
            ) : (
              messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`message ${message.senderId === currentUser.id ? 'sent' : 'received'}`}
                >
                  <div className="message-content">
                    <p>{message.content}</p>
                    <span className="message-time">{formatMessageTime(message.timestamp)}</span>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      <form className="chat-input" onSubmit={handleSendMessage}>
        <input
          type="text"
          className="form-control"
          placeholder="Tapez votre message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={!newMessage.trim()}
        >
          <i className="bi bi-send-fill"></i>
        </button>
      </form>
    </div>
  );
};

export default ChatComponent;
