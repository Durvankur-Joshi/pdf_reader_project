import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, UserPlus, AlertCircle, Sparkles, CheckCircle } from 'lucide-react';

export default function Signup() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { signup } = useAuth();
    const navigate = useNavigate();

    const validatePassword = () => {
        if (password.length < 6) {
            return 'Password must be at least 6 characters';
        }
        if (password !== confirmPassword) {
            return 'Passwords do not match';
        }
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const passwordError = validatePassword();
        if (passwordError) {
            setError(passwordError);
            return;
        }

        setError('');
        setLoading(true);

        const result = await signup(email, password);
        
        if (result.success) {
            navigate('/');
        } else {
            setError(result.error);
        }
        
        setLoading(false);
    };

    const getPasswordStrength = () => {
        if (!password) return null;
        
        const hasLower = /[a-z]/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecial = /[^A-Za-z0-9]/.test(password);
        
        const strength = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
        
        if (strength < 2) return 'weak';
        if (strength < 4) return 'medium';
        return 'strong';
    };

    const passwordStrength = getPasswordStrength();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="bg-blue-600 p-3 rounded-xl inline-block mb-4">
                        <Sparkles className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
                    <p className="text-gray-600 mt-2">Sign up to get started</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                {/* Signup Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="you@example.com"
                                required
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="••••••••"
                                required
                                disabled={loading}
                                minLength={6}
                            />
                        </div>
                        
                        {/* Password strength indicator */}
                        {password && (
                            <div className="mt-2">
                                <div className="flex gap-1 mb-1">
                                    <div className={`h-1 flex-1 rounded ${
                                        passwordStrength === 'weak' ? 'bg-red-500' :
                                        passwordStrength === 'medium' ? 'bg-yellow-500' :
                                        passwordStrength === 'strong' ? 'bg-green-500' : 'bg-gray-200'
                                    }`} />
                                    <div className={`h-1 flex-1 rounded ${
                                        passwordStrength === 'medium' ? 'bg-yellow-500' :
                                        passwordStrength === 'strong' ? 'bg-green-500' : 'bg-gray-200'
                                    }`} />
                                    <div className={`h-1 flex-1 rounded ${
                                        passwordStrength === 'strong' ? 'bg-green-500' : 'bg-gray-200'
                                    }`} />
                                </div>
                                <p className="text-xs text-gray-500">
                                    {passwordStrength === 'weak' && 'Weak password'}
                                    {passwordStrength === 'medium' && 'Medium password'}
                                    {passwordStrength === 'strong' && 'Strong password'}
                                </p>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                    confirmPassword && password !== confirmPassword
                                        ? 'border-red-300 bg-red-50'
                                        : 'border-gray-300'
                                }`}
                                placeholder="••••••••"
                                required
                                disabled={loading}
                                minLength={6}
                            />
                        </div>
                        {confirmPassword && password === confirmPassword && (
                            <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Passwords match
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                            loading
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg'
                        }`}
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                Creating account...
                            </>
                        ) : (
                            <>
                                <UserPlus size={18} />
                                Sign Up
                            </>
                        )}
                    </button>
                </form>

                {/* Login Link */}
                <p className="mt-6 text-center text-gray-600">
                    Already have an account?{' '}
                    <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}