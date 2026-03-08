import { useState } from 'react'
import { supabaseClient } from '../supabase'
import { formatPhoneNumber } from '../helpers'

export default function LoginModal({ onClose, onLoginSuccess, onSwitchToRegister }) {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!phone || !password) {
            setError('Please fill in all fields');
            return;
        }

        setIsLoading(true);

        try {
            const formattedPhone = formatPhoneNumber(phone);
            const emailAlias = formattedPhone + '@searchpadi.app';

            const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
                email: emailAlias,
                password: password
            });

            if (authError) throw authError;

            const { data: profileData, error: profileError } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', authData.user.id)
                .single();

            if (profileError) throw profileError;

            const sellerData = {
                id: profileData.id,
                name: profileData.business_name,
                email: profileData.email,
                category: profileData.category,
                gender: profileData.gender || null,
                location: profileData.location,
                bio: profileData.bio || 'Seller on SearchPadi',
                isVerified: profileData.is_verified || false,
                isTrusted: profileData.is_free_trial && profileData.free_trial_expires_at
                    ? new Date(profileData.free_trial_expires_at) > new Date()
                    : profileData.subscription_plan === 'growth_pro',
                whatsappNumber: profileData.whatsapp,
                profilePhoto: profileData.profile_photo,
                views: profileData.views || 0,
                subscription: profileData.subscription_plan || 'free',
                products: []
            };

            // Open their full profile via deep link in main app
            window.location.href = '/?seller=' + profileData.id;

        } catch (err) {
            console.error('Login error:', err);
            if (err.message?.includes('Invalid login')) {
                setError('Wrong phone number or password. Please try again.');
            } else {
                setError(err.message || 'Login failed. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-[#1a1a1a] rounded-2xl w-full max-w-md border border-gray-800"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-white">Seller Login</h2>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white hover:bg-gray-700"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Phone Number</label>
                            <div className="flex gap-2">
                                <span className="bg-[#2a2a2a] border border-gray-700 text-white px-3 py-2 rounded-lg flex items-center text-sm font-medium">
                                    +234
                                </span>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').substring(0, 10))}
                                    className="flex-1 px-4 py-2 bg-[#2a2a2a] border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500 text-sm"
                                    placeholder="8012345678"
                                    maxLength="10"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full px-4 py-2 bg-[#2a2a2a] border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500 text-sm"
                                placeholder="Enter your password"
                            />
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Logging in...' : 'Login'}
                        </button>

                        <p className="text-center text-gray-400 text-sm">
                            Don't have an account?{' '}
                            <button
                                onClick={onSwitchToRegister}
                                className="text-purple-400 hover:text-purple-300 font-medium"
                            >
                                Register here
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
