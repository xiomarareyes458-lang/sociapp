
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Compass, MessageCircle, Heart, PlusSquare, User, LogOut, Smartphone, MoreHorizontal, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocial } from '../context/SocialContext';
import { NotificationType } from '../types';

const Sidebar: React.FC<{ onOpenPostModal: () => void }> = ({ onOpenPostModal }) => {
  const { currentUser, logout } = useAuth();
  const { notifications } = useSocial();
  const location = useLocation();

  // Notificaciones generales no leídas (likes, follows, comments)
  const unreadCount = notifications.filter(n => 
    n.receiverId === currentUser?.id && !n.read && n.type !== NotificationType.MESSAGE
  ).length;

  // Notificaciones de mensajes no leídas
  const unreadMessagesCount = notifications.filter(n => 
    n.receiverId === currentUser?.id && !n.read && n.type === NotificationType.MESSAGE
  ).length;

  const NavItem = ({ to, icon: Icon, label, badge }: any) => {
    const isActive = location.pathname === to;
    return (
      <Link 
        to={to} 
        className="flex items-center gap-4 p-3 rounded-full transition-all hover:bg-white/10 group w-fit pr-6"
      >
        <div className="relative">
          <Icon className={`w-7 h-7 group-hover:scale-110 transition-transform ${isActive ? 'text-[#2ECC71] stroke-[2.5px]' : 'text-white'}`} />
          {badge > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#2ECC71] text-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold border-2 border-black">
              {badge}
            </span>
          )}
        </div>
        <span className={`hidden xl:inline text-[20px] ${isActive ? 'font-bold' : 'font-normal'}`}>{label}</span>
      </Link>
    );
  };

  return (
    <aside className="fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-[#2F3336] md:sticky md:top-0 md:w-20 xl:w-[275px] md:border-t-0 h-auto md:h-screen flex flex-row md:flex-col items-center xl:items-start md:px-3 transition-all">
      <div className="hidden md:flex p-3 mb-2 rounded-full hover:bg-white/10 transition-colors text-[#2ECC71]">
        <Link to="/"><Smartphone className="w-8 h-8" /></Link>
      </div>

      <nav className="flex flex-row md:flex-col justify-around md:justify-start flex-1 w-full gap-1 items-center md:items-start">
        <NavItem to="/" icon={Home} label="Inicio" />
        <NavItem to="/explore" icon={Search} label="Explorar" />
        
        {/* Botón central para móviles */}
        <button 
          onClick={onOpenPostModal}
          className="flex md:hidden items-center justify-center p-3 rounded-full transition-all hover:bg-[#2ECC71]/10 group"
        >
          <PlusSquare className="w-7 h-7 text-[#2ECC71]" />
        </button>

        <NavItem to="/notifications" icon={Heart} label="Notificaciones" badge={unreadCount} />
        <NavItem to="/messages" icon={MessageCircle} label="Mensajes" badge={unreadMessagesCount} />
        
        {currentUser && (
          <div className="md:hidden">
            <NavItem to={`/profile/${currentUser.username}`} icon={User} label="Perfil" />
          </div>
        )}

        <button 
          onClick={logout}
          className="flex md:hidden items-center justify-center p-3 rounded-full transition-all hover:bg-red-500/10 group text-red-500"
          title="Cerrar sesión"
        >
          <LogOut className="w-7 h-7" />
        </button>
        
        <div className="hidden xl:block">
           <NavItem to="/explore" icon={Compass} label="Listas" />
        </div>
        
        {currentUser && (
          <div className="hidden md:block">
            <NavItem to={`/profile/${currentUser.username}`} icon={User} label="Perfil" />
          </div>
        )}

        {/* Botón lateral para escritorio */}
        <button 
          onClick={onOpenPostModal}
          className="hidden md:flex items-center justify-center xl:w-full bg-[#2ECC71] text-black font-bold h-12 xl:h-14 rounded-full mt-4 hover:bg-[#27AE60] transition-all shadow-lg xl:px-4 active:scale-95"
        >
          <PlusSquare className="xl:hidden w-6 h-6" />
          <span className="hidden xl:inline text-lg">Postear</span>
        </button>
      </nav>

      <div className="hidden md:block mb-4 w-full px-2">
        {currentUser && (
           <div className="flex items-center justify-between p-3 rounded-full hover:bg-white/10 cursor-pointer transition-colors group relative">
              <div className="flex items-center gap-3">
                 <img src={currentUser.avatar} className="w-10 h-10 rounded-full border border-transparent group-hover:border-[#2ECC71] transition-colors" />
                 <div className="hidden xl:block">
                    <div className="text-sm font-bold">{currentUser.fullName}</div>
                    <div className="text-sm text-gray-500">@{currentUser.username}</div>
                 </div>
              </div>
              <MoreHorizontal className="hidden xl:block w-4 h-4 text-gray-500" />
              <div 
                onClick={logout} 
                className="absolute opacity-0 group-hover:opacity-100 bg-black border border-[#2F3336] p-3 rounded-xl -top-14 left-0 text-sm text-red-500 font-bold hover:bg-red-500/10 transition-all pointer-events-none group-hover:pointer-events-auto shadow-xl z-[60] flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Cerrar sesión
              </div>
           </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
