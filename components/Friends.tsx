
import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, UserPlus, Check, X, LoaderCircle, Search } from 'lucide-react';
import * as socialService from '../services/socialService';
import * as userService from '../services/userService';

interface FriendsProps {
    user: any;
    onBack: () => void;
}

const Friends: React.FC<FriendsProps> = ({ user, onBack }) => {
    const [friends, setFriends] = useState<socialService.FriendUser[]>([]);
    const [requests, setRequests] = useState<socialService.FriendUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResult, setSearchResult] = useState<{ status: 'idle' | 'loading' | 'found' | 'not_found' | 'error', message: string }>({ status: 'idle', message: '' });

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const [friendsData, requestsData] = await Promise.all([
            socialService.getFriends(user.uid),
            socialService.getFriendRequests(user.uid)
        ]);
        setFriends(friendsData);
        setRequests(requestsData);
        setIsLoading(false);
    }, [user.uid]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchTerm.trim() || searchTerm.trim().toLowerCase() === user.username.toLowerCase()) {
            setSearchResult({ status: 'idle', message: '' });
            return;
        }
        setSearchResult({ status: 'loading', message: 'Buscando...' });
        const targetUid = await userService.findUserByUsername(searchTerm.trim());
        if (targetUid) {
            await socialService.sendFriendRequest({ uid: user.uid, username: user.username, photoURL: user.photoURL }, targetUid);
            setSearchResult({ status: 'found', message: `¡Solicitud enviada a ${searchTerm}!` });
        } else {
            setSearchResult({ status: 'not_found', message: 'Usuario no encontrado.' });
        }
        setSearchTerm('');
    };
    
    const handleAccept = async (requester: socialService.FriendUser) => {
        const me = { uid: user.uid, username: user.username, photoURL: user.photoURL };
        await socialService.acceptFriendRequest(me, requester);
        fetchData(); // Refresh lists
    };
    
    const handleDecline = async (requesterId: string) => {
        await socialService.declineFriendRequest(user.uid, requesterId);
        fetchData(); // Refresh lists
    };
    
    const renderUserList = (list: socialService.FriendUser[], isRequestList = false) => (
        <div className="space-y-3">
            {list.map(person => (
                <div key={person.uid} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg">
                    <div className="flex items-center gap-3">
                        <img src={person.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(person.username[0] || 'A')}`} alt="avatar" className="w-10 h-10 rounded-full"/>
                        <span className="font-semibold">{person.username}</span>
                    </div>
                    {isRequestList && (
                        <div className="flex gap-2">
                            <button onClick={() => handleAccept(person)} className="p-2 bg-green-500/20 text-green-300 rounded-full hover:bg-green-500/40"><Check size={18}/></button>
                            <button onClick={() => handleDecline(person.uid)} className="p-2 bg-red-500/20 text-red-300 rounded-full hover:bg-red-500/40"><X size={18}/></button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );

    return (
        <div className="animate-[fade-in_0.5s] max-w-4xl mx-auto">
            <div className="flex justify-start mb-6">
                 <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold bg-slate-800/50 hover:bg-slate-700/80 px-4 py-2 rounded-lg transition-colors">
                    <ArrowLeft size={16}/> Volver a la Estación
                </button>
            </div>
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                <h2 className="text-2xl font-bold mb-4">Amigos</h2>
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Añadir Amigo</h3>
                        <form onSubmit={handleSearch} className="flex gap-2">
                            <div className="relative flex-grow">
                               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/>
                               <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Nombre de usuario de Puter..." className="bg-slate-900 border border-slate-600 rounded-lg p-2.5 pl-10 text-sm w-full" />
                            </div>
                            <button type="submit" disabled={searchResult.status === 'loading'} className="flex items-center justify-center w-12 bg-purple-600 font-semibold py-2 px-4 rounded-lg hover:bg-purple-500">
                                {searchResult.status === 'loading' ? <LoaderCircle size={20} className="animate-spin" /> : <UserPlus size={20}/>}
                            </button>
                        </form>
                        {searchResult.status !== 'idle' && <p className={`text-sm mt-2 text-center ${searchResult.status === 'found' ? 'text-green-400' : 'text-red-400'}`}>{searchResult.message}</p>}
                    </div>
                     {isLoading ? <LoaderCircle className="mx-auto my-10 w-8 h-8 animate-spin text-purple-400" /> : <>
                        <div className="border-t border-slate-700 pt-4">
                            <h3 className="text-lg font-semibold mb-2">Solicitudes Pendientes ({requests.length})</h3>
                            {requests.length > 0 ? renderUserList(requests, true) : <p className="text-sm text-slate-500">No tienes solicitudes pendientes.</p>}
                        </div>
                        <div className="border-t border-slate-700 pt-4">
                            <h3 className="text-lg font-semibold mb-2">Mis Amigos ({friends.length})</h3>
                            {friends.length > 0 ? renderUserList(friends) : <p className="text-sm text-slate-500">Tu lista de amigos está vacía.</p>}
                        </div>
                    </>}
                </div>
            </div>
        </div>
    );
};
export default Friends;
