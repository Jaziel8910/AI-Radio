

declare var puter: any;

const isPuterReady = () => typeof puter !== 'undefined' && puter.auth && puter.fs;

interface ProfileUpdatePayload {
    newUsername?: string;
    newAvatarFile?: File | null;
}

export const updateProfile = async (currentUser: any, payload: ProfileUpdatePayload): Promise<any> => {
    if (!isPuterReady()) throw new Error("Puter no está disponible.");

    const { newUsername, newAvatarFile } = payload;
    let authUpdatePayload: { username?: string; photoURL?: string } = {};

    // 1. Actualizar nombre de usuario si ha cambiado
    if (newUsername && newUsername.trim() !== currentUser.username) {
        authUpdatePayload.username = newUsername.trim();
    }

    // 2. Subir y actualizar avatar si se ha proporcionado uno nuevo
    if (newAvatarFile) {
        try {
            const userIdentifier = currentUser.uid || currentUser.username;
            const avatarPath = `/ai-radio/avatars/${userIdentifier}_${Date.now()}`;
            
            console.log(`Subiendo avatar a: ${avatarPath}`);
            await puter.fs.write(avatarPath, newAvatarFile);
            
            console.log("Obteniendo enlace público para el avatar...");
            const publicUrl = await puter.fs.getLink(avatarPath);
            
            if (!publicUrl) {
                throw new Error("No se pudo obtener la URL pública para el avatar subido.");
            }
            
            authUpdatePayload.photoURL = publicUrl;
            console.log(`URL pública del avatar: ${publicUrl}`);

        } catch (error) {
            console.error("Error al subir el avatar a Puter FS:", error);
            throw new Error("No se pudo subir la imagen del avatar.");
        }
    }

    // 3. Aplicar los cambios a la cuenta de Puter si hay algo que actualizar
    if (Object.keys(authUpdatePayload).length > 0) {
        try {
            console.log("Actualizando perfil de Puter con:", authUpdatePayload);
            await puter.auth.updateUser(authUpdatePayload);
        } catch (error) {
            console.error("Error al actualizar el perfil de usuario de Puter:", error);
            throw new Error("No se pudo actualizar la información del perfil.");
        }
    }

    // 4. Devolver el objeto de usuario actualizado
    return await puter.auth.getUser();
};
