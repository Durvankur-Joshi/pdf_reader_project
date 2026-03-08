import API from "./api";

export const uploadPDF = async (file) => {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await API.post('/upload', formData, {
            headers: {
                "Content-Type": "multipart/form-data"
            }
        });
        
        return res.data;
    } catch (error) {
        // Enhanced error handling
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            throw new Error(error.response.data?.detail || `Upload failed: ${error.response.status}`);
        } else if (error.request) {
            // The request was made but no response was received
            throw new Error('No response from server. Is the backend running?');
        } else {
            // Something happened in setting up the request that triggered an Error
            throw new Error(error.message || 'Upload failed');
        }
    }
};