// Frontend/src/App.jsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from './context/AuthContext';
import { uploadFile, deleteFile, getUserFiles } from './api/upload';
import { createSession, getSessions, getSession, deleteSession, sendMessage, updateSession } from './api/chat';
import ReactMarkdown from 'react-markdown';
import { 
  Send, 
  FileText, 
  Trash2, 
  Plus, 
  Menu, 
  X, 
  Loader2,
  Bot,
  User,
  Paperclip,
  Sparkles,
  MessageSquare,
  Settings,
  Sun,
  Moon,
  CheckCircle2,
  AlertCircle,
  Copy,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Clock,
  FolderOpen,
  Search,
  Edit2,
  Save,
  Database,
  Upload,
  File,
  Image,
  FileSpreadsheet,
  FileArchive,
  HardDrive,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Check,
  Bookmark,
  BookmarkPlus,
  Share2,
  Zap,
  Shield,
  Mic,
  StopCircle,
  Volume2,
  Maximize2,
  Minimize2
} from 'lucide-react';

function App() {
  const { user, logout } = useAuth();
  
  // State Management
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFileManager, setShowFileManager] = useState(false);
  const [userFiles, setUserFiles] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [feedback, setFeedback] = useState({});
  const [bookmarkedMessages, setBookmarkedMessages] = useState([]);
  const [voiceMode, setVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);
  const fileManagerRef = useRef(null);
  const themeMenuRef = useRef(null);

  // Load sessions and theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const savedSessionId = localStorage.getItem('currentSessionId');
    
    // Apply dark mode class to html element
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
    
    loadSessions(savedSessionId);
    loadUserFiles();
  }, []);

  // Save current session to localStorage
  useEffect(() => {
    if (currentSession?.session_id) {
      localStorage.setItem('currentSessionId', currentSession.session_id);
    }
  }, [currentSession]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Handle click outside theme menu
  useEffect(() => {
    function handleClickOutside(event) {
      if (fileManagerRef.current && !fileManagerRef.current.contains(event.target)) {
        setShowFileManager(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target) && showThemeMenu) {
        setShowThemeMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showThemeMenu]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadSessions = async (savedSessionId = null) => {
    try {
      setInitialLoading(true);
      const data = await getSessions();
      // Handle both array and object responses
      const sessionsArray = Array.isArray(data) ? data : (data.sessions || []);
      setSessions(sessionsArray);
      
      if (sessionsArray.length > 0) {
        // Try to load saved session first, otherwise load most recent
        let sessionToLoad = savedSessionId;
        if (!sessionToLoad || !sessionsArray.find(s => s.session_id === sessionToLoad)) {
          sessionToLoad = sessionsArray[0].session_id;
        }
        await loadSession(sessionToLoad);
      } else {
        await createNewSession();
      }
    } catch (error) {
      console.error("Failed to load sessions:", error);
      setSessions([]);
      await createNewSession();
    } finally {
      setInitialLoading(false);
    }
  };

  const loadUserFiles = async () => {
    try {
      const data = await getUserFiles();
      const filesArray = Array.isArray(data) ? data : (data.files || []);
      setUserFiles(filesArray);
    } catch (error) {
      console.error("Failed to load files:", error);
      setUserFiles([]);
    }
  };

  const loadSession = async (sessionId) => {
    try {
      const session = await getSession(sessionId);
      setCurrentSession(session);
      setMessages(session.messages || []);
    } catch (error) {
      console.error("Failed to load session:", error);
    }
  };

  const createNewSession = async () => {
    try {
      const newSession = await createSession();
      setSessions(prev => [newSession, ...prev]);
      setCurrentSession(newSession);
      setMessages([]);
      setSelectedFiles([]);
      localStorage.setItem('currentSessionId', newSession.session_id);
    } catch (error) {
      console.error("Failed to create session:", error);
    }
  };

  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this session?')) {
      try {
        await deleteSession(sessionId);
        const updatedSessions = sessions.filter(s => s.session_id !== sessionId);
        setSessions(updatedSessions);
        
        if (currentSession?.session_id === sessionId) {
          if (updatedSessions.length > 0) {
            await loadSession(updatedSessions[0].session_id);
          } else {
            await createNewSession();
          }
        }
      } catch (error) {
        console.error("Failed to delete session:", error);
      }
    }
  };

  const handleRenameSession = async (sessionId, newTitle) => {
    if (!newTitle.trim()) return;
    try {
      await updateSession(sessionId, newTitle);
      const updatedSessions = sessions.map(s => 
        s.session_id === sessionId ? { ...s, title: newTitle } : s
      );
      setSessions(updatedSessions);
      if (currentSession?.session_id === sessionId) {
        setCurrentSession(prev => ({ ...prev, title: newTitle }));
      }
      setEditingSessionId(null);
      setEditingTitle('');
    } catch (error) {
      console.error("Failed to rename session:", error);
    }
  };

  const handleSendMessage = async () => {
    if ((!input.trim() && selectedFiles.length === 0) || loading) return;

    const userMessage = {
      role: "user",
      content: input,
      timestamp: new Date(),
      id: Date.now().toString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setIsTyping(true);

    try {
      const response = await sendMessage(
        currentSession?.session_id,
        input,
        selectedFiles.map(f => f.name)
      );

      setMessages(prev => [...prev, {
        role: "assistant",
        content: response.message,
        sources: response.sources,
        timestamp: new Date(response.timestamp),
        id: (Date.now() + 1).toString()
      }]);

      setSelectedFiles([]);
      await loadSessions(); // Refresh sessions to update message counts
      await loadUserFiles(); // Refresh files
      
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
        id: (Date.now() + 1).toString(),
        isError: true
      }]);
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    
    const validFiles = files.filter(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      const validExts = ['pdf', 'docx', 'doc', 'txt', 'xlsx', 'xls', 'pptx', 'ppt', 'jpg', 'jpeg', 'png', 'gif'];
      return validExts.includes(ext);
    });

    if (validFiles.length !== files.length) {
      alert("Some files were skipped due to unsupported format");
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
    e.target.value = '';
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    
    // Upload files in parallel for better performance
    const uploadPromises = selectedFiles.map(async (file) => {
      try {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
        
        const response = await uploadFile(file, currentSession?.session_id);
        
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        
        return { file, response, status: 'success' };
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        setUploadProgress(prev => ({ ...prev, [file.name]: -1 }));
        return { file, error, status: 'error' };
      }
    });
    
    const results = await Promise.all(uploadPromises);
    
    // Show system messages for upload results
    const successUploads = results.filter(r => r.status === 'success');
    const failedUploads = results.filter(r => r.status === 'error');
    
    successUploads.forEach(({ file, response }) => {
      setMessages(prev => [...prev, {
        role: "system",
        content: `✅ Uploaded ${file.name} (${response.chunks_stored} chunks processed)`,
        timestamp: new Date(),
        id: Date.now().toString()
      }]);
    });
    
    failedUploads.forEach(({ file }) => {
      setMessages(prev => [...prev, {
        role: "system",
        content: `❌ Failed to upload ${file.name}`,
        timestamp: new Date(),
        id: Date.now().toString(),
        isError: true
      }]);
    });
    
    setUploading(false);
    setSelectedFiles([]);
    await loadUserFiles();
    
    // Clear progress after 3 seconds
    setTimeout(() => {
      setUploadProgress({});
    }, 3000);
  };

  const handleDeleteFile = async (filename) => {
    if (window.confirm(`Delete ${filename}?`)) {
      try {
        await deleteFile(filename);
        await loadUserFiles();
        setMessages(prev => [...prev, {
          role: "system",
          content: `🗑️ Deleted ${filename}`,
          timestamp: new Date(),
          id: Date.now().toString()
        }]);
      } catch (error) {
        console.error("Failed to delete file:", error);
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    // Redirect to login page
    window.location.href = '/login';
  };

  const copyToClipboard = (text, messageId) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <Image className="h-4 w-4" />;
    if (ext === 'pdf') return <FileText className="h-4 w-4 text-red-500" />;
    if (['docx', 'doc'].includes(ext)) return <FileText className="h-4 w-4 text-blue-500" />;
    if (['xlsx', 'xls', 'csv'].includes(ext)) return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
    if (['pptx', 'ppt'].includes(ext)) return <FileArchive className="h-4 w-4 text-orange-500" />;
    return <File className="h-4 w-4 text-gray-500" />;
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleBookmark = (messageId) => {
    setBookmarkedMessages(prev => 
      prev.includes(messageId) 
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  const handleFeedback = (messageId, type) => {
    setFeedback(prev => ({
      ...prev,
      [messageId]: type
    }));
  };

  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    // Apply dark mode class to html element
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    
    setShowThemeMenu(false);
  };

  const toggleFullscreen = () => {
    if (!fullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setFullscreen(!fullscreen);
    setShowThemeMenu(false);
  };

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (initialLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading your chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-20'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 flex flex-col relative`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          {sidebarOpen ? (
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <h2 className="font-semibold text-gray-800 dark:text-white">AI Assistant</h2>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg mx-auto">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            {sidebarOpen ? <ChevronLeft size={18} className="text-gray-600 dark:text-gray-400" /> : <ChevronRight size={18} className="text-gray-600 dark:text-gray-400" />}
          </button>
        </div>

        {/* Search Bar */}
        {sidebarOpen && (
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* New Chat Button */}
        <div className="px-4 mb-4">
          <button
            onClick={createNewSession}
            className={`w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-all transform hover:scale-105 flex items-center justify-center gap-2 ${
              sidebarOpen ? 'py-3' : 'py-3'
            }`}
          >
            <Plus size={18} />
            {sidebarOpen && "New Chat"}
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto px-2">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No chats yet</p>
              <p className="text-xs">Start a new conversation</p>
            </div>
          ) : (
            filteredSessions.map((session) => (
              <div
                key={session.session_id}
                onClick={() => loadSession(session.session_id)}
                className={`group relative p-3 mb-1 rounded-lg cursor-pointer transition-all ${
                  currentSession?.session_id === session.session_id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {sidebarOpen ? (
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      currentSession?.session_id === session.session_id
                        ? 'bg-blue-100 dark:bg-blue-800'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <MessageSquare className={`h-4 w-4 ${
                        currentSession?.session_id === session.session_id
                          ? 'text-blue-600 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-400'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      {editingSessionId === session.session_id ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleRenameSession(session.session_id, editingTitle);
                              }
                            }}
                            className="flex-1 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            autoFocus
                          />
                          <button
                            onClick={() => handleRenameSession(session.session_id, editingTitle)}
                            className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30"
                          >
                            <Save className="h-4 w-4 text-green-600" />
                          </button>
                          <button
                            onClick={() => setEditingSessionId(null)}
                            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="font-medium text-gray-800 dark:text-white truncate flex items-center gap-2">
                            {session.title}
                            {session.message_count > 0 && (
                              <span className="text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full text-gray-700 dark:text-gray-300">
                                {session.message_count}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            {new Date(session.updated_at).toLocaleDateString()}
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSessionId(session.session_id);
                          setEditingTitle(session.title);
                        }}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                      >
                        <Edit2 className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteSession(session.session_id, e)}
                        className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative flex justify-center">
                    <div className={`p-2 rounded-lg ${
                      currentSession?.session_id === session.session_id
                        ? 'bg-blue-100 dark:bg-blue-800'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <MessageSquare className={`h-5 w-5 ${
                        currentSession?.session_id === session.session_id
                          ? 'text-blue-600 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-400'
                      }`} />
                    </div>
                    {session.message_count > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                        {session.message_count}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* User Profile Section with Theme Toggle and Logout */}
        <div className={`border-t border-gray-200 dark:border-gray-800 p-4 ${sidebarOpen ? '' : 'text-center'}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 text-white" />
            </div>
            {sidebarOpen && (
              <>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 dark:text-white truncate">
                    {user?.email}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Online
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {/* Theme Toggle Button */}
                  <div className="relative">
                    <button
                      onClick={() => setShowThemeMenu(!showThemeMenu)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      title="Theme settings"
                    >
                      {darkMode ? <Sun className="h-4 w-4 text-gray-600 dark:text-gray-400" /> : <Moon className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                    </button>
                    
                    {/* Theme Menu Dropdown */}
                    {showThemeMenu && (
                      <div 
                        ref={themeMenuRef}
                        className="absolute bottom-full right-0 mb-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-2 z-10"
                      >
                        <button
                          onClick={toggleTheme}
                          className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                        >
                          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                          {darkMode ? 'Light Mode' : 'Dark Mode'}
                        </button>
                        <button
                          onClick={toggleFullscreen}
                          className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                        >
                          <Maximize2 className="h-4 w-4" />
                          Fullscreen
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors group"
                    title="Logout"
                  >
                    <LogOut className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              </>
            )}
          </div>
          {!sidebarOpen && (
            <div className="mt-3 flex flex-col gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors mx-auto"
                title={darkMode ? 'Light Mode' : 'Dark Mode'}
              >
                {darkMode ? <Sun className="h-4 w-4 text-gray-600 dark:text-gray-400" /> : <Moon className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
              </button>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors mx-auto"
                title="Logout"
              >
                <LogOut className="h-4 w-4 text-red-600" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950">
        {/* Chat Header */}
        {currentSession && (
          <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
                {currentSession.title}
              </h1>
              {currentSession.files && currentSession.files.length > 0 && (
                <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                  <FolderOpen className="h-4 w-4" />
                  <span>{currentSession.files.length} files</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFileManager(!showFileManager)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors relative"
              >
                <FolderOpen className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                {userFiles.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {userFiles.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* File Manager Dropdown */}
        {showFileManager && (
          <div 
            ref={fileManagerRef}
            className="absolute right-6 top-20 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-20"
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800 dark:text-white">Your Files</h3>
              <button onClick={() => setShowFileManager(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <X className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              {userFiles.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No files uploaded yet</p>
                </div>
              ) : (
                userFiles.map((file, index) => (
                  <div
                    key={index}
                    className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {getFileIcon(file.filename)}
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-800 dark:text-white truncate">
                          {file.filename}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(file.size)} • {new Date(file.upload_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteFile(file.filename)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-4 py-6"
        >
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-2xl inline-block mb-6">
                  <Sparkles className="h-12 w-12 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">
                  Welcome to AI Assistant
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                  Upload files and ask questions. I can help you analyze documents, extract information, and more!
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <FileText className="h-6 w-6 text-blue-600 mb-2" />
                    <h3 className="font-medium text-gray-800 dark:text-white">Upload Files</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">PDF, DOCX, Images</p>
                  </div>
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <MessageSquare className="h-6 w-6 text-purple-600 mb-2" />
                    <h3 className="font-medium text-gray-800 dark:text-white">Ask Questions</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Get instant answers</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 relative group ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                        : msg.role === 'system'
                        ? msg.isError
                          ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                          : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white'
                    }`}
                  >
                    {/* Message Header */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs opacity-75">
                        {msg.role === 'user' ? 'You' : msg.role === 'system' ? 'System' : 'AI Assistant'}
                      </span>
                      <span className="text-xs opacity-50">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>

                    {/* Message Content with Markdown support for assistant messages */}
                    {msg.role === 'assistant' ? (
                      <div className="prose dark:prose-invert max-w-none text-sm">
                        <ReactMarkdown>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                    )}

                    {/* Sources */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-xs font-medium mb-2 text-gray-500 dark:text-gray-400">
                          Sources:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {msg.sources.map((source, i) => (
                            <div
                              key={i}
                              className="text-xs bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1 text-gray-600 dark:text-gray-300 flex items-center gap-1"
                              title={source.text_snippet}
                            >
                              {getFileIcon(source.file)}
                              <span>{source.file.split('/').pop()}</span>
                              {source.score && (
                                <span className="text-gray-400">
                                  ({(source.score * 100).toFixed(0)}%)
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Message Actions */}
                    <div className="absolute -bottom-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-1">
                      {msg.role === 'assistant' && (
                        <>
                          <button
                            onClick={() => handleFeedback(msg.id, 'like')}
                            className={`p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors ${
                              feedback[msg.id] === 'like' ? 'text-green-600' : 'text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            <ThumbsUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleFeedback(msg.id, 'dislike')}
                            className={`p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors ${
                              feedback[msg.id] === 'dislike' ? 'text-red-600' : 'text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            <ThumbsDown className="h-3 w-3" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => copyToClipboard(msg.content, msg.id)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-600 dark:text-gray-400"
                      >
                        {copiedMessageId === msg.id ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                      </button>
                      <button
                        onClick={() => toggleBookmark(msg.id)}
                        className={`p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors ${
                          bookmarkedMessages.includes(msg.id) ? 'text-yellow-600' : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {bookmarkedMessages.includes(msg.id) ? <Bookmark className="h-3 w-3" /> : <BookmarkPlus className="h-3 w-3" />}
                      </button>
                      {msg.role === 'assistant' && (
                        <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-600 dark:text-gray-400">
                          <Share2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start mt-4">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Selected Files Preview */}
        {selectedFiles.length > 0 && (
          <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Files to upload ({selectedFiles.length})
              </span>
              <button
                onClick={handleUploadFiles}
                disabled={uploading}
                className="text-xs bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1 rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {uploading ? <Loader2 className="animate-spin h-3 w-3" /> : <Upload className="h-3 w-3" />}
                Upload All
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 flex items-center gap-2 text-sm group relative"
                >
                  {getFileIcon(file.name)}
                  <div>
                    <div className="font-medium text-gray-800 dark:text-white max-w-[200px] truncate">
                      {file.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                  {uploadProgress[file.name] === 100 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : uploadProgress[file.name] === -1 ? (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  ) : (
                    <button
                      onClick={() => removeFile(idx)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {uploadProgress[file.name] > 0 && uploadProgress[file.name] < 100 && (
                    <div className="absolute inset-0 bg-blue-500/10 rounded-lg flex items-center justify-center">
                      <div className="text-xs font-medium text-blue-600">
                        {uploadProgress[file.name]}%
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-4">
          <div className="flex items-end gap-4 max-w-4xl mx-auto">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask anything... (Shift+Enter for new line)"
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none max-h-[200px] text-gray-900 dark:text-white placeholder-gray-500"
                rows="1"
              />
              <div className="absolute right-3 bottom-3 text-xs text-gray-400">
                {input.length}/2000
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                className="hidden"
                accept=".pdf,.docx,.doc,.txt,.xlsx,.xls,.pptx,.ppt,.jpg,.jpeg,.png,.gif"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors relative group"
                title="Attach files"
              >
                <Paperclip className="h-5 w-5" />
                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Attach files
                </span>
              </button>
              <button
                onClick={() => setVoiceMode(!voiceMode)}
                className={`p-3 rounded-lg transition-colors relative group ${
                  voiceMode 
                    ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {isRecording ? <StopCircle className="h-5 w-5 animate-pulse" /> : <Mic className="h-5 w-5" />}
                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {voiceMode ? 'Stop voice input' : 'Voice input'}
                </span>
              </button>
              <button
                onClick={handleSendMessage}
                disabled={(!input.trim() && selectedFiles.length === 0) || loading}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 group relative"
              >
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  <>
                    <Send className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    <span className="hidden sm:inline">Send</span>
                  </>
                )}
                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {loading ? 'Sending...' : 'Send message (Enter)'}
                </span>
              </button>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-400 text-center flex items-center justify-center gap-4">
            <span>✨ AI-powered responses</span>
            <span>•</span>
            <span>📁 PDF, DOCX, Images</span>
            <span>•</span>
            <span>🔒 Private & secure</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .typing-dot {
          animation: bounce 1.4s infinite ease-in-out;
        }
        
        @keyframes bounce {
          0%, 60%, 100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-6px);
          }
        }
      `}</style>
    </div>
  );
}

export default App;