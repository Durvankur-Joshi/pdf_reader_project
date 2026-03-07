import API from "./api";

export const askQuestion = async (question) =>{
    const res = await API.post('/ask', { 
        question : question
     })
    return res.data;
}