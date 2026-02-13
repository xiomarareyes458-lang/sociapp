
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Heart, MessageCircle, PlusSquare, User, LogOut, Smartphone, MoreHorizontal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocial } from '../context/SocialContext';
import { NotificationType } from '../types';

const Sidebar: React.FC<{ onOpenPostModal: () => void }> = ({ onOpenPostModal }) => {
  const { currentUser, logout } = useAuth();
  const { notifications } = useSocial();
  const location = useLocation();

  const unreadNotifs = notifications.filter(n => 
    n.receiverId === currentUser?.id && !n.read && n.type !== NotificationType.MESSAGE
  ).length;

  const unreadMessages = notifications.filter(n => 
    n.receiverId === currentUser?.id && !n.read && n.type === NotificationType.MESSAGE
  ).length;

  const NavItem = ({ to, icon: Icon, label, badge }: any) => {
    const isActive = location.pathname === to;
    return (
      <Link 
        to={to} 
        className="flex items-center gap-4 p-3 rounded-full transition-all hover:bg-white/10 group w-fit xl:pr-6"
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
    <aside className="fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-[#2F3336] md:sticky md:top-0 md:w-20 xl:w-[275px] md:border-t-0 h-auto md:h-screen flex flex-row md:flex-col items-center xl:items-start md:px-3">
      <div className="hidden md:flex p-3 mb-2 rounded-full hover:bg-white/10 transition-colors text-[#2ECC71]">
        <Link to="/"><Smartphone className="w-8 h-8" /></Link>
      </div>

      <nav className="flex flex-row md:flex-col justify-around md:justify-start flex-1 w-full gap-1 items-center md:items-start">
        <NavItem to="/" icon={Home} label="Inicio" />
        <NavItem to="/explore" icon={Search} label="Explorar" />
        
        <button onClick={onOpenPostModal} className="flex md:hidden items-center justify-center p-3 rounded-full hover:bg-white/10">
          <PlusSquare className="w-7 h-7 text-[#2ECC71]" />
        </button>

        <NavItem to="/notifications" icon={Heart} label="Notificaciones" badge={unreadNotifs} />
        <NavItem to="/messages" icon={MessageCircle} label="Mensajes" badge={unreadMessages} />
        
        {currentUser && (
          <div className="md:hidden">
            <NavItem to={`/profile/${currentUser.username}`} icon={User} label="Perfil" />
          </div>
        )}

        <button onClick={logout} className="flex md:hidden p-3 rounded-full text-red-500 hover:bg-red-500/10">
          <LogOut className="w-7 h-7" />
        </button>

        {currentUser && (
          <div className="hidden md:block">
            <NavItem to={`/profile/${currentUser.username}`} icon={User} label="Perfil" />
          </div>
        )}

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
              <img src={currentUser.avatar} className="w-10 h-10 rounded-full border border-[#2F3336]" alt="User" />
              <div className="hidden xl:block">
                <div className="text-sm font-bold truncate max-w-[120px]">{currentUser.fullName}</div>
                <div className="text-xs text-gray-500">@{currentUser.username}</div>
              </div>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); logout(); }}
              className="p-2 text-gray-500 hover:text-red-500 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
