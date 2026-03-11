import API from "./api";

export const getSessions = async () => {
    try {
        const response = await API.get('/sessions');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch sessions:', error);
        throw error;
    }
};

export const getSession = async (sessionId) => {
    try {
        const response = await API.get(`/sessions/${sessionId}`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch session:', error);
        throw error;
    }
};

export const createSession = async (title = null) => {
    try {
        const response = await API.post('/sessions', null, {
            params: { title }
        });
        return response.data;
    } catch (error) {
        console.error('Failed to create session:', error);
        throw error;
    }
};

export const updateSession = async (sessionId, title) => {
    try {
        const response = await API.put(`/sessions/${sessionId}`, { title });
        return response.data;
    } catch (error) {
        console.error('Failed to update session:', error);
        throw error;
    }
};

export const deleteSession = async (sessionId) => {
    try {
        const response = await API.delete(`/sessions/${sessionId}`);
        return response.data;
    } catch (error) {
        console.error('Failed to delete session:', error);
        throw error;
    }
};

export const sendMessage = async (sessionId, message, files = []) => {
    try {
        const response = await API.post('/chat', {
            session_id: sessionId,
            message: message,
            files: files
        });
        return response.data;
    } catch (error) {
        console.error('Failed to send message:', error);
        throw error;
    }
};

export const getMessages = async (sessionId) => {
    try {
        const response = await API.get(`/sessions/${sessionId}/messages`);
        return response.data;
    } catch (error) {
        console.error('Failed to get messages:', error);
        throw error;
    }
};

export const deleteMessage = async (sessionId, messageId) => {
    try {
        const response = await API.delete(`/sessions/${sessionId}/messages/${messageId}`);
        return response.data;
    } catch (error) {
        console.error('Failed to delete message:', error);
        throw error;
    }
};

export const editMessage = async (sessionId, messageId, content) => {
    try {
        const response = await API.put(`/sessions/${sessionId}/messages/${messageId}`, {
            content
        });
        return response.data;
    } catch (error) {
        console.error('Failed to edit message:', error);
        throw error;
    }
};

export const bookmarkMessage = async (sessionId, messageId) => {
    try {
        const response = await API.post(`/sessions/${sessionId}/messages/${messageId}/bookmark`);
        return response.data;
    } catch (error) {
        console.error('Failed to bookmark message:', error);
        throw error;
    }
};

export const getBookmarkedMessages = async () => {
    try {
        const response = await API.get('/bookmarks');
        return response.data;
    } catch (error) {
        console.error('Failed to get bookmarks:', error);
        throw error;
    }
};