import { useState } from "react";
import { uploadPDF } from "./api/upload";
import { askQuestion } from "./api/ask";
import {
  FileText,
  Upload,
  MessageSquare,
  Send,
  CheckCircle,
  AlertCircle,
  Loader,
  Sparkles,
  BookOpen
} from 'lucide-react';

function App() {
  const [file, setFile] = useState(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [fileName, setFileName] = useState("");

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    // Validate file type
    if (selectedFile && !selectedFile.name.toLowerCase().endsWith('.pdf')) {
      alert('Please select a PDF file');
      e.target.value = ''; // Clear the input
      return;
    }
    
    // Validate file size (max 10MB)
    if (selectedFile && selectedFile.size > 10 * 1024 * 1024) {
      alert('File size too large. Maximum size is 10MB');
      e.target.value = '';
      return;
    }
    
    setFile(selectedFile);
    setFileName(selectedFile?.name || "");
    setUploadStatus(null);
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file first");
      return;
    }

    setUploading(true);
    setUploadStatus(null);

    try {
      const res = await uploadPDF(file);
      setUploadStatus({ 
        success: true, 
        message: res.message || "PDF uploaded successfully!" 
      });
      // Clear the file input after successful upload
      setFile(null);
      setFileName("");
      // Reset file input
      document.querySelector('input[type="file"]').value = '';
    } catch (error) {
      setUploadStatus({ 
        success: false, 
        message: error.message || "Upload failed" 
      });
    } finally {
      setUploading(false);
    }
  };

  const handleAsk = async () => {
    if (!question.trim()) {
      alert("Please enter a question");
      return;
    }

    setAsking(true);
    setAnswer("");
    setSources([]);

    try {
      const res = await askQuestion(question);
      setAnswer(res.answer || "No answer received");
      setSources(res.sources || []);
    } catch (error) {
      setAnswer("Error: " + (error.message || "Failed to get answer"));
      setSources([]);
    } finally {
      setAsking(false);
    }
  };

  // Handle Enter key press (Shift+Enter for new line, Enter to submit)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-3 rounded-xl">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">PDF AI Assistant</h1>
              <p className="text-gray-600">Upload PDFs and ask questions using AI</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Left Column - Upload Section */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-blue-100 p-2 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Upload PDF</h2>
            </div>

            {/* Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />

              <label className="cursor-pointer">
                <span className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-block">
                  Choose File
                </span>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {fileName && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600">
                  <FileText className="h-4 w-4" />
                  <span className="truncate max-w-[200px]">{fileName}</span>
                </div>
              )}
              
              <p className="text-xs text-gray-400 mt-2">Maximum file size: 10MB</p>
            </div>

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className={`w-full mt-4 py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                !file || uploading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg"
              }`}
            >
              {uploading ? (
                <>
                  <Loader className="animate-spin" size={18} />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={18} />
                  Upload PDF
                </>
              )}
            </button>

            {/* Upload Status */}
            {uploadStatus && (
              <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${
                uploadStatus.success ? 'bg-green-50' : 'bg-red-50'
              }`}>
                {uploadStatus.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p className={`font-medium ${
                    uploadStatus.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {uploadStatus.success ? 'Success!' : 'Error!'}
                  </p>
                  <p className={`text-sm ${
                    uploadStatus.success ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {uploadStatus.message}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Question Section */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-purple-100 p-2 rounded-lg">
                <MessageSquare className="h-5 w-5 text-purple-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Ask Question</h2>
            </div>

            {/* Question Input */}
            <div className="space-y-4">
              <div className="relative">
                <textarea
                  value={question}
                  onChange={(e) => {
                    // Limit to 500 characters
                    if (e.target.value.length <= 500) {
                      setQuestion(e.target.value);
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask something about your PDF... (Press Enter to submit, Shift+Enter for new line)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows="4"
                />
                <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                  {question.length}/500
                </div>
              </div>

              <button
                onClick={handleAsk}
                disabled={!question.trim() || asking}
                className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                  !question.trim() || asking
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-purple-600 text-white hover:bg-purple-700 hover:shadow-lg"
                }`}
              >
                {asking ? (
                  <>
                    <Loader className="animate-spin" size={18} />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Ask Question
                  </>
                )}
              </button>
            </div>

            {/* Answer Section */}
            {(answer || asking || sources.length > 0) && (
              <div className="mt-6 border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  Answer
                </h3>

                <div className="bg-gray-50 rounded-lg p-4 min-h-[100px] mb-4">
                  {asking ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Loader className="animate-spin h-8 w-8 text-purple-600 mx-auto mb-2" />
                        <p className="text-gray-500">Getting answer...</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {answer || "No answer yet. Ask a question above!"}
                    </p>
                  )}
                </div>

                {/* Sources Section - FIXED */}
                {sources && sources.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Sources Used
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {sources.map((source, index) => (
                        <span
                          key={index}
                          className="bg-white text-blue-700 px-3 py-1 rounded-full text-xs font-medium border border-blue-200 shadow-sm flex items-center gap-1"
                        >
                          <FileText className="h-3 w-3" />
                          {/* FIXED: Display page number correctly */}
                          Page {source.page || 'N/A'}
                          {source.file && (
                            <span className="text-blue-400">• {source.file.split('/').pop()}</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          Powered by AI • Upload PDF and ask questions about its content
        </div>
      </main>
    </div>
  );
}

export default App;