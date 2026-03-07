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
  Sparkles
} from 'lucide-react';

function App() {
  const [file, setFile] = useState(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [fileName, setFileName] = useState("");

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
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
      setUploadStatus({ success: true, message: res.message || "PDF uploaded successfully!" });
    } catch (error) {
      setUploadStatus({ success: false, message: error.message || "Upload failed" });
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

    try {
      const res = await askQuestion(question);
      setAnswer(res.answer || res || "No answer received");
    } catch (error) {
      setAnswer("Error: " + (error.message || "Failed to get answer"));
    } finally {
      setAsking(false);
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
            </div>

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className={`w-full mt-4 py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${!file || uploading
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
              <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${uploadStatus.success ? 'bg-green-50' : 'bg-red-50'
                }`}>
                {uploadStatus.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                )}
                <div>
                  <p className={`font-medium ${uploadStatus.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                    {uploadStatus.success ? 'Success!' : 'Error!'}
                  </p>
                  <p className={`text-sm ${uploadStatus.success ? 'text-green-600' : 'text-red-600'
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
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask something about your PDF..."
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
                className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${!question.trim() || asking
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
            {(answer || asking) && (
              <div className="mt-6 border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  Answer
                </h3>

                <div className="bg-gray-50 rounded-lg p-4 min-h-[100px]">
                  {asking ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Loader className="animate-spin h-8 w-8 text-purple-600 mx-auto mb-2" />
                        <p className="text-gray-500">Getting answer...</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-700 whitespace-pre-wrap">{answer}</p>
                  )}
                </div>
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