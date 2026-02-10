
import React, { useEffect } from 'react';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { Heart, UserPlus, MessageSquare, Mail, Check, X, UserCheck, UserX } from 'lucide-react';
import { NotificationType } from '../types';

const Notifications: React.FC = () => {
  const { notifications, markNotificationsAsRead, respondToFriendRequest } = useSocial();
  const { currentUser } = useAuth();

  useEffect(() => {
    markNotificationsAsRead();
  }, []);

  const userNotifications = notifications.filter(n => n.receiverId === currentUser?.id);

  const getIcon = (type: NotificationType, status?: string) => {
    if (type === NotificationType.FRIEND_REQUEST || type === NotificationType.FRIEND_ACCEPTED) {
      if (status === 'accepted' || type === NotificationType.FRIEND_ACCEPTED) return <UserCheck className="w-4 h-4 text-[#2ECC71]" />;
      if (status === 'rejected') return <UserX className="w-4 h-4 text-red-500" />;
      return <UserPlus className="w-4 h-4 text-[#2ECC71]" />;
    }
    switch (type) {
      case NotificationType.LIKE: return <Heart className="w-4 h-4 fill-[#2ECC71] text-[#2ECC71]" />;
      case NotificationType.COMMENT: return <MessageSquare className="w-4 h-4 text-[#2ECC71]" />;
      case NotificationType.MESSAGE: return <Mail className="w-4 h-4 text-[#2ECC71]" />;
      default: return <Heart className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-[600px] mx-auto pt-8 px-4 pb-20">
      <h1 className="text-2xl font-bold mb-8">Notificaciones</h1>
      <div className="bg-black border border-[#2F3336] rounded-2xl overflow-hidden shadow-xl">
        {userNotifications.length > 0 ? (
          <div className="divide-y divide-[#2F3336]">
            {userNotifications.map(notif => (
              <div key={notif.id} className={`flex flex-col p-4 hover:bg-white/5 transition-colors ${!notif.read ? 'bg-[#2ECC71]/5' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative group flex-shrink-0">
                      <img src={notif.senderAvatar} className="w-12 h-12 rounded-full object-cover border border-[#2F3336] group-hover:border-[#2ECC71] transition-colors" />
                      <div className="absolute -bottom-1 -right-1 bg-black rounded-full p-1 border border-[#2F3336] shadow-sm">
                        {getIcon(notif.type, notif.status)}
                      </div>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1">
                        <Link to={`/profile/${notif.senderUsername}`} className="font-bold text-white hover:text-[#2ECC71] transition-colors">
                          {notif.senderUsername}
                        </Link>
                        {notif.type === NotificationType.MESSAGE ? (
                          <Link to={`/messages?userId=${notif.senderId}`} className="text-[#2ECC71] hover:underline font-medium">
                            te envió un mensaje privado.
                          </Link>
                        ) : notif.type === NotificationType.COMMENT ? (
                          <Link to={`/post/${notif.targetPostId}`} className="text-gray-400 hover:text-[#2ECC71] transition-colors">
                            comentó en tu post. <span className="text-[#2ECC71] font-medium text-xs">Ver post</span>
                          </Link>
                        ) : (
                          <span className="text-gray-400">
                            {notif.type === NotificationType.LIKE && 'le dio like a tu post.'}
                            {notif.type === NotificationType.FRIEND_REQUEST && (
                              notif.status === 'pending' ? 'te envió una solicitud de amistad.' :
                              notif.status === 'accepted' ? 'ahora es tu amigo.' : 'solicitud rechazada.'
                            )}
                            {notif.type === NotificationType.FRIEND_ACCEPTED && 'aceptó tu solicitud de amistad. ¡Ya son amigos!'}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{formatDistanceToNow(notif.createdAt)} ago</div>
                    </div>
                  </div>
                </div>

                {/* Botones de acción para solicitudes de amistad pendientes */}
                {notif.type === NotificationType.FRIEND_REQUEST && notif.status === 'pending' && (
                  <div className="flex gap-2 mt-4 ml-16">
                    <button 
                      onClick={() => respondToFriendRequest(notif.id, 'accepted')}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#2ECC71] text-black text-xs font-bold px-5 py-2 rounded-xl hover:bg-[#27AE60] transition-all active:scale-95 shadow-md shadow-[#2ECC71]/10"
                    >
                      <Check className="w-4 h-4" /> Aceptar
                    </button>
                    <button 
                      onClick={() => respondToFriendRequest(notif.id, 'rejected')}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#1A1A1A] text-white border border-[#2F3336] text-xs font-bold px-5 py-2 rounded-xl hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-all active:scale-95"
                    >
                      <X className="w-4 h-4" /> Rechazar
                    </button>
                  </div>
                )}

                {notif.status && notif.status !== 'pending' && (
                  <div className="mt-2 ml-16">
                    <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2 py-1 rounded-md ${notif.status === 'accepted' ? 'text-[#2ECC71] bg-[#2ECC71]/10' : 'text-gray-500 bg-white/5'}`}>
                      {notif.status === 'accepted' ? 'Solicitud Aceptada' : 'Solicitud Rechazada'}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-gray-600">
            <Heart className="w-12 h-12 mx-auto mb-4 opacity-10" />
            <p>No tienes notificaciones aún.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
