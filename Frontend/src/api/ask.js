import API from "./api";

export const askQuestion = async (question) => {
    try {
        const res = await API.post('/ask', {
            question: question
        });
        
        // Validate response structure
        if (!res.data) {
            throw new Error('Empty response from server');
        }
        
        return {
            answer: res.data.answer || 'No answer received',
            sources: res.data.sources || [],
            question: res.data.question || question
        };
    } catch (error) {
        // Enhanced error handling
        if (error.response) {
            // Server responded with error
            throw new Error(error.response.data?.detail || `Error ${error.response.status}: Failed to get answer`);
        } else if (error.request) {
            // No response received
            throw new Error('Cannot reach server. Make sure backend is running.');
        } else {
            // Other errors
            throw new Error(error.message || 'Failed to ask question');
        }
    }
};