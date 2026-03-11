import React, { useState, useEffect, useRef } from 'react'
import { supabaseClient } from './supabase'
import { formatPhoneNumber, shortenLink, WHATSAPP_NUMBER, DEFAULT_PROFILE_IMAGE, DEFAULT_PRODUCT_IMAGE } from './helpers'
import EditProfileModal from './components/EditProfileModal'
import AttractCustomersModal from './components/AttractCustomersModal'
import SellerProfile from './components/SellerProfile'
import ProductDetail from './components/ProductDetail'
import LoginModal from './components/LoginModal'
import AddProductModal from './components/AddProductModal'
import SubscriptionModal from './components/SubscriptionModal'
import SomtoPromoteChat from './components/SomtoPromoteChat'
import WhatsAppModal from './components/WhatsAppModal'

export default function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [showRegistration, setShowRegistration] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [showAddProduct, setShowAddProduct] = useState(false);
    const [showSubscription, setShowSubscription] = useState(false);
    const [showSomtoPromote, setShowSomtoPromote] = useState(false);
    const [headerFreeSlots, setHeaderFreeSlots] = useState(null); // null = not loaded yet
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [showAttractCustomers, setShowAttractCustomers] = useState(false);
    const [showBubbleMessage, setShowBubbleMessage] = useState(false);
    const [bubblePos, setBubblePos] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 160 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const bubbleDragRef = useRef(false);
    const bubbleMoveRef = useRef(false);
    
    const [logoHoldTimer, setLogoHoldTimer] = useState(null);
    
    // Loading states
    const [isRegistering, setIsRegistering] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isUploadingProduct, setIsUploadingProduct] = useState(false);
    const [isLoadingProductView, setIsLoadingProductView] = useState(false);
    
    const [messages, setMessages] = useState([
        { 
            id: 1, 
            type: 'assistant', 
            text: 'Hi! 👋 I\'m Somto, your Search Padi.\n\nYou might like these handpicked items just for you! ✨', 
            timestamp: new Date(),
            messageId: 1
        }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const [currentStep, setCurrentStep] = useState('recommendations');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedGender, setSelectedGender] = useState(null);
    const [showProducts, setShowProducts] = useState(false);
    const [showSellers, setShowSellers] = useState(false);
    const [displayedProducts, setDisplayedProducts] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [productOffset, setProductOffset] = useState(0);
    const [sellerOffset, setSellerOffset] = useState(0);
    const [showNoMoreMessage, setShowNoMoreMessage] = useState(false);
    const [selectedSeller, setSelectedSeller] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [sellers, setSellers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchContext, setSearchContext] = useState(null);
    const [clickedButtons, setClickedButtons] = useState({});
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [showSplash, setShowSplash] = useState(true);
    const messagesEndRef = useRef(null);

    const PRODUCTS_PER_PAGE = 5;
    const SELLERS_PER_PAGE = 4;
    const DB_BATCH_SIZE = 5;

    // Load sellers and products from database on mount
    useEffect(() => {
        setTimeout(() => setShowSplash(false), 6000);
        loadSellersFromDatabase();
        trackVisit();

        // Check session first — if logged in, go straight to profile
        const initAuth = async () => {
            try {
                const { data } = await supabaseClient.auth.getSession();
                const userId = data.session?.user?.id;

                if (!userId) {
                    // No session — handle deep links as buyer
                    handleDeepLinks();
                    return;
                }

                // Logged in — fetch full profile + all products at once
                const [profileResult, productsResult] = await Promise.all([
                    supabaseClient.from('profiles').select('*').eq('id', userId).single(),
                    supabaseClient.from('products').select('*').eq('seller_id', userId)
                ]);

                if (!profileResult.data) { handleDeepLinks(); return; }

                const profileData = profileResult.data;
                const isTrusted = profileData.is_free_trial && profileData.free_trial_expires_at
                    ? new Date(profileData.free_trial_expires_at) > new Date()
                    : profileData.subscription_plan === 'growth_pro';

                const sellerData = {
                    id: profileData.id,
                    name: profileData.business_name,
                    email: profileData.email,
                    category: profileData.category,
                    gender: profileData.gender || null,
                    location: profileData.location,
                    bio: profileData.bio || 'Seller on SearchPadi',
                    isVerified: profileData.is_verified || false,
                    isTrusted,
                    whatsappNumber: profileData.whatsapp,
                    profilePhoto: profileData.profile_photo,
                    views: profileData.views || 0,
                    subscription: profileData.subscription_plan || 'free',
                    products: (productsResult.data || []).map(p => ({
                        id: p.id, name: p.name, price: p.price || 'Ask for Price',
                        description: p.description || '',
                        images: p.images || [DEFAULT_PRODUCT_IMAGE],
                        keywords: p.keywords || [],
                        likes: p.likes || 0,
                        liked: false
                    }))
                };

                setCurrentUser({ type: 'seller', data: sellerData });

                // If URL has a deep link param, handle that instead of auto-opening own profile
                const urlParams = new URLSearchParams(window.location.search);
                const deepSellerId = urlParams.get('seller');
                const deepProductId = urlParams.get('product');

                if (deepProductId) {
                    // Deep link to a product — load and show it
                    const { data: productData } = await supabaseClient
                        .from('products').select('*, profiles(*)').eq('id', deepProductId).single();
                    if (productData) {
                        const pSeller = productData.profiles;
                        setSelectedProduct({
                            id: productData.id, name: productData.name,
                            price: productData.price || 'Ask for Price',
                            description: productData.description || '',
                            images: productData.images || [],
                            keywords: productData.keywords || [],
                            likes: productData.likes || 0, liked: false,
                            seller: {
                                id: pSeller.id, name: pSeller.business_name,
                                whatsappNumber: pSeller.whatsapp, location: pSeller.location,
                                profilePhoto: pSeller.profile_photo || DEFAULT_PROFILE_IMAGE,
                                isVerified: pSeller.is_verified
                            }
                        });
                    }
                } else if (deepSellerId) {
                    // Deep link to a seller profile — load and show them (not self)
                    const { data: deepSellerData } = await supabaseClient
                        .from('profiles').select('*').eq('id', deepSellerId).single();
                    if (deepSellerData) {
                        const { data: deepProducts } = await supabaseClient
                            .from('products').select('*').eq('seller_id', deepSellerId);
                        const deepIsTrusted = deepSellerData.is_free_trial && deepSellerData.free_trial_expires_at
                            ? new Date(deepSellerData.free_trial_expires_at) > new Date()
                            : deepSellerData.subscription_plan === 'growth_pro';
                        const deepFullSeller = {
                            id: deepSellerData.id, name: deepSellerData.business_name,
                            email: deepSellerData.email, category: deepSellerData.category,
                            gender: deepSellerData.gender || null,
                            location: deepSellerData.location,
                            bio: deepSellerData.bio || 'Seller on SearchPadi',
                            isVerified: deepSellerData.is_verified || false,
                            isTrusted: deepIsTrusted,
                            whatsappNumber: deepSellerData.whatsapp,
                            profilePhoto: deepSellerData.profile_photo || DEFAULT_PROFILE_IMAGE,
                            views: deepSellerData.views || 0,
                            subscription: deepSellerData.subscription_plan || 'free',
                            products: (deepProducts || []).map(p => ({
                                id: p.id, name: p.name, price: p.price || 'Ask for Price',
                                description: p.description || '',
                                images: p.images || [],
                                keywords: p.keywords || [],
                                likes: p.likes || 0, liked: false
                            }))
                        };
                        setSelectedSeller(deepFullSeller);
                    }
                } else {
                    // No deep link — open own profile as normal
                    setSelectedSeller(sellerData);
                }
            } catch(e) {
                // Auth failed — still try deep links as guest
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('seller') || urlParams.get('product')) {
                    handleDeepLinks();
                }
            }
        };

        initAuth();
    }, []);

    const handleDeepLinks = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const sellerId = urlParams.get('seller');
        const productId = urlParams.get('product');
        if (productId) {
            const { data: productData } = await supabaseClient
                .from('products').select('*, profiles(*)').eq('id', productId).single();
            if (productData) {
                const seller = productData.profiles;
                setSelectedProduct({
                    id: productData.id, name: productData.name,
                    price: productData.price || 'Ask for Price',
                    description: productData.description || '',
                    images: productData.images || [DEFAULT_PRODUCT_IMAGE],
                    keywords: productData.keywords || [],
                    likes: productData.likes || 0, liked: false,
                    seller: {
                        id: seller.id, name: seller.business_name,
                        whatsappNumber: seller.whatsapp, location: seller.location,
                        profilePhoto: seller.profile_photo || DEFAULT_PROFILE_IMAGE,
                        isVerified: seller.is_verified
                    }
                });
            }
        } else if (sellerId) {
            const { data: sellerData } = await supabaseClient
                .from('profiles').select('*').eq('id', sellerId).single();
            if (sellerData) {
                const { data: productsData } = await supabaseClient
                    .from('products').select('*').eq('seller_id', sellerId);
                const isTrusted = sellerData.is_free_trial && sellerData.free_trial_expires_at
                    ? new Date(sellerData.free_trial_expires_at) > new Date()
                    : sellerData.subscription_plan === 'growth_pro';
                const fullSeller = {
                    id: sellerData.id, name: sellerData.business_name,
                    email: sellerData.email, category: sellerData.category,
                    gender: sellerData.gender || null,
                    location: sellerData.location, bio: sellerData.bio || 'Seller on SearchPadi',
                    isVerified: sellerData.is_verified || false,
                    isTrusted,
                    whatsappNumber: sellerData.whatsapp,
                    profilePhoto: sellerData.profile_photo || DEFAULT_PROFILE_IMAGE,
                    views: sellerData.views || 0,
                    subscription: sellerData.subscription_plan || 'free',
                    products: (productsData || []).map(p => ({
                        id: p.id, name: p.name, price: p.price || 'Ask for Price',
                        description: p.description || '',
                        images: p.images || [DEFAULT_PRODUCT_IMAGE],
                        keywords: p.keywords || [],
                        likes: p.likes || 0,
                        liked: false
                    }))
                };
                // Check if this is the logged-in seller's own profile
                const { data: session } = await supabaseClient.auth.getSession();
                if (session?.session?.user?.id === sellerId) {
                    setCurrentUser({ type: 'seller', data: fullSeller });
                }
                setSelectedSeller(fullSeller);
            }
        }
    };

    const trackVisit = async () => {
        try {
            const { data: analytics } = await supabaseClient
                .from('site_analytics').select('*').eq('id', 1).single();
            if (!analytics) return;
            const today = new Date().toISOString().split('T')[0];
            const daysSincePeriodStart = Math.floor((new Date(today) - new Date(analytics.period_start)) / (1000 * 60 * 60 * 24));
            const isNewDay = analytics.last_visit_date !== today;
            const dayOfWeek = new Date().getDay();
            if (daysSincePeriodStart >= 30) {
                await supabaseClient.from('site_analytics').update({
                    period_start: today, visits_today: 1, visits_week: 1, visits_month: 1,
                    last_visit_date: today, phones_searches: 0, electronics_searches: 0,
                    shoes_searches: 0, fashion_searches: 0, furniture_searches: 0, foods_searches: 0, beauty_searches: 0, general_searches: 0,
                    updated_at: new Date().toISOString()
                }).eq('id', 1);
                return;
            }
            await supabaseClient.from('site_analytics').update({
                visits_today: isNewDay ? 1 : analytics.visits_today + 1,
                visits_week: (isNewDay && dayOfWeek === 1) ? 1 : analytics.visits_week + 1,
                visits_month: analytics.visits_month + 1,
                last_visit_date: today,
                updated_at: new Date().toISOString()
            }).eq('id', 1);
        } catch (e) { /* silently fail */ }
    };

    const loadSellersFromDatabase = async () => {
        try {
            setIsLoadingData(true);
            
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);

            // Fetch only needed columns, limit initial load for speed
            const [sellersResult, campaignsResult, productsResult] = await Promise.all([
                supabaseClient.from('profiles').select('id,business_name,email,category,gender,location,bio,profile_photo,whatsapp,is_verified,is_free_trial,free_trial_expires_at,subscription_plan,views,share_count,temp_verified_until').order('created_at', { ascending: false }).limit(20),
                supabaseClient.from('pending_payments').select('product_id,seller_id').eq('status', 'running'),
                supabaseClient.from('products').select('id,seller_id,name,price,images,keywords,likes,description').order('created_at', { ascending: false }).limit(20)
            ]);

            clearTimeout(timeout);
            if (sellersResult.error) throw sellersResult.error;
            if (productsResult.error) throw productsResult.error;

            const sellersData = sellersResult.data;
            // Put campaign products first in initial batch
            const campaignProductIds = new Set((campaignsResult.data || []).map(c => c.product_id).filter(Boolean));
            const productsData = [...(productsResult.data || [])].sort((a, b) => {
                return (campaignProductIds.has(b.id) ? 1 : 0) - (campaignProductIds.has(a.id) ? 1 : 0);
            });
            
            // Map sellers with their products
            const mappedSellers = (sellersData || []).map(seller => {
                // Check if free trial is active
                const isTrusted = seller.is_free_trial && seller.free_trial_expires_at 
                    ? new Date(seller.free_trial_expires_at) > new Date()
                    : seller.subscription_plan === 'growth_pro';
                
                return {
                    id: seller.id,
                    name: seller.business_name,
                    email: seller.email,
                    category: seller.category,
                    gender: seller.gender || null,
                    location: seller.location,
                    bio: seller.bio || "Seller on SearchPadi",
                    isVerified: seller.is_verified || false,
                    isTrusted: isTrusted,
                    isFreeTrial: seller.is_free_trial || false,
                    freeTrialExpiresAt: seller.free_trial_expires_at,
                    whatsappNumber: seller.whatsapp,
                    profilePhoto: seller.profile_photo || DEFAULT_PROFILE_IMAGE,
                    views: seller.views || 0,
                    subscription: seller.subscription_plan || 'free',
                    shareCount: seller.share_count || 0,
                    tempVerifiedUntil: seller.temp_verified_until || null,
                    products: (productsData || [])
                        .filter(p => p.seller_id === seller.id)
                        .map(product => ({
                            id: product.id,
                            name: product.name,
                            price: product.price || 'Ask for Price',
                            description: product.description || '',
                            images: product.images || [DEFAULT_PRODUCT_IMAGE],
                            keywords: product.keywords || [],
                            likes: product.likes || 0,
                            liked: (() => { try { return JSON.parse(localStorage.getItem('sp_liked_products') || '[]').includes(product.id); } catch(e) { return false; } })(),
                            isTrusted: isTrusted && product.is_trusted
                        }))
                };
            });
            
            setSellers(mappedSellers);
            console.log('✅ Loaded', mappedSellers.length, 'sellers with products');

            // Fetch logged-in seller's own products separately — never rely on 20-item global limit
            try {
                const { data: session } = await supabaseClient.auth.getSession();
                const loggedInId = session?.session?.user?.id;
                if (loggedInId) {
                    const { data: myProducts } = await supabaseClient
                        .from('products').select('*').eq('seller_id', loggedInId);
                    if (myProducts && myProducts.length > 0) {
                        const mapped = myProducts.map(p => ({
                            id: p.id, name: p.name,
                            price: p.price || 'Ask for Price',
                            description: p.description || '',
                            images: p.images || [DEFAULT_PRODUCT_IMAGE],
                            keywords: p.keywords || [],
                            likes: p.likes || 0,
                            liked: false,
                        }));
                        // Update sellers array
                        setSellers(prev => prev.map(s =>
                            s.id === loggedInId ? { ...s, products: mapped } : s
                        ));
                        // Update currentUser.data — this is the source of truth for own profile
                        setCurrentUser(prev => {
                            if (prev?.type !== 'seller' || prev.data.id !== loggedInId) return prev;
                            return { ...prev, data: { ...prev.data, products: mapped } };
                        });
                    }
                }
            } catch (e) { /* silently fail */ }

            // Always fetch logged-in seller's own products separately
            // (they may not be in the top-20 limit above)
            try {
                const { data: session } = await supabaseClient.auth.getSession();
                const loggedInId = session?.session?.user?.id;
                if (loggedInId) {
                    const { data: myProducts } = await supabaseClient
                        .from('products').select('*').eq('seller_id', loggedInId);
                    if (myProducts && myProducts.length > 0) {
                        const mapped = myProducts.map(p => ({
                            id: p.id, name: p.name,
                            price: p.price || 'Ask for Price',
                            description: p.description || '',
                            images: p.images || [DEFAULT_PRODUCT_IMAGE],
                            keywords: p.keywords || [],
                            likes: p.likes || 0,
                            liked: false,
                        }));
                        setSellers(prev => prev.map(s =>
                            s.id === loggedInId ? { ...s, products: mapped } : s
                        ));
                        setCurrentUser(prev => {
                            if (prev?.type !== 'seller' || prev.data.id !== loggedInId) return prev;
                            return { ...prev, data: { ...prev.data, products: mapped } };
                        });
                    }
                }
            } catch (e) { /* silently fail */ }

        } catch (error) {
            console.error('Error loading data from database:', error);
            setSellers([]);
        } finally {
            setIsLoadingData(false);
        }
    };

    // Shuffle array utility function
    const shuffleArray = (array) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping, showProducts, showSellers]);



    // Load initial recommended products
    useEffect(() => {
        if (currentStep === 'recommendations' && displayedProducts.length === 0 && sellers.length > 0 && !isLoadingData) {
            (async () => {
            // Get all products from all sellers - shuffle sellers first so same seller doesn't dominate
            const allProductsList = [];
            const shuffledSellers = shuffleArray([...sellers]);
            shuffledSellers.forEach(seller => {
                seller.products.forEach(product => {
                    allProductsList.push({
                        ...product,
                        seller: seller
                    });
                });
            });

            if (allProductsList.length === 0) {
                // Sellers exist but no products yet
                setMessages([
                    { 
                        id: 1, 
                        type: 'assistant', 
                        text: 'Hi! 👋 I\'m Somto, your Search Padi.\n\nOur sellers are setting up their products. Check back soon! ✨', 
                        timestamp: new Date(),
                        messageId: 1
                    }
                ]);
                setShowProducts(false);
                return;
            }

            // Fetch active campaigns and pin those products first
            const { data: activeCampaigns } = await supabaseClient
                .from('pending_payments').select('seller_id, product_id')
                .eq('status', 'running');
            const activeCampaignProductIds = new Set((activeCampaigns || []).map(c => c.product_id).filter(Boolean));
            const activeSellerIds = new Set((activeCampaigns || []).map(c => c.seller_id));

            // Featured (campaign) products first, then shuffle the rest
            const featured = allProductsList.filter(p => activeCampaignProductIds.has(p.id) || activeSellerIds.has(p.seller?.id));
            const rest = shuffleArray(allProductsList.filter(p => !activeCampaignProductIds.has(p.id) && !activeSellerIds.has(p.seller?.id)));
            const sorted = [...featured, ...rest];

            // Show first 5, store rest for load more
            setAllProducts(sorted);
            setDisplayedProducts(sorted.slice(0, PRODUCTS_PER_PAGE));
            setProductOffset(PRODUCTS_PER_PAGE);
            setShowProducts(true);
            })();
        } else if (currentStep === 'recommendations' && sellers.length === 0 && !isLoadingData) {
            // Wait a bit longer before showing empty state — sellers may still be populating
            setTimeout(() => {
                setSellers(prev => {
                    if (prev.length === 0) {
                        setMessages([
                            { 
                                id: 1, 
                                type: 'assistant', 
                                text: 'Hi! 👋 I\'m Somto, your Search Padi.\n\n🚀 Be the first! Click "Become a Seller" to start.', 
                                timestamp: new Date(),
                                messageId: 1
                            }
                        ]);
                    }
                    return prev;
                });
            }, 3000);
        }
    }, [currentStep, sellers, isLoadingData]);

    const addMessage = (text, type = 'assistant', buttons = null) => {
        const messageId = messages.length + 1;
        setMessages(prev => [...prev, {
            id: messageId,
            type,
            text,
            buttons,
            messageId,
            timestamp: new Date()
        }]);
        return messageId;
    };

    const simulateTyping = async (duration = 1200) => {
        setIsTyping(true);
        await new Promise(resolve => setTimeout(resolve, duration));
        setIsTyping(false);
    };

    const detectCategory = (query) => {
        const queryLower = query.toLowerCase();
        
        if (queryLower.match(/phone|iphone|samsung|tablet|ipad|mobile|smartphone|galaxy/)) {
            return 'phones';
        } else if (queryLower.match(/laptop|computer|macbook|gaming|ps5|electronics/)) {
            return 'electronics';
        } else if (queryLower.match(/shoe|sneaker|heel|boot|sandal|footwear/)) {
            return 'shoes';
        } else if (queryLower.match(/cloth|fashion|dress|shirt|trouser|wear/)) {
            return 'fashion';
        } else if (queryLower.match(/furniture|sofa|bed|table|chair|fridge/)) {
            return 'furniture';
        }
        
        return null;
    };

    const scoreProduct = (product, searchTerms) => {
        let score = 0;
        const productText = (product.name + ' ' + product.keywords.join(' ')).toLowerCase();
        
        searchTerms.forEach(term => {
            if (productText.includes(term)) {
                score += 1;
                if (product.name.toLowerCase().includes(term)) {
                    score += 2;
                }
            }
        });

        return score;
    };

    const getAllProducts = (category, gender = null, searchTerms = null) => {
        const allProds = [];

        sellers
            .filter(s => {
                if (s.category !== category) return false;
                if (gender && s.gender && s.gender !== 'both' && s.gender !== gender) return false;
                return true;
            })
            .forEach(seller => {
                seller.products.forEach(product => {
                    const relevanceScore = searchTerms ? scoreProduct(product, searchTerms) : 0;
                    allProds.push({
                        ...product,
                        seller: seller,
                        relevanceScore
                    });
                });
            });

        if (searchTerms) {
            const matchedProducts = allProds.filter(p => p.relevanceScore > 0);
            if (matchedProducts.length > 0) {
                return shuffleArray(matchedProducts.sort((a, b) => b.relevanceScore - a.relevanceScore));
            }
        }
        
        return shuffleArray(allProds);
    };

    const resetToInitialState = () => {
        setMessages([]);
        setCurrentStep('category');
        setSelectedCategory(null);
        setSelectedGender(null);
        setShowProducts(false);
        setShowSellers(false);
        setDisplayedProducts([]);
        setAllProducts([]);
        setProductOffset(0);
        setSellerOffset(0);
        setShowNoMoreMessage(false);
        setSelectedSeller(null);
        setSelectedProduct(null);
        setSearchContext(null);
        setClickedButtons({});
    };

    const handleSearch = async () => {
        const query = searchQuery.trim();
        if (!query) return;

        resetToInitialState();

        setMessages([{ id: 1, type: 'user', text: query, timestamp: new Date(), messageId: 1 }]);
        setSearchQuery('');
        await simulateTyping(1000);

        const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
        
        const allProductsAcrossCategories = [];
        sellers.forEach(seller => {
            seller.products.forEach(product => {
                const relevanceScore = scoreProduct(product, searchTerms);
                if (relevanceScore > 0) {
                    allProductsAcrossCategories.push({
                        ...product,
                        seller: seller,
                        relevanceScore
                    });
                }
            });
        });

        if (allProductsAcrossCategories.length > 0) {
            const sortedProducts = shuffleArray(
                allProductsAcrossCategories.sort((a, b) => b.relevanceScore - a.relevanceScore)
            );
            
            addMessage(`Here's what I found!\nDo they match what you're looking for?`, 'assistant');
            await simulateTyping(1000);
            
            setAllProducts(sortedProducts);
            setDisplayedProducts(sortedProducts.slice(0, PRODUCTS_PER_PAGE));
            setProductOffset(PRODUCTS_PER_PAGE);
            setShowProducts(true);
            setCurrentStep('products');
            setSearchContext({ query, searchTerms });
            return;
        }

        const detectedCategory = detectCategory(query);
        
        if (detectedCategory) {
            setSearchContext({ query, searchTerms });
            setSelectedCategory(detectedCategory);
            
            if (detectedCategory === 'shoes' || detectedCategory === 'fashion') {
                setCurrentStep('gender');
                addMessage(`Great! I found what you're looking for 🎯\n\nAre you shopping for:`, 'assistant', [
                    { text: '👨 Male', value: 'male' },
                    { text: '👩 Female', value: 'female' },
                    { text: '👥 Both', value: 'both' }
                ]);
            } else {
                showProductsForCategory(detectedCategory, null, searchTerms);
            }
        } else {
            addMessage(`I'd love to help you find what you're looking for! 😊\n\nCould you be more specific? For example:\n• "iPhone 13"\n• "Gaming laptop"\n• "Nike sneakers"\n\nOr choose a category to browse:`, 'assistant', [
                { text: '📱 Phones & Gadgets', value: 'phones' },
                { text: '💻 Electronics', value: 'electronics' },
                { text: '👟 Shoes & Footwear', value: 'shoes' },
                { text: '👔 Clothes & Fashion', value: 'fashion' },
                { text: '🏠 Home & Furniture', value: 'furniture' },
                { text: '🍕 Foods & Edibles', value: 'foods' },
                { text: '💄 Beauty & Personal Care', value: 'beauty' },
                { text: '🛒 General Store', value: 'general' }
            ]);
        }
    };

    const showProductsForCategory = async (category, gender = null, searchTerms = null) => {
        await simulateTyping(800);
        
        const products = getAllProducts(category, gender, searchTerms);
        const shuffledProducts = shuffleArray(products);

        if (shuffledProducts.length > 0) {
            if (searchContext) {
                addMessage(`Here's what I found!\nDo they match what you're looking for?`, 'assistant');
            } else {
                addMessage(`Here's what I found!\nDo they match what you're looking for?`, 'assistant');
            }
            await simulateTyping(1000);
            
            setAllProducts(shuffledProducts);
            setDisplayedProducts(shuffledProducts.slice(0, PRODUCTS_PER_PAGE));
            setProductOffset(PRODUCTS_PER_PAGE);
            setShowProducts(true);
            setCurrentStep('products');
        } else {
            if (searchContext) {
                addMessage(`I couldn't find products matching "${searchContext.query}". Let me show you our verified sellers who might have what you need.`, 'assistant');
            } else {
                addMessage(`No products available yet. Let me show you our verified sellers.`, 'assistant');
            }
            await simulateTyping(1000);
            setCurrentStep('sellers');
            setShowSellers(true);
            setSellerOffset(SELLERS_PER_PAGE);
        }
    };

    const trackCategorySearch = async (category) => {
        try {
            const { data: analytics } = await supabaseClient
                .from('site_analytics').select('*').eq('id', 1).single();
            if (!analytics) return;
            const field = category + '_searches';
            if (analytics[field] !== undefined) {
                await supabaseClient.from('site_analytics')
                    .update({ [field]: analytics[field] + 1, updated_at: new Date().toISOString() })
                    .eq('id', 1);
            }
        } catch (e) { /* silently fail */ }
    };

    const handleCategorySelect = async (category, displayName, messageId) => {
        setClickedButtons(prev => ({ ...prev, [messageId]: true }));
        addMessage(displayName, 'user');
        trackCategorySearch(category);
        await simulateTyping();

        setSelectedCategory(category);
        
        if (category === 'shoes' || category === 'fashion') {
            setCurrentStep('gender');
            addMessage(`Perfect choice! 😊 Are you shopping for:`, 'assistant', [
                { text: '👨 Male', value: 'male' },
                { text: '👩 Female', value: 'female' },
                { text: '👥 Both', value: 'both' }
            ]);
        } else {
            showProductsForCategory(category);
        }
    };

    const handleGenderSelect = async (gender, displayName, messageId) => {
        setClickedButtons(prev => ({ ...prev, [messageId]: true }));
        addMessage(displayName, 'user');
        
        setSelectedGender(gender);
        const searchTerms = searchContext ? searchContext.searchTerms : null;
        showProductsForCategory(selectedCategory, gender, searchTerms);
    };

    const handleProductClick = async (product) => {
        setIsLoadingProductView(true);
        
        // Simulate brief loading for better UX
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Increment view count in database
        try {
            const { error } = await supabaseClient
                .from('profiles')
                .update({ views: product.seller.views + 1 })
                .eq('id', product.seller.id);
            
            if (!error) {
                setSellers(prev => prev.map(s => 
                    s.id === product.seller.id ? { ...s, views: s.views + 1 } : s
                ));
                try {
                    fetch('https://fxjnbqymkdvuqfeagpur.supabase.co/functions/v1/send-push', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            seller_id: product.seller.id,
                            title: '👀 Someone viewed your product!',
                            body: `Your listing "${product.name}" just got a view!`
                        })
                    });
                } catch(e) {}
            }
        } catch (error) {
            console.error('Error incrementing views:', error);
        }
        
        setSelectedProduct({ ...product, seller: product.seller });
        setIsLoadingProductView(false);
    };

    const handleFindMoreProducts = async () => {
        await simulateTyping(300);

        const { data: nextData, error } = await supabaseClient
            .from('products')
            .select('id,seller_id,name,price,images,keywords,likes,description')
            .order('created_at', { ascending: false })
            .range(productOffset, productOffset + DB_BATCH_SIZE - 1);

        if (error || !nextData || nextData.length === 0) {
            addMessage("No more products available. Let me show you our verified sellers for more options 🔍", 'assistant');
            await simulateTyping(800);
            setShowProducts(false);
            setShowSellers(true);
            setCurrentStep('sellers');
            setSellerOffset(SELLERS_PER_PAGE);
        } else {
            const mapped = nextData.map(product => {
                const seller = sellers.find(s => s.id === product.seller_id);
                if (!seller) return null;
                return {
                    id: product.id,
                    name: product.name,
                    price: product.price || 'Ask for Price',
                    description: product.description || '',
                    images: product.images || [],
                    keywords: product.keywords || [],
                    likes: product.likes || 0,
                    liked: false,
                    seller: {
                        id: seller.id,
                        name: seller.name,
                        whatsappNumber: seller.whatsappNumber,
                        location: seller.location,
                        profilePhoto: seller.profilePhoto,
                        isVerified: seller.isVerified,
                        isTrusted: seller.isTrusted,
                    }
                };
            }).filter(Boolean);

            if (mapped.length === 0) {
                addMessage("No more products available. Let me show you our verified sellers for more options 🔍", 'assistant');
                await simulateTyping(800);
                setShowProducts(false);
                setShowSellers(true);
                setCurrentStep('sellers');
                setSellerOffset(SELLERS_PER_PAGE);
            } else {
                setDisplayedProducts(prev => [...prev, ...mapped]);
                setProductOffset(prev => prev + DB_BATCH_SIZE);
            }
        }
    };


    const handleFindMoreSellers = async () => {
        await simulateTyping(500);

        // First check sellers already in memory for this category
        const categorySellers = sellers.filter(s => {
            if (s.category !== selectedCategory) return false;
            if (selectedGender && s.gender && s.gender !== 'both' && s.gender !== selectedGender) return false;
            return true;
        });

        if (sellerOffset < categorySellers.length) {
            // Still have sellers in memory to show
            setSellerOffset(prev => Math.min(prev + SELLERS_PER_PAGE, categorySellers.length));
        } else {
            // Fetch more sellers from Supabase
            let query = supabaseClient
                .from('profiles')
                .select('id,business_name,email,category,gender,location,bio,profile_photo,whatsapp,is_verified,is_free_trial,free_trial_expires_at,subscription_plan,views,share_count,temp_verified_until')
                .order('created_at', { ascending: false })
                .range(sellers.length, sellers.length + SELLERS_PER_PAGE - 1);

            if (selectedCategory) query = query.eq('category', selectedCategory);

            const { data: moreSellers } = await query;

            if (!moreSellers || moreSellers.length === 0) {
                setShowNoMoreMessage(true);
                addMessage("These are all the verified sellers we have in this category right now. Try 'Start Afresh' to explore a different category!", 'assistant');
            } else {
                const mapped = moreSellers.map(seller => {
                    const isTrusted = seller.is_free_trial && seller.free_trial_expires_at
                        ? new Date(seller.free_trial_expires_at) > new Date()
                        : seller.subscription_plan === 'growth_pro';
                    return {
                        id: seller.id,
                        name: seller.business_name,
                        email: seller.email,
                        category: seller.category,
                        gender: seller.gender || null,
                        location: seller.location,
                        bio: seller.bio || 'Seller on SearchPadi',
                        isVerified: seller.is_verified || false,
                        isTrusted,
                        isFreeTrial: seller.is_free_trial || false,
                        freeTrialExpiresAt: seller.free_trial_expires_at,
                        whatsappNumber: seller.whatsapp,
                        profilePhoto: seller.profile_photo,
                        views: seller.views || 0,
                        subscription: seller.subscription_plan || 'free',
                        shareCount: seller.share_count || 0,
                        tempVerifiedUntil: seller.temp_verified_until || null,
                        products: []
                    };
                });
                setSellers(prev => [...prev, ...mapped]);
                setSellerOffset(prev => prev + mapped.length);
            }
        }
    };

    const handleStartAfresh = () => {
        setMessages([
            { 
                id: 1, 
                type: 'assistant', 
                text: 'Hi! 👋 I\'m Somto, your Search Padi.\n\nYou might like these handpicked items just for you! ✨', 
                timestamp: new Date(),
                messageId: 1
            }
        ]);
        setCurrentStep('recommendations');
        setSelectedCategory(null);
        setSelectedGender(null);
        setShowProducts(false);
        setShowSellers(false);
        setDisplayedProducts([]);
        setAllProducts([]);
        setProductOffset(0);
        setSellerOffset(0);
        setShowNoMoreMessage(false);
        setSelectedSeller(null);
        setSearchQuery('');
        setSearchContext(null);
        setClickedButtons({});
    };

    const handleSellerClick = (seller) => {
        setSelectedSeller(seller);
    };

    const [whatsappModal, setWhatsappModal] = useState(null); // { seller, product }
    
    const handleWhatsAppMessage = (seller, product = null) => {
        setWhatsappModal({ seller, product });
    };

    const toggleProductLike = async (sellerId, productId) => {
        // Read current state directly from sellers ref to avoid stale closure
        const currentSellers = sellers;
        const seller = currentSellers.find(s => s.id === sellerId);
        const product = seller?.products.find(p => p.id === productId);
        if (!product) return;

        const newLiked = !product.liked;
        const newLikes = newLiked ? product.likes + 1 : Math.max(0, product.likes - 1);

        // Persist liked state to localStorage so it survives page reload
        try {
            const stored = JSON.parse(localStorage.getItem('sp_liked_products') || '[]');
            const updated = newLiked
                ? [...new Set([...stored, productId])]
                : stored.filter(id => id !== productId);
            localStorage.setItem('sp_liked_products', JSON.stringify(updated));
        } catch (e) {}

        // Update all state synchronously before any async call
        setSellers(prev => prev.map(s => {
            if (s.id !== sellerId) return s;
            return {
                ...s,
                products: s.products.map(p =>
                    p.id === productId ? { ...p, liked: newLiked, likes: newLikes } : p
                )
            };
        }));

        setDisplayedProducts(prev => prev.map(p =>
            (p.seller.id === sellerId && p.id === productId)
                ? { ...p, liked: newLiked, likes: newLikes }
                : p
        ));

        setSelectedProduct(prev =>
            (prev && prev.id === productId)
                ? { ...prev, liked: newLiked, likes: newLikes }
                : prev
        );

        // Save to Supabase silently - no revert on failure so UI stays correct
        supabaseClient
            .from('products')
            .update({ likes: newLikes })
            .eq('id', productId)
            .then(({ error }) => {
                if (error) console.error('Likes save error:', error);
            });
    };

    const openSellerProfile = (seller) => {
        setSelectedProduct(null);
        handleSellerClick(seller);
    };

    const handleRegistration = async (formData) => {
        console.log('🚀 Starting registration...', formData);
        setIsRegistering(true);
        try {
            const formattedPhone = formatPhoneNumber(formData.whatsappNumber);
            
            const { data: authData, error: authError } = await supabaseClient.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        phone: formattedPhone,
                        business_name: formData.businessName
                    }
                }
            });
            
            if (authError) throw authError;
            if (!authData.user) throw new Error('User creation failed');
            
            // Check free verified count from app_settings
            const { data: appSettings } = await supabaseClient
                .from('app_settings')
                .select('free_verified_count')
                .eq('id', 1)
                .single();
            
            const freeCount = appSettings?.free_verified_count || 0;
            const isFreeVerified = freeCount < 5;
            
            // If free verified, increment the count
            if (isFreeVerified) {
                await supabaseClient
                    .from('app_settings')
                    .update({ free_verified_count: freeCount + 1 })
                    .eq('id', 1);
            }
            
            // All sellers list immediately — show Unverified badge instead of blocking with pending wall
            const accountStatus = 'approved';
            
            const profileData = {
                id: authData.user.id,
                business_name: formData.businessName,
                email: formData.email,
                category: formData.category,
                gender: formData.gender || null,
                location: formData.location,
                phone: formattedPhone,
                whatsapp: formattedPhone,
                bio: formData.bio || "New seller on SearchPadi",
                profile_photo: formData.profilePhoto || DEFAULT_PROFILE_IMAGE,
                selfie_photo: formData.selfiePhoto || null,
                verification_video: isFreeVerified ? null : (formData.verificationVideo || null),
                subscription_plan: 'free',
                is_verified: false,
                is_free_verified: isFreeVerified,
                account_status: accountStatus,
                views: 0,
                created_at: new Date().toISOString()
            };
            
            const { data: insertData, error: profileError } = await supabaseClient
                .from('profiles')
                .insert([profileData])
                .select();
            
            if (profileError) throw new Error(`Database error: ${profileError.message}`);
            
            const newSeller = {
                id: authData.user.id,
                name: formData.businessName,
                email: formData.email,
                category: formData.category,
                gender: formData.gender || null,
                location: formData.location,
                bio: formData.bio || "New seller on SearchPadi",
                isVerified: false,
                isTrusted: false,
                isFreeVerified: isFreeVerified,
                accountStatus: accountStatus,
                whatsappNumber: formattedPhone,
                profilePhoto: formData.profilePhoto || DEFAULT_PROFILE_IMAGE,
                views: 0,
                products: [],
                subscription: 'free'
            };
            
            // All sellers list immediately
            setSellers(prev => [...prev, newSeller]);
            
            setCurrentUser({ type: 'seller', data: newSeller });
            setShowRegistration(false);
            setSelectedSeller(newSeller); // take seller straight to their profile
            
        } catch (error) {
            console.error('❌ Registration error:', error);
            let errorMessage = '';
            if (error.message.includes('already registered') || error.message.includes('User already registered')) {
                errorMessage = 'This email is already registered. Please login instead.';
            } else if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
                errorMessage = 'This email or phone number is already in use.';
            } else {
                errorMessage = error.message || 'Registration failed. Please try again.';
            }
            alert('❌ ' + errorMessage);
            throw error;
        } finally {
            setIsRegistering(false);
        }
    };

    const handleAddProduct = async (productData) => {
        setIsUploadingProduct(true);
        try {
            // Check if seller has free trial or Growth Pro subscription
            const { data: sellerProfile } = await supabaseClient
                .from('profiles')
                .select('is_free_trial, free_trial_expires_at, subscription_plan')
                .eq('id', currentUser.data.id)
                .single();
            
            // Determine if product should have trusted badge
            let isTrusted = false;
            if (sellerProfile) {
                // Check if free trial is active
                if (sellerProfile.is_free_trial && sellerProfile.free_trial_expires_at) {
                    const expiryDate = new Date(sellerProfile.free_trial_expires_at);
                    const now = new Date();
                    if (expiryDate > now) {
                        isTrusted = true;
                    }
                }
                // Check if Growth Pro subscription
                if (sellerProfile.subscription_plan === 'growth_pro') {
                    isTrusted = true;
                }
            }
            
            const newProductData = {
                seller_id: currentUser.data.id,
                name: productData.name,
                description: productData.description || '',
                price: 'Ask for Price',
                images: productData.images,
                keywords: productData.name.toLowerCase().split(' ').filter(w => w.length > 2),
                likes: 0,
                is_trusted: isTrusted,
                created_at: new Date().toISOString()
            };
            
            const { data: insertedProduct, error } = await supabaseClient
                .from('products')
                .insert([newProductData])
                .select()
                .single();
            
            if (error) throw error;
            
            const newProduct = {
                id: insertedProduct.id,
                name: insertedProduct.name,
                description: insertedProduct.description,
                price: insertedProduct.price,
                images: insertedProduct.images,
                keywords: insertedProduct.keywords,
                likes: insertedProduct.likes,
                liked: false,
                isTrusted: insertedProduct.is_trusted
            };

            setSellers(prev => prev.map(s => {
                if (s.id === currentUser.data.id) {
                    return {
                        ...s,
                        products: [...s.products, newProduct]
                    };
                }
                return s;
            }));

            setCurrentUser(prev => ({
                ...prev,
                data: {
                    ...prev.data,
                    products: [...prev.data.products, newProduct]
                }
            }));

            setShowAddProduct(false);
            alert('✅ Product added successfully!');
        } catch (error) {
            console.error('Error adding product:', error);
            alert('❌ Failed to add product. Please try again.');
        } finally {
            setIsUploadingProduct(false);
        }
    };

    const handleCopyProfileLink = async (sellerId) => {
        const id = sellerId || currentUser?.data?.id;
        if (!id) return;
        const fullUrl = `https://searchpadi-phi.vercel.app/seller.html?id=${id}`;
        const url = await shortenLink(fullUrl);
        try {
            if (navigator.share) {
                await navigator.share({ title: 'SearchPadi Seller', text: 'Check out this seller on SearchPadi!', url });
            } else {
                try { await navigator.clipboard.writeText(url); alert('Profile link copied!'); }
                catch(e) { prompt('Copy this link:', url); }
            }
        } catch(e) {
            prompt('Copy this link:', url);
        }
    };

    const handleCopyProductLink = async (productId) => {
        const fullUrl = `https://searchpadi-phi.vercel.app/product.html?id=${productId}`;
        const url = await shortenLink(fullUrl);
        try {
            if (navigator.share) {
                await navigator.share({ title: 'SearchPadi Product', text: 'Check out this product on SearchPadi!', url });
            } else {
                try { await navigator.clipboard.writeText(url); alert('Product link copied!'); }
                catch(e) { prompt('Copy this link:', url); }
            }
        } catch(e) {
            prompt('Copy this link:', url);
        }
    };

    const handleShare = async () => {
        if (!currentUser?.data) return;
        const seller = currentUser.data;
        const sellerId = seller.id;
        const fullUrl = `https://searchpadi-phi.vercel.app/seller.html?id=${sellerId}`;
        const profileUrl = await shortenLink(fullUrl);
        const appUrl = 'https://searchpadi-phi.vercel.app';
        const shareMsg = `Hi! 👋 Check out ${seller.name || 'my store'} on SearchPadi!\n\n🛍️ Browse my products:\n${profileUrl}\n\nSearchPadi's AI Somto will help find exactly what you need!`;

        try {
            const currentCount = seller.shareCount || 0;
            const newCount = currentCount + 1;
            const currentExpiry = seller.tempVerifiedUntil && new Date(seller.tempVerifiedUntil) > new Date()
                ? new Date(seller.tempVerifiedUntil)
                : new Date();
            currentExpiry.setDate(currentExpiry.getDate() + 1);

            await supabaseClient.from('profiles').update({
                share_count: newCount,
                temp_verified_until: currentExpiry.toISOString(),
                is_verified: true,
                updated_at: new Date().toISOString()
            }).eq('id', sellerId);

            setCurrentUser(prev => ({
                ...prev,
                data: {
                    ...prev.data,
                    shareCount: newCount,
                    tempVerifiedUntil: currentExpiry.toISOString(),
                    isVerified: true,
                }
            }));

            setSellers(prev => prev.map(s => s.id === sellerId ? {
                ...s,
                shareCount: newCount,
                tempVerifiedUntil: currentExpiry.toISOString(),
                isVerified: true,
            } : s));
        } catch (e) {
            console.error('Share error:', e);
        }

        window.open('https://wa.me/?text=' + encodeURIComponent(shareMsg), '_blank');
    };

    const handleEditProfile = async (formData) => {
        const sellerId = currentUser.data.id;
        const updatedFields = {
            business_name: formData.businessName,
            bio: formData.bio,
            location: formData.location,
            whatsapp: formData.whatsappNumber,
            phone: formData.whatsappNumber,
            category: formData.category,
            gender: formData.gender || null,
            profile_photo: formData.profilePhoto,
        };

        const { error } = await supabaseClient
            .from('profiles')
            .update(updatedFields)
            .eq('id', sellerId);

        if (error) throw new Error(error.message);

        setSellers(prev => prev.map(s => {
            if (s.id === sellerId) {
                return {
                    ...s,
                    name: formData.businessName,
                    bio: formData.bio,
                    location: formData.location,
                    whatsappNumber: formData.whatsappNumber,
                    category: formData.category,
                    gender: formData.gender || null,
                    profilePhoto: formData.profilePhoto,
                };
            }
            return s;
        }));

        setCurrentUser(prev => ({
            ...prev,
            data: {
                ...prev.data,
                name: formData.businessName,
                bio: formData.bio,
                location: formData.location,
                whatsappNumber: formData.whatsappNumber,
                category: formData.category,
                gender: formData.gender || null,
                profilePhoto: formData.profilePhoto,
            }
        }));
    };

    const handleDeleteProduct = async (productId) => {
        if (!confirm('Are you sure you want to delete this product?')) return;

        try {
            const { error } = await supabaseClient
                .from('products')
                .delete()
                .eq('id', productId);
            
            if (error) throw error;
            
            setSellers(prev => prev.map(s => {
                if (s.id === currentUser.data.id) {
                    return {
                        ...s,
                        products: s.products.filter(p => p.id !== productId)
                    };
                }
                return s;
            }));

            setCurrentUser(prev => ({
                ...prev,
                data: {
                    ...prev.data,
                    products: prev.data.products.filter(p => p.id !== productId)
                }
            }));
            
            alert('✅ Product deleted successfully!');
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('❌ Failed to delete product. Please try again.');
        }
    };

    const filteredSellers = selectedCategory && showSellers 
        ? sellers.filter(s => {
            if (s.category !== selectedCategory) return false;
            if (selectedGender && s.gender && s.gender !== 'both' && s.gender !== selectedGender) return false;
            return true;
        }).slice(0, sellerOffset)
        : [];

    // For own profile, always use currentUser.data so products/stats are never overwritten by sellers array
    const currentSeller = selectedSeller
        ? (currentUser?.type === 'seller' && currentUser.data.id === selectedSeller.id
            ? { ...currentUser.data, ...sellers.find(s => s.id === selectedSeller.id), products: currentUser.data.products?.length ? currentUser.data.products : (sellers.find(s => s.id === selectedSeller.id)?.products || []) }
            : sellers.find(s => s.id === selectedSeller.id) || selectedSeller)
        : null;
    // Show bubble message on login and every 20 minutes
    // Hidden for 7 days after a campaign runs
    useEffect(() => {
        if (currentUser?.type !== 'seller' || !currentUser?.data?.id) return;

        const checkAndShow = async () => {
            try {
                // Check if seller has a campaign in last 7 days
                const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
                const { data: recentCampaigns } = await supabaseClient
                    .from('pending_payments')
                    .select('id')
                    .eq('seller_id', currentUser.data.id)
                    .in('status', ['pending', 'running', 'approved'])
                    .gte('created_at', sevenDaysAgo)
                    .limit(1);
                if (recentCampaigns?.length > 0) return; // suppress for 7 days
            } catch (e) {}
            setShowBubbleMessage(true);
            setTimeout(() => setShowBubbleMessage(false), 30000);
        };

        checkAndShow();
        const interval = setInterval(checkAndShow, 20 * 60 * 1000);
        return () => clearInterval(interval);
    }, [currentUser?.data?.id]);

    // Check free slots for header badge
    useEffect(() => {
        if (currentUser?.type !== 'seller') return;
        const checkSlots = async () => {
            try {
                const now = new Date();
                const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                const { data } = await supabaseClient
                    .from('free_campaign_slots')
                    .select('seller_id')
                    .eq('month_year', monthYear);
                const taken = data?.length || 0;
                const remaining = 3 - taken;
                const alreadyClaimed = data?.some(s => s.seller_id === currentUser.data.id) || false;
                setHeaderFreeSlots(remaining > 0 && !alreadyClaimed ? remaining : 0);
            } catch (e) { setHeaderFreeSlots(0); }
        };
        checkSlots();
    }, [currentUser?.type]);

    const updatedCurrentUser = currentUser?.type === 'seller' 
        ? (sellers.find(s => s.id === currentUser.data.id) || currentUser.data)
        : null;

    if (showSplash) {
        return (
            <div className="chat-container" style={{background: 'linear-gradient(160deg, #3b0764 0%, #4c1d95 40%, #2e1065 100%)'}}>
                <div className="flex items-center justify-center h-full">
                    <div className="text-center px-6">
                        <div className="mb-8">
                            <div className="w-28 h-28 mx-auto mb-6">
                                <img
                                    src="https://i.postimg.cc/vBGbJsLw/grok-1771024869365-Photoroom-(1).png"
                                    alt="SearchPadi Logo"
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <h1 className="text-4xl font-bold text-white mb-3">SearchPadi</h1>
                            <p className="text-purple-300 text-base">Your Search Padi for Trusted Sellers</p>
                        </div>
                        <div style={{display:'flex', justifyContent:'center', marginBottom:'24px'}}>
                            <div style={{width:'56px',height:'56px',border:'4px solid rgba(124,58,237,0.3)',borderTop:'4px solid #7c3aed',borderRadius:'50%',animation:'spin 0.9s linear infinite'}}></div>
                        </div>
                        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                        <p style={{color:'#ddd6fe',fontSize:'14px'}}>Loading verified sellers...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-container">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-4 shadow-lg">
                <div className="flex items-center justify-between">
                    {currentUser?.type === 'seller' ? (
                        // Left side — glowing avatar + name
                        <div className="flex items-center gap-3">
                            <div
                                onClick={() => setSelectedSeller(updatedCurrentUser)}
                                style={{
                                    position: 'relative',
                                    width: '44px',
                                    height: '44px',
                                    cursor: 'pointer',
                                    flexShrink: 0
                                }}
                            >
                                <div style={{
                                    position: 'absolute',
                                    inset: '-3px',
                                    borderRadius: '50%',
                                    background: 'conic-gradient(#fff 0deg, #a78bfa 120deg, transparent 180deg, #fff 360deg)',
                                    animation: 'spin-ring 1.8s linear infinite',
                                    boxShadow: '0 0 10px rgba(255,255,255,0.5)'
                                }} />
                                <div style={{
                                    position: 'absolute',
                                    inset: '-3px',
                                    borderRadius: '50%',
                                    background: 'transparent',
                                    boxShadow: '0 0 14px 4px rgba(255,255,255,0.2)',
                                    animation: 'glow-pulse 2s ease-in-out infinite'
                                }} />
                                <img
                                    src={updatedCurrentUser?.profilePhoto}
                                    alt={updatedCurrentUser?.name}
                                    style={{
                                        position: 'absolute',
                                        inset: '2px',
                                        width: 'calc(100% - 4px)',
                                        height: 'calc(100% - 4px)',
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        border: '2px solid rgba(255,255,255,0.3)'
                                    }}
                                />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold">{updatedCurrentUser?.name}</h1>
                                <p className="text-xs opacity-90">📍 {updatedCurrentUser?.location}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="cursor-default select-none">
                            <h1 className="text-xl font-bold">SearchPadi</h1>
                            <p className="text-sm opacity-90">Find Verified Sellers 🇳🇬</p>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        {currentUser?.type === 'seller' ? (
                            <button
                                onClick={() => setShowSomtoPromote(true)}
                                className="bg-yellow-400 text-purple-900 px-3 py-2 rounded-lg text-sm font-bold hover:bg-yellow-300 transition-colors whitespace-nowrap flex items-center gap-1"
                                style={{ position: 'relative' }}
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                                Get Customers
                                {headerFreeSlots > 0 && (
                                    <span style={{
                                        position: 'absolute',
                                        top: '-8px',
                                        right: '-8px',
                                        background: '#16a34a',
                                        color: '#fff',
                                        fontSize: '9px',
                                        fontWeight: 900,
                                        padding: '2px 5px',
                                        borderRadius: '10px',
                                        letterSpacing: '0.03em',
                                        border: '1.5px solid #fbbf24',
                                        animation: 'bubble-pulse 2s ease-in-out infinite'
                                    }}>FREE</span>
                                )}
                            </button>
                        ) : (
                            <a
                                href="/signup.html"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-white text-purple-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-50 transition-colors whitespace-nowrap inline-block"
                            >
                                Become a Seller
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">

                {isLoadingData && (
                    <div style={{animation:'pulse 1.5s ease-in-out infinite'}} className="space-y-4">
                        {/* Avatar chat bubble skeleton */}
                        <div className="flex gap-2">
                            <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'#374151',flexShrink:0}}></div>
                            <div className="flex-1">
                                <div style={{background:'#1f2937',borderRadius:'0 16px 16px 16px',padding:'12px',display:'inline-block',maxWidth:'85%'}}>
                                    <div style={{height:'10px',background:'#4b5563',borderRadius:'4px',marginBottom:'8px',width:'180px'}}></div>
                                    <div style={{height:'10px',background:'#4b5563',borderRadius:'4px',width:'140px'}}></div>
                                </div>
                                {/* Pill button skeletons */}
                                <div style={{display:'flex',gap:'8px',marginTop:'12px',flexWrap:'wrap'}}>
                                    {[1,2,3].map(i => (
                                        <div key={i} style={{height:'36px',width:'90px',background:'#374151',borderRadius:'999px'}}></div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 2-column product grid skeleton */}
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                            {[1,2,3,4].map(i => (
                                <div key={i} style={{background:'#1f2937',borderRadius:'12px',overflow:'hidden',border:'1px solid #374151'}}>
                                    <div style={{height:'130px',background:'#374151'}}></div>
                                    <div style={{padding:'10px'}}>
                                        <div style={{height:'10px',background:'#4b5563',borderRadius:'4px',marginBottom:'6px'}}></div>
                                        <div style={{height:'10px',background:'#4b5563',borderRadius:'4px',width:'60%',marginBottom:'10px'}}></div>
                                        <div style={{height:'32px',background:'#374151',borderRadius:'6px'}}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
                    </div>
                )}

                {!isLoadingData && messages.map((message) => (
                    <div key={message.id} className="message-enter relative z-10">
                        {message.type === 'assistant' ? (
                            <div className="flex gap-2">
                                <img 
                                    src="https://i.postimg.cc/KcrmDRbc/grok-1771024499914.jpg"
                                    alt="SearchPadi Assistant"
                                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                />
                                <div className="flex-1">
                                    <div className="bg-[#2a2a2a] rounded-2xl rounded-tl-none p-3 max-w-[85%] inline-block shadow-sm">
                                        <p className="text-white whitespace-pre-line">{message.text}</p>
                                    </div>
                                    {message.buttons && !clickedButtons[message.messageId] && (
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {message.buttons.map((button, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        if (currentStep === 'category') {
                                                            handleCategorySelect(button.value, button.text, message.messageId);
                                                        } else if (currentStep === 'gender') {
                                                            handleGenderSelect(button.value, button.text, message.messageId);
                                                        }
                                                    }}
                                                    className="bg-purple-600 text-white px-5 py-2.5 rounded-full font-medium hover:bg-purple-700 transition-all duration-200 shadow-md hover:shadow-lg text-sm"
                                                >
                                                    {button.text}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-end">
                                <div className="bg-purple-600 text-white rounded-2xl rounded-tr-none p-3 max-w-[85%] shadow-sm">
                                    <p>{message.text}</p>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {isTyping && (
                    <div className="flex gap-2 relative z-10">
                        <img 
                            src="https://i.postimg.cc/KcrmDRbc/grok-1771024499914.jpg"
                            alt="SearchPadi Assistant"
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="typing-indicator">
                            <div className="typing-dot"></div>
                            <div className="typing-dot"></div>
                            <div className="typing-dot"></div>
                        </div>
                    </div>
                )}

                {showProducts && displayedProducts.length > 0 && (
                    <div className="space-y-3 mt-4 relative z-10">
                        <div className="grid grid-cols-2 gap-3">
                            {displayedProducts.map((product, idx) => (
                                <div 
                                    key={idx}
                                    className="product-card bg-[#2a2a2a] rounded-xl shadow-md overflow-hidden border border-gray-700 relative"
                                    onClick={() => handleProductClick(product)}
                                >
                                    <img 
                                        src={product.images[0]}
                                        alt={product.name}
                                        className="w-full h-32 object-cover"
                                        loading="lazy"
                                    />
                                    <div className="p-3">
                                        {product.isTrusted && (
                                            <div className="mb-2">
                                                <div className="inline-flex bg-gradient-to-r from-green-500 to-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg items-center gap-1">
                                                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                                                    </svg>
                                                    Trusted
                                                </div>
                                            </div>
                                        )}
                                        <p className="text-sm font-bold text-white line-clamp-2 mb-1">{product.name}</p>
                                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                                            <img 
                                                src={product.seller.profilePhoto} 
                                                alt={product.seller.name}
                                                className="w-4 h-4 rounded-full"
                                            />
                                            <span className="truncate">{product.seller.name}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {currentStep === 'recommendations' ? (
                            <div className="pt-2">
                                <button
                                    onClick={() => {
                                        setShowProducts(false);
                                        setDisplayedProducts([]);
                                        setCurrentStep('category');
                                        setMessages([
                                            { 
                                                id: 1, 
                                                type: 'assistant', 
                                                text: 'So, what are you looking for today?', 
                                                timestamp: new Date(),
                                                buttons: [
                                                    { text: '📱 Phones & Gadgets', value: 'phones' },
                                                    { text: '💻 Electronics', value: 'electronics' },
                                                    { text: '👟 Shoes & Footwear', value: 'shoes' },
                                                    { text: '👔 Clothes & Fashion', value: 'fashion' },
                                                    { text: '🏠 Home & Furniture', value: 'furniture' },
                                                    { text: '🍕 Foods & Edibles', value: 'foods' },
                                                    { text: '💄 Beauty & Personal Care', value: 'beauty' },
                                                    { text: '🛒 General Store', value: 'general' }
                                                ],
                                                messageId: 1
                                            }
                                        ]);
                                    }}
                                    className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-colors"
                                >
                                    No, Thanks
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handleFindMoreProducts}
                                    className="flex-1 bg-[#2a2a2a] border-2 border-purple-600 text-purple-400 py-2.5 rounded-lg font-medium hover:bg-[#333333] transition-colors"
                                >
                                    Find More
                                </button>
                                <button
                                    onClick={handleStartAfresh}
                                    className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white py-2.5 rounded-lg font-medium hover:from-purple-700 hover:to-purple-800 transition-all shadow-md"
                                >
                                    Start Afresh
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {showSellers && filteredSellers.length > 0 && (
                    <div className="space-y-3 mt-4 relative z-10">
                        {filteredSellers.map(seller => (
                            <div 
                                key={seller.id} 
                                className="seller-card bg-[#2a2a2a] rounded-xl shadow-md overflow-hidden border border-gray-700"
                                onClick={() => handleSellerClick(seller)}
                            >
                                <div className="p-4">
                                    <div className="flex items-start gap-3">
                                        <img 
                                            src={seller.profilePhoto} 
                                            alt={seller.name}
                                            className="w-16 h-16 rounded-full object-cover border-2 border-purple-600"
                                            loading="lazy"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-white truncate">{seller.name}</h3>
                                                {seller.isVerified && (
                                                    <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                                                    </svg>
                                                )}
                                                {!seller.isVerified && (
                                                    <span className="text-xs bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded font-medium flex-shrink-0">Unverified</span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-400 mt-1 line-clamp-2">{seller.bio}</p>
                                            <p className="text-xs text-gray-500 mt-1">📍 {seller.location}</p>
                                        </div>
                                    </div>
                                    <button className="w-full mt-3 bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors">
                                        View Profile
                                    </button>
                                </div>
                            </div>
                        ))}
                        
                        <div className={`flex gap-3 pt-2 pb-4 ${showNoMoreMessage ? 'justify-center' : ''}`}>
                            {!showNoMoreMessage ? (
                                <>
                                    <button
                                        onClick={handleFindMoreSellers}
                                        className="flex-1 bg-[#2a2a2a] border-2 border-purple-600 text-purple-400 py-2.5 rounded-lg font-medium hover:bg-[#333333] transition-colors"
                                    >
                                        Find More
                                    </button>
                                    <button
                                        onClick={handleStartAfresh}
                                        className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white py-2.5 rounded-lg font-medium hover:from-purple-700 hover:to-purple-800 transition-all shadow-md"
                                    >
                                        Start Afresh
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={handleStartAfresh}
                                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-2.5 rounded-lg font-medium hover:from-purple-700 hover:to-purple-800 transition-all shadow-md"
                                >
                                    Start Afresh
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Search Input */}
            <div className="bg-[#1a1a1a] border-t border-gray-800 p-3 fixed bottom-0 left-0 right-0 max-w-[500px] mx-auto z-20">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="What are you looking for?"
                        className="flex-1 bg-[#2a2a2a] rounded-full px-5 py-3 text-white placeholder-gray-500 focus:outline-none focus:bg-[#333333] text-sm border-0 glowing-search-input"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={!searchQuery.trim()}
                        className="bg-purple-600 text-white p-3 rounded-full hover:bg-purple-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex-shrink-0"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                        </svg>
                    </button>
                </div>
            </div>

            {/* Seller Profile View */}
            {currentSeller && (
                <SellerProfile 
                    seller={currentSeller}
                    isOwnProfile={currentUser?.type === 'seller' && currentUser.data.id === currentSeller.id}
                    onClose={() => setSelectedSeller(null)}
                    onWhatsApp={handleWhatsAppMessage}
                    onShowSubscription={() => setShowSomtoPromote(true)}
                    onAddProduct={() => setShowAddProduct(true)}
                    onProductClick={(product) => setSelectedProduct({ ...product, seller: currentSeller })}
                    onDeleteProduct={handleDeleteProduct}
                    onEditProfile={() => setShowEditProfile(true)}
                    onShare={handleShare}
                    onCopyProfileLink={handleCopyProfileLink}
                    onCopyProductLink={handleCopyProductLink}
                    onAttractCustomers={() => setShowAttractCustomers(true)}
                />
            )}

            {/* Product Detail View */}
            {/* Loading overlay for product view */}
            {isLoadingProductView && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
                    <div className="bg-[#2a2a2a] rounded-2xl p-6 flex flex-col items-center gap-3">
                        <svg className="animate-spin h-10 w-10 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-white font-medium">Loading product...</p>
                    </div>
                </div>
            )}

            {selectedProduct && (() => {
                const liveSeller = sellers.find(s => s.id === selectedProduct.seller.id);
                const liveProduct = liveSeller?.products.find(p => p.id === selectedProduct.id);
                const derivedProduct = liveProduct ? { ...liveProduct, seller: liveSeller } : selectedProduct;
                return (
                    <ProductDetail 
                        product={derivedProduct}
                        onClose={() => setSelectedProduct(null)}
                        onSellerClick={openSellerProfile}
                        onWhatsApp={handleWhatsAppMessage}
                        onToggleLike={toggleProductLike}
                    />
                );
            })()}

            {/* Somto Floating Bubble - shows for all sellers */}
            {currentUser?.type === 'seller' && (() => {
                const seller = currentUser.data;
                const photo = seller.profilePhoto || seller.profile_photo || DEFAULT_PROFILE_IMAGE;

                const handleBubbleTouchStart = (e) => {
                    const touch = e.touches[0];
                    bubbleDragRef.current = true;
                    bubbleMoveRef.current = false;
                    setDragOffset({
                        x: touch.clientX - bubblePos.x,
                        y: touch.clientY - bubblePos.y
                    });
                };

                const handleBubbleTouchMove = (e) => {
                    if (!bubbleDragRef.current) return;
                    bubbleMoveRef.current = true;
                    const touch = e.touches[0];
                    const newX = Math.min(Math.max(0, touch.clientX - dragOffset.x), window.innerWidth - 64);
                    const newY = Math.min(Math.max(0, touch.clientY - dragOffset.y), window.innerHeight - 64);
                    setBubblePos({ x: newX, y: newY });
                };

                const handleBubbleTouchEnd = () => {
                    bubbleDragRef.current = false;
                    if (!bubbleMoveRef.current) {
                        setShowSomtoPromote(true);
                    }
                };

                const handleBubbleClick = () => {
                    if (!bubbleMoveRef.current) {
                        setShowSomtoPromote(true);
                    }
                };

                return (
                    <>
                    {/* Blur backdrop */}
                    {showBubbleMessage && (
                        <div
                            onClick={() => setShowBubbleMessage(false)}
                            style={{
                                position: 'fixed', inset: 0, zIndex: 998,
                                backdropFilter: 'blur(6px)',
                                WebkitBackdropFilter: 'blur(6px)',
                                background: 'rgba(0,0,0,0.45)',
                                transition: 'opacity 0.3s ease'
                            }}
                        />
                    )}
                    <div style={{ position: 'fixed', left: bubblePos.x, top: bubblePos.y, zIndex: 999, touchAction: 'none' }}>
                        {/* Speech bubble message */}
                        {showBubbleMessage && (
                            <div
                                style={{
                                    position: 'absolute',
                                    bottom: '72px',
                                    right: '0px',
                                    width: '200px',
                                    background: '#1a1a1a',
                                    border: '1px solid #7c3aed',
                                    borderRadius: '12px',
                                    padding: '10px 12px',
                                    boxShadow: '0 4px 20px rgba(124,58,237,0.3)'
                                }}
                            >
                                <button
                                    onClick={() => setShowBubbleMessage(false)}
                                    style={{ position: 'absolute', top: '6px', right: '8px', background: 'none', border: 'none', color: '#9ca3af', fontSize: '12px', cursor: 'pointer' }}
                                >✕</button>
                                <p style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', marginRight: '16px' }}>Somto</p>
                                <p style={{ color: '#e5e7eb', fontSize: '12px', lineHeight: '1.5', marginRight: '12px' }}>
                                    Your store is getting attention! 🔥 For ₦2,400 I'll start sending buyers to your WhatsApp today.
                                </p>
                                <button
                                    onClick={() => { setShowBubbleMessage(false); setShowSomtoPromote(true); }}
                                    style={{ marginTop: '8px', width: '100%', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', padding: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    Yes, Get Me Customers
                                </button>
                                {/* Triangle pointer */}
                                <div style={{ position: 'absolute', bottom: '-7px', right: '22px', width: '12px', height: '12px', background: '#1a1a1a', borderRight: '1px solid #7c3aed', borderBottom: '1px solid #7c3aed', transform: 'rotate(45deg)' }}/>
                            </div>
                        )}

                        {/* Bubble */}
                        <div
                            onTouchStart={handleBubbleTouchStart}
                            onTouchMove={handleBubbleTouchMove}
                            onTouchEnd={handleBubbleTouchEnd}
                            onClick={handleBubbleClick}
                            style={{
                                width: '58px',
                                height: '58px',
                                borderRadius: '50%',
                                overflow: 'hidden',
                                border: '2.5px solid #7c3aed',
                                boxShadow: '0 0 0 3px rgba(124,58,237,0.25), 0 4px 15px rgba(0,0,0,0.4)',
                                cursor: 'pointer',
                                userSelect: 'none',
                                animation: 'bubble-pulse 3s ease-in-out infinite'
                            }}
                        >
                            <img src="https://i.postimg.cc/KcrmDRbc/grok-1771024499914.jpg" alt="Somto" style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}/>
                        </div>

                        {/* Notification dot */}
                        <div style={{
                            position: 'absolute', top: '2px', right: '2px',
                            width: '14px', height: '14px', borderRadius: '50%',
                            background: '#ef4444', border: '2px solid #0a0a0a',
                            animation: 'bubble-pulse 2s ease-in-out infinite'
                        }}/>
                    </div>
                    </>
                );
            })()}

            {/* Modals */}
            {showLogin && <LoginModal onClose={() => setShowLogin(false)} onLoginSuccess={(sellerData) => {
                setCurrentUser({ type: 'seller', data: sellerData });
                setShowLogin(false);
                setSelectedSeller(sellerData); // take seller straight to their profile
            }} onSwitchToRegister={() => {
                setShowLogin(false);
                setShowRegistration(true);
            }} />}

            {showAddProduct && <AddProductModal onClose={() => setShowAddProduct(false)} onAdd={handleAddProduct} isUploading={isUploadingProduct} />}
            {showSomtoPromote && <SomtoPromoteChat onClose={() => setShowSomtoPromote(false)} currentUser={currentUser} />}
            {/* SubscriptionModal removed — Somto chat flow is the only upgrade path */}
            {showAttractCustomers && currentUser?.type === 'seller' && (
                <AttractCustomersModal
                    seller={currentUser.data}
                    onClose={() => setShowAttractCustomers(false)}
                    onShare={handleShare}
                />
            )}
            {showEditProfile && currentUser?.type === 'seller' && (
                <EditProfileModal
                    seller={{ ...currentUser.data }}
                    onClose={() => setShowEditProfile(false)}
                    onSave={handleEditProfile}
                />
            )}
            
            {/* WhatsApp Safety Modal */}
            {whatsappModal && (
                <WhatsAppModal
                    seller={whatsappModal.seller}
                    product={whatsappModal.product}
                    onClose={() => setWhatsappModal(null)}
                />
            )}
        </div>
    );
}

// Seller Profile Component

