import API from "./api";

export const uploadFile = async (file, sessionId = null) => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        if (sessionId) {
            formData.append('session_id', sessionId);
        }

        const response = await API.post('/upload', formData, {
            headers: {
                "Content-Type": "multipart/form-data"
            },
            onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                // You can handle progress here if needed
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('Upload failed:', error);
        throw error;
    }
};

export const getUserFiles = async (sessionId = null) => {
    try {
        const response = await API.get('/files', {
            params: { session_id: sessionId }
        });
        return response.data;
    } catch (error) {
        console.error('Failed to fetch files:', error);
        throw error;
    }
};

export const deleteFile = async (filename) => {
    try {
        const response = await API.delete(`/files/${filename}`);
        return response.data;
    } catch (error) {
        console.error('Failed to delete file:', error);
        throw error;
    }
};