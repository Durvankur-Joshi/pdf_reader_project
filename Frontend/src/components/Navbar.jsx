import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, LogOut, User } from 'lucide-react';

export default function Navbar() {
    const { user, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (!isAuthenticated) return null;

    return (
        <nav className="bg-white shadow-sm border-b">
            <div className="max-w-6xl mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="bg-blue-600 p-2 rounded-lg">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <span className="font-semibold text-gray-900">PDF AI Assistant</span>
                    </Link>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User className="h-4 w-4" />
                            <span>{user?.email}</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <LogOut className="h-4 w-4" />
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}