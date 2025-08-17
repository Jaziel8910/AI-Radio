
import { moderateContent } from './geminiService';

declare var puter: any;

const isPuterReady = () => typeof puter !== 'undefined' && puter.kv;

// --- Social Feed ---

const FEED_KEY = 'aiRadioSocialFeed_v1';

export interface Post {
    id: string;
    authorId: string;
    authorUsername: string;
    authorAvatar: string;
    content: string;
    timestamp: string; // ISO string
}

export const getPosts = async (): Promise<Post[]> => {
    if (!isPuterReady()) return [];
    try {
        return (await puter.kv.get(FEED_KEY)) || [];
    } catch (e) {
        console.error("Error fetching social feed:", e);
        return [];
    }
};

export const addPost = async (user: any, content: string): Promise<Post | null> => {
    if (!isPuterReady() || !user) return null;
    
    // 1. Moderate content
    const moderation = await moderateContent(content);
    if (moderation === 'FALSE') {
        throw new Error("Contenido rechazado por moderación.");
    }

    // 2. Create post object
    const newPost: Post = {
        id: crypto.randomUUID(),
        authorId: user.uid,
        authorUsername: user.username,
        authorAvatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username[0] || 'A')}&background=a855f7&color=fff`,
        content: content,
        timestamp: new Date().toISOString(),
    };

    // 3. Save to KV
    try {
        const posts = await getPosts();
        posts.unshift(newPost); // Add to the beginning
        await puter.kv.set(FEED_KEY, posts.slice(0, 100)); // Keep last 100 posts
        return newPost;
    } catch (e) {
        console.error("Error saving post:", e);
        throw new Error("No se pudo guardar la publicación.");
    }
};

// --- Friends System ---
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
