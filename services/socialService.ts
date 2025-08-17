
import { moderateContent } from './geminiService';
import { Post, AuthorProfile, Comment, ChatMessage, ResidentDJ, PostContent } from '../types';

declare var puter: any;

const isPuterReady = () => typeof puter !== 'undefined' && puter.kv && puter.fs;

// --- Social Feed ---
const FEED_KEY = 'aiRadioSocialFeed_v2';

const uploadImage = async (file: File, userUid: string): Promise<string> => {
    if (!isPuterReady()) throw new Error("Puter FS no está disponible.");
    const imagePath = `/ai-radio/posts/${userUid}_${Date.now()}_${file.name}`;
    await puter.fs.write(imagePath, file);
    const publicUrl = await puter.fs.getLink(imagePath);
    if (!publicUrl) throw new Error("No se pudo obtener la URL pública para la imagen.");
    return publicUrl;
};

export const getPosts = async (): Promise<Post[]> => {
    if (!isPuterReady()) return [];
    try {
        return (await puter.kv.get(FEED_KEY)) || [];
    } catch (e) { console.error("Error fetching social feed:", e); return []; }
};

export const addPost = async (author: AuthorProfile, content: PostContent, imageFile?: File): Promise<Post | null> => {
    if (!isPuterReady() || !author) return null;
    
    const textToModerate = content.text || (content.djPreset ? `¡Miren mi nuevo DJ, ${content.djPreset.name}!` : '');
    if (textToModerate) {
        const moderation = await moderateContent(textToModerate);
        if (moderation === 'FALSE') throw new Error("Contenido rechazado por moderación.");
    }

    if (content.type === 'image' && imageFile) {
        content.imageUrl = await uploadImage(imageFile, author.uid);
    }

    const newPost: Post = {
        id: crypto.randomUUID(),
        author,
        content,
        timestamp: new Date().toISOString(),
        likes: [],
        comments: [],
    };

    const posts = await getPosts();
    posts.unshift(newPost);
    await puter.kv.set(FEED_KEY, posts.slice(0, 200));
    return newPost;
};

export const toggleLikePost = async (postId: string, userId: string): Promise<Post[]> => {
    const posts = await getPosts();
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return posts;

    const likedIndex = posts[postIndex].likes.indexOf(userId);
    if (likedIndex > -1) {
        posts[postIndex].likes.splice(likedIndex, 1); // Unlike
    } else {
        posts[postIndex].likes.push(userId); // Like
    }
    
    await puter.kv.set(FEED_KEY, posts);
    return posts;
};

export const addComment = async (postId: string, author: AuthorProfile, commentText: string): Promise<Post[]> => {
    const moderation = await moderateContent(commentText);
    if (moderation === 'FALSE') throw new Error("Comentario rechazado por moderación.");

    const posts = await getPosts();
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return posts;

    const newComment: Comment = {
        id: crypto.randomUUID(),
        author,
        content: commentText,
        timestamp: new Date().toISOString(),
    };
    posts[postIndex].comments.push(newComment);
    
    await puter.kv.set(FEED_KEY, posts);
    return posts;
};

// --- Friends & Chat System ---

const getChatKey = (uid1: string, uid2: string) => `aiRadio_chat_${[uid1, uid2].sort().join('_')}`;

export const getChatMessages = async (uid1: string, uid2: string): Promise<ChatMessage[]> => {
    if (!isPuterReady()) return [];
    try {
        return (await puter.kv.get(getChatKey(uid1, uid2))) || [];
    } catch(e) { console.error("Error fetching chat:", e); return []; }
};

export const sendChatMessage = async (fromUser: AuthorProfile, toUid: string, text: string): Promise<ChatMessage> => {
    if (!isPuterReady()) throw new Error("Puter no está disponible.");

    const moderation = await moderateContent(text);
    if (moderation === 'FALSE') throw new Error("Mensaje rechazado por moderación.");

    const newMessage: ChatMessage = {
        id: crypto.randomUUID(),
        fromUid: fromUser.uid,
        toUid: toUid,
        text: text,
        timestamp: new Date().toISOString(),
        read: false,
    };

    const messages = await getChatMessages(fromUser.uid, toUid);
    messages.push(newMessage);
    await puter.kv.set(getChatKey(fromUser.uid, toUid), messages.slice(-200)); // Guardar últimos 200 mensajes
    return newMessage;
};

const getFriendsKey = (userId: string) => `aiRadio_friends_${userId}`;
const getRequestsKey = (userId: string) => `aiRadio_friend_requests_${userId}`;

export interface FriendUser {
    uid: string;
    username: string;
    photoURL: string;
}

// Get user's friend list
export const getFriends = async (userId: string): Promise<FriendUser[]> => {
    if (!isPuterReady() || !userId) return [];
    try {
       return (await puter.kv.get(getFriendsKey(userId))) || [];
    } catch(e) { console.error("Error getting friends:", e); return []; }
};

// Get user's incoming friend requests
export const getFriendRequests = async (userId: string): Promise<FriendUser[]> => {
    if (!isPuterReady() || !userId) return [];
    try {
      return (await puter.kv.get(getRequestsKey(userId))) || [];
    } catch(e) { console.error("Error getting requests:", e); return []; }
};

// Send a friend request to a user by their ID
export const sendFriendRequest = async (fromUser: FriendUser, toUserId: string) => {
    if (!isPuterReady() || !toUserId || fromUser.uid === toUserId) return;
    
    const requests = await getFriendRequests(toUserId);
    if (requests.some(req => req.uid === fromUser.uid)) return; // Avoid duplicate requests

    const newRequest: FriendUser = { uid: fromUser.uid, username: fromUser.username, photoURL: fromUser.photoURL };
    requests.push(newRequest);
    await puter.kv.set(getRequestsKey(toUserId), requests);
};

// Accept a friend request
export const acceptFriendRequest = async (currentUser: FriendUser, requester: FriendUser) => {
    if (!isPuterReady()) return;

    // 1. Add requester to current user's friends
    const myFriends = await getFriends(currentUser.uid);
    if (!myFriends.some(f => f.uid === requester.uid)) {
        myFriends.push(requester);
        await puter.kv.set(getFriendsKey(currentUser.uid), myFriends);
    }
    
    // 2. Add current user to requester's friends
    const theirFriends = await getFriends(requester.uid);
    if (!theirFriends.some(f => f.uid === currentUser.uid)) {
        theirFriends.push(currentUser);
        await puter.kv.set(getFriendsKey(requester.uid), theirFriends);
    }
    
    // 3. Remove request from current user's requests list
    let myRequests = await getFriendRequests(currentUser.uid);
    myRequests = myRequests.filter(req => req.uid !== requester.uid);
    await puter.kv.set(getRequestsKey(currentUser.uid), myRequests);
};

// Decline a friend request
export const declineFriendRequest = async (currentUserId: string, requesterId: string) => {
    if (!isPuterReady()) return;
    let requests = await getFriendRequests(currentUserId);
    requests = requests.filter(req => req.uid !== requesterId);
    await puter.kv.set(getRequestsKey(currentUserId), requests);
};
