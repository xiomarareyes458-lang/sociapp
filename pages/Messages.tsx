
import React, { useState, useEffect } from 'react';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';
import { Send, Image, MoreVertical, Phone, Video } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';

const Messages: React.FC = () => {
  const { currentUser } = useAuth();
  const { users, messages, sendMessage, markMessagesAsRead } = useSocial();
  const [searchParams] = useSearchParams();
  const userIdFromQuery = searchParams.get('userId');
  
  const [selectedUserId, setSelectedUserId] = useState<string | null>(userIdFromQuery);
  const [messageText, setMessageText] = useState('');

  // Sincronizar el usuario seleccionado con el parámetro de la URL y marcar como leído
  useEffect(() => {
    if (userIdFromQuery) {
      setSelectedUserId(userIdFromQuery);
      markMessagesAsRead(userIdFromQuery);
    }
  }, [userIdFromQuery]);

  useEffect(() => {
    if (selectedUserId) {
      markMessagesAsRead(selectedUserId);
    }
  }, [selectedUserId]);

  const selectedUser = users.find(u => u.id === selectedUserId);
  const chatUsers = users.filter(u => u.id !== currentUser?.id);
  
  const currentChatMessages = messages.filter(m => 
    (m.senderId === currentUser?.id && m.receiverId === selectedUserId) ||
    (m.senderId === selectedUserId && m.receiverId === currentUser?.id)
  );

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedUserId) return;
    sendMessage(selectedUserId, messageText);
    setMessageText('');
  };

  return (
    <div className="max-w-[935px] mx-auto pt-8 px-4 pb-20 h-[calc(100vh-100px)]">
      <div className="bg-black border border-[#2F3336] rounded-2xl overflow-hidden flex h-full shadow-2xl">
        {/* Sidebar */}
        <div className="w-full md:w-80 border-r border-[#2F3336] flex flex-col bg-black">
          <div className="p-4 border-b border-[#2F3336] font-bold text-lg text-center text-[#2ECC71]">{currentUser?.username}</div>
          <div className="overflow-y-auto flex-1 no-scrollbar">
            {chatUsers.map(user => (
              <div 
                key={user.id}
                onClick={() => setSelectedUserId(user.id)}
                className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5 transition-all ${selectedUserId === user.id ? 'bg-[#2ECC71]/10 border-r-4 border-[#2ECC71]' : ''}`}
              >
                <img src={user.avatar} className="w-12 h-12 rounded-full border border-[#2F3336]" />
                <div className="flex-1">
                  <div className={`text-sm font-semibold ${selectedUserId === user.id ? 'text-[#2ECC71]' : 'text-white'}`}>{user.username}</div>
                  <div className="text-xs text-gray-500 truncate">Chat abierto</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Window */}
        <div className="hidden md:flex flex-col flex-1 bg-black">
          {selectedUser ? (
            <>
              <div className="p-4 border-b border-[#2F3336] flex items-center justify-between bg-black/50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <img src={selectedUser.avatar} className="w-8 h-8 rounded-full border border-[#2F3336] hover:border-[#2ECC71] cursor-pointer transition-colors" />
                  <span className="font-bold text-white hover:text-[#2ECC71] cursor-pointer transition-colors">{selectedUser.username}</span>
                </div>
                <div className="flex items-center gap-4 text-gray-500">
                  <Phone className="w-5 h-5 cursor-pointer hover:text-[#2ECC71] transition-colors" />
                  <Video className="w-5 h-5 cursor-pointer hover:text-[#2ECC71] transition-colors" />
                  <MoreVertical className="w-5 h-5 cursor-pointer hover:text-[#2ECC71] transition-colors" />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-black/20 no-scrollbar">
                {currentChatMessages.map(m => {
                  const isMine = m.senderId === currentUser?.id;
                  const time = format(m.timestamp, 'HH:mm');
                  return (
                    <div key={m.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                      <div className={`max-w-[70%] p-3 rounded-2xl text-sm shadow-sm ${isMine ? 'bg-[#2ECC71] text-black font-medium rounded-br-none' : 'bg-[#1A1A1A] text-white border border-[#2F3336] rounded-bl-none'}`}>
                        {m.text}
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1 px-1">{time}</span>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleSendMessage} className="p-4 border-t border-[#2F3336] bg-black">
                <div className="flex items-center gap-3 border border-[#2F3336] rounded-full px-4 py-2 bg-[#0A0A0A] focus-within:border-[#2ECC71] transition-all">
                  <button type="button" className="text-gray-500 hover:text-[#2ECC71] transition-colors"><Image className="w-5 h-5" /></button>
                  <input 
                    type="text" 
                    placeholder="Escribe un mensaje..." 
                    className="flex-1 outline-none text-sm bg-transparent text-white placeholder-gray-600 focus:placeholder:text-[#2ECC71]/30"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                  />
                  <button type="submit" disabled={!messageText.trim()} className="text-[#2ECC71] font-bold text-sm disabled:opacity-50 hover:text-[#27AE60] transition-colors active:scale-95">Enviar</button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-center p-10 bg-black">
              <div className="w-20 h-20 rounded-full border-2 border-[#2ECC71] flex items-center justify-center mb-4 shadow-[0_0_15px_#2ECC71]/10">
                <Send className="w-10 h-10 text-[#2ECC71]" />
              </div>
              <h2 className="text-xl font-bold text-white">Tus Mensajes</h2>
              <p className="text-gray-500 max-w-[200px] mt-2 text-sm">Envía fotos y mensajes privados a un amigo.</p>
              <button className="mt-6 bg-[#2ECC71] text-black px-6 py-2 rounded-full font-bold text-sm hover:bg-[#27AE60] transition-all active:scale-95">Enviar Mensaje</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
