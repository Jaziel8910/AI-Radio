// This service manages an in-memory store for File objects,
// allowing local files to be available for playback during a user's session
// without needing to persist large binary data in a database.

const songFileStore = new Map<string, File>();

/**
 * Adds a File object to the in-memory session store.
 * @param id The unique ID of the song.
 * @param file The File object from a file input or drop event.
 */
export const addFileToSessionStore = (id: string, file: File): void => {
    songFileStore.set(id, file);
};

/**
 * Retrieves a File object from the session store.
 * @param id The unique ID of the song.
 * @returns The File object if it exists in the current session, otherwise undefined.
 */
export const getFileFromSessionStore = (id:string): File | undefined => {
    return songFileStore.get(id);
};

/**
 * Removes a File object from the session store.
 * @param id The unique ID of the song to remove.
 */
export const removeFileFromSessionStore = (id: string): void => {
    songFileStore.delete(id);
};

/**
 * Checks if a song's audio file is available in the current session.
 * @param id The unique ID of the song.
 * @returns True if the file is loaded in memory, false otherwise.
 */
export const isFileInSessionStore = (id: string): boolean => {
    return songFileStore.has(id);
};

/**
 * Clears the entire session file store.
 * Useful on logout or full data import/deletion.
 */
export const clearSessionStore = (): void => {
    songFileStore.clear();
};
