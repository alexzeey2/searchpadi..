import React, { useState, useEffect, useRef } from 'react'
import { supabaseClient } from '../supabase'

export default function LoginModal({ onClose, onLoginSuccess, onSwitchToRegister }) {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (!formData.email || !formData.password) {
            setError('Please fill in all fields');
            return;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('Please enter a valid email address');
            return;
        }
        
        setIsLoading(true);
        
        try {
            const { data, error: authError } = await supabaseClient.auth.signInWithPassword({
                email: formData.email,
                password: formData.password
            });
            
            if (authError) throw authError;
            
            const { data: profile, error: profileError } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();
            
            if (profileError) {
                console.error('Profile fetch error:', profileError);
                throw new Error('Could not load profile. Please contact support.');
            }
            
            // Fetch user's products
            const { data: products, error: productsError } = await supabaseClient
                .from('products')
                .select('*')
                .eq('seller_id', profile.id);
            
            const sellerData = {
                id: profile.id,
                name: profile.business_name,
                email: profile.email,
                category: profile.category,
                gender: profile.gender || null,
                location: profile.location,
                bio: profile.bio || "Seller on SearchPadi",
                isVerified: profile.is_verified || false,
                accountStatus: profile.account_status || 'approved',
                whatsappNumber: profile.whatsapp,
                profilePhoto: profile.profile_photo || DEFAULT_PROFILE_IMAGE,
                views: profile.views || 0,
                products: (products || []).map(p => ({
                    id: p.id,
                    name: p.name,
                    price: p.price || 'Ask for Price',
                    images: p.images || [DEFAULT_PRODUCT_IMAGE],
                    keywords: p.keywords || [],
                    likes: p.likes || 0,
                    liked: false,
                    isTrusted: p.is_trusted || false
                })),
                subscription: profile.subscription_plan || 'free'
            };

            // Account status check - only block declined accounts
            if (profile.account_status === 'declined') {
                setError('❌ Your account application was declined. Contact support for more info.');
                setIsLoading(false);
                await supabaseClient.auth.signOut();
                return;
            }
            
            onLoginSuccess(sellerData);
            // Request push notification permission
            if ('Notification' in window && 'serviceWorker' in navigator) {
                Notification.requestPermission().then(async (permission) => {
                    if (permission === 'granted') {
                        try {
                            const reg = await navigator.serviceWorker.ready;
                            const sub = await reg.pushManager.subscribe({
                                userVisibleOnly: true,
                                applicationServerKey: 'BMh9JcJgTwrWfj3Mr_T8RASxfwhCsHC3kcY6hQ_Zow5AZM-J3aebC90bOlRxEllhgYAVYoIDqQxgb03xZnT1oJs'
                            });
                            await supabaseClient.from('push_subscriptions').upsert({
                                seller_id: sellerData.id,
                                endpoint: sub.endpoint,
                                p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')))),
                                auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth'))))
                            }, { onConflict: 'seller_id,endpoint' });
                        } catch(e) { console.error('Push subscription error:', e); }
                    }
                });
            }
            alert('✅ Login successful! Welcome back!');
        } catch (error) {
            console.error('Login error:', error);
            setError(error.message || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[#1a1a1a] rounded-2xl max-w-md w-full border border-gray-800" onClick={(e) => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-white">Seller Login</h2>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white">
                            ✕
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-4">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Email Address *</label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-2 bg-[#2a2a2a] border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500"
                                placeholder="yourname@gmail.com"
                            />
                            <p className="text-xs text-gray-400 mt-1">Enter your registered email address</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Password *</label>
                            <input
                                type="password"
                                required
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-4 py-2 bg-[#2a2a2a] border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500"
                                placeholder="Enter your password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading && (
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            )}
                            {isLoading ? 'Logging in...' : 'Login'}
                        </button>
                        
                        {onSwitchToRegister && (
                            <p className="text-center text-gray-400 text-sm mt-4">
                                Don't have an account?{' '}
                                <button 
                                    type="button"
                                    onClick={onSwitchToRegister}
                                    className="text-purple-500 hover:text-purple-400 font-medium"
                                >
                                    Register here
                                </button>
                            </p>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}
