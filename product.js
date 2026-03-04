        function ProductDetail({ product, onClose, onSellerClick, onWhatsApp, onToggleLike }) {
            const [currentIndex, setCurrentIndex] = useState(0);
            const [touchStart, setTouchStart] = useState(0);
            const [touchEnd, setTouchEnd] = useState(0);
            const [showDescriptionModal, setShowDescriptionModal] = useState(false);
            const [liked, setLiked] = useState(product.liked || false);
            const [likesCount, setLikesCount] = useState(product.likes || 0);

            const trackAdClick = async () => {
                try {
                    const { data: campaigns } = await supabaseClient
                        .from('pending_payments').select('id, ad_clicks, click_quota')
                        .eq('product_id', product.id).eq('status', 'running').limit(1);
                    if (campaigns && campaigns.length > 0) {
                        const camp = campaigns[0];
                        const newClicks = (camp.ad_clicks || 0) + 1;
                        const quota = camp.click_quota || 5;
                        await supabaseClient.from('pending_payments').update({
                            ad_clicks: newClicks,
                            status: newClicks >= quota ? 'completed' : 'running'
                        }).eq('id', camp.id);
                    }
                } catch(e) { console.error('Ad click track error:', e); }
            };

            const handleLike = () => {
                const newLiked = !liked;
                const newCount = newLiked ? likesCount + 1 : Math.max(0, likesCount - 1);
                setLiked(newLiked);
                setLikesCount(newCount);
                // Call parent toggle to update global state + Supabase
                if (onToggleLike && product.seller?.id) {
                    onToggleLike(product.seller.id, product.id);
                } else {
                    // Fallback direct save
                    supabaseClient
                        .from('products')
                        .update({ likes: newCount })
                        .eq('id', product.id)
                        .then(({ error }) => { if (error) console.error('Likes error:', error); });
                }
            };

            const minSwipeDistance = 50;

            const handleTouchStart = (e) => {
                setTouchEnd(0);
                setTouchStart(e.targetTouches[0].clientX);
            };

            const handleTouchMove = (e) => {
                setTouchEnd(e.targetTouches[0].clientX);
            };

            const handleTouchEnd = () => {
                if (!touchStart || !touchEnd) return;
                
                const distance = touchStart - touchEnd;
                const isLeftSwipe = distance > minSwipeDistance;
                const isRightSwipe = distance < -minSwipeDistance;

                if (isLeftSwipe && currentIndex < product.images.length - 1) {
                    setCurrentIndex(currentIndex + 1);
                }
                if (isRightSwipe && currentIndex > 0) {
                    setCurrentIndex(currentIndex - 1);
                }
            };

            const handleLeftClick = (e) => {
                e.stopPropagation();
                if (currentIndex > 0) {
                    setCurrentIndex(currentIndex - 1);
                }
            };

            const handleRightClick = (e) => {
                e.stopPropagation();
                if (currentIndex < product.images.length - 1) {
                    setCurrentIndex(currentIndex + 1);
                }
            };

            return (
                <div className="fixed inset-0 bg-black z-[60]" onClick={onClose}>
                    <div className="relative w-full h-full flex items-center justify-center bg-black">
                        {/* Image Display */}
                        <div 
                            className="w-full h-full flex items-center justify-center" 
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                        >
                            <img 
                                src={product.images[currentIndex]}
                                alt={product.name}
                                className="max-w-full max-h-full object-contain"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>

                        {/* Left Click Area */}
                        <div 
                            className="absolute left-0 top-0 bottom-0 w-1/3 cursor-pointer"
                            onClick={handleLeftClick}
                        />

                        {/* Right Click Area */}
                        <div 
                            className="absolute right-0 top-0 bottom-0 w-1/3 cursor-pointer"
                            onClick={handleRightClick}
                        />
                        
                        {/* Top Bar with Lines and Info */}
                        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4">
                            {/* WhatsApp-style Lines Indicator */}
                            <div className="flex gap-1 mb-3">
                                {product.images.map((_, idx) => (
                                    <div 
                                        key={idx}
                                        className="flex-1 h-0.5 rounded-full transition-all"
                                        style={{
                                            backgroundColor: idx === currentIndex ? 'white' : 'rgba(255,255,255,0.3)'
                                        }}
                                    />
                                ))}
                            </div>

                            <div className="flex items-center justify-between">
                                <div 
                                    className="flex items-center gap-3 flex-1 cursor-pointer" 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSellerClick(product.seller);
                                    }}
                                >
                                    <img 
                                        src={product.seller.profilePhoto} 
                                        alt={product.seller.name}
                                        className="w-10 h-10 rounded-full object-cover border-2 border-white"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-1">
                                            <p className="font-semibold text-white text-sm">{product.seller.name}</p>
                                            {product.seller.isVerified && (
                                                <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                                                </svg>
                                            )}
                                        </div>
                                        <p className="text-xs text-white/80">{product.seller.location}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={onClose}
                                    className="w-9 h-9 rounded-full flex items-center justify-center"
                                >
                                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Bottom Bar with About Product, Product Name and Buttons */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-5 pb-6" onClick={(e) => e.stopPropagation()}>
                            
                            {/* About Product Button - ON TOP */}
                            {product.description && (
                                <button
                                    onClick={() => setShowDescriptionModal(true)}
                                    className="w-full mb-3 bg-white/10 backdrop-blur-sm text-white py-3 rounded-lg font-medium text-sm hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    About Product
                                </button>
                            )}
                            
                            {/* Product Name */}
                            <div className="mb-3">
                                <h3 className="text-xl font-bold text-white">{product.name}</h3>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => { trackAdClick(); onWhatsApp(product.seller, product); }}
                                    className="flex-1 bg-green-500 text-black py-3 rounded-lg font-semibold text-sm hover:bg-green-600 active:scale-98 transition-all shadow-lg flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                    </svg>
                                    Ask for Price
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleLike();
                                    }}
                                    className="w-12 h-12 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center active:scale-95 transition-all"
                                >
                                    <svg className="w-6 h-6 transition-all" fill={liked ? '#ef4444' : 'none'} stroke={liked ? '#ef4444' : 'white'} strokeWidth={2} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        
                        {/* Description Modal - Slides up from bottom */}
                        {showDescriptionModal && (
                            <div 
                                className="fixed inset-0 bg-black/50 z-[70] flex items-end"
                                onClick={() => setShowDescriptionModal(false)}
                            >
                                <div 
                                    className="bg-[#1a1a1a] w-full rounded-t-3xl max-h-[70vh] overflow-y-auto animate-slide-up"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* Drag Handle */}
                                    <div className="flex justify-center pt-3 pb-2">
                                        <div className="w-12 h-1 bg-gray-600 rounded-full"></div>
                                    </div>
                                    
                                    {/* Modal Header */}
                                    <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
                                        <h3 className="text-xl font-bold text-white">Product Description</h3>
                                        <button 
                                            onClick={() => setShowDescriptionModal(false)}
                                            className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white hover:bg-gray-700"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    
                                    {/* Description Content */}
                                    <div className="px-6 py-6">
                                        <p className="text-gray-300 text-base leading-relaxed whitespace-pre-line">
                                            {product.description || 'No description available.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        // Registration Modal
        function RegistrationModal({ onClose, onRegister, onSwitchToLogin }) {
            const [formData, setFormData] = useState({
                profilePhoto: '',
                businessName: '',
                email: '',
                category: 'phones',
                gender: '',
                location: '',
                whatsappNumber: '',
                password: '',
                bio: '',
                selfiePhoto: '',
                verificationVideo: ''
            });
            const [previewPhoto, setPreviewPhoto] = useState(DEFAULT_PROFILE_IMAGE);
            const [selfiePreview, setSelfiePreview] = useState(null);
            const [videoName, setVideoName] = useState('');
            const [isLoading, setIsLoading] = useState(false);
            const [error, setError] = useState('');
            const [isFreeSlot, setIsFreeSlot] = useState(null);
            const [submitted, setSubmitted] = useState(false);
            const [isFreeVerified, setIsFreeVerified] = useState(false);
            const fileInputRef = useRef(null);
            const selfieInputRef = useRef(null);
            const videoInputRef = useRef(null);

            useEffect(() => {
                // Check if free slots available
                const checkFreeSlots = async () => {
                    const { data } = await supabaseClient
                        .from('app_settings')
                        .select('free_verified_count')
                        .eq('id', 1)
                        .single();
                    setIsFreeSlot((data?.free_verified_count || 0) < 5);
                };
                checkFreeSlots();
            }, []);

            const handleSubmit = async (e) => {
                e.preventDefault();
                setError('');
                
                if (!formData.businessName || !formData.email || !formData.location || !formData.whatsappNumber || !formData.password) {
                    setError('Please fill in all required fields');
                    return;
                }
                
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(formData.email)) {
                    setError('Please enter a valid email address');
                    return;
                }
                
                if (formData.password.length < 6) {
                    setError('Password must be at least 6 characters long');
                    return;
                }

                // Sellers list immediately — selfie/video no longer required at signup

                setIsLoading(true);
                try {
                    await onRegister({ ...formData, profilePhoto: previewPhoto });
                    setSubmitted(true);
                    setIsFreeVerified(isFreeSlot);
                } catch (err) {
                    setError('Registration failed. Please try again.');
                } finally {
                    setIsLoading(false);
                }
            };

            const compressImage = (file, maxWidth = 800, quality = 0.7) => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            let width = img.width;
                            let height = img.height;
                            if (width > maxWidth) {
                                height = (height * maxWidth) / width;
                                width = maxWidth;
                            }
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, width, height);
                            resolve(canvas.toDataURL('image/jpeg', quality));
                        };
                        img.onerror = reject;
                        img.src = e.target.result;
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            };

            const handleImageUpload = async (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (file.size > 5 * 1024 * 1024) { alert('Image size must be less than 5MB'); return; }
                    try {
                        const compressed = await compressImage(file, 800, 0.7);
                        setPreviewPhoto(compressed);
                        setFormData({ ...formData, profilePhoto: compressed });
                    } catch (error) { alert('Failed to process image.'); }
                }
            };

            const handleSelfieUpload = async (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (file.size > 5 * 1024 * 1024) { alert('Image size must be less than 5MB'); return; }
                    try {
                        const compressed = await compressImage(file, 800, 0.8);
                        setSelfiePreview(compressed);
                        setFormData({ ...formData, selfiePhoto: compressed });
                    } catch (error) { alert('Failed to process image.'); }
                }
            };

            const handleVideoUpload = (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (file.size > 50 * 1024 * 1024) { alert('Video must be less than 50MB'); return; }
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        setFormData({ ...formData, verificationVideo: ev.target.result });
                        setVideoName(file.name);
                    };
                    reader.readAsDataURL(file);
                }
            };

            // Show success screen after submission
            if (submitted) {
                return (
                    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
                        <div className="bg-[#1a1a1a] rounded-2xl max-w-md w-full p-8 border border-gray-800 text-center">
                            <div className="text-6xl mb-4">🚀</div>
                            <h2 className="text-2xl font-bold text-white mb-3">You're Live on SearchPadi!</h2>
                            <p className="text-gray-300 mb-4">Your store is active. Buyers can find and contact you right now.</p>
                            <div className="bg-[#2a2a2a] rounded-xl p-4 mb-6 text-left space-y-3">
                                <p className="text-gray-400 text-sm flex items-start gap-2">
                                    <span>📦</span>
                                    <span>Add your products so buyers can see what you sell.</span>
                                </p>
                                <p className="text-gray-400 text-sm flex items-start gap-2">
                                    <span>⭐</span>
                                    <span>You'll show as <strong className="text-white">Unverified</strong> until our team reviews you — this is normal and won't stop buyers from contacting you.</span>
                                </p>
                                <p className="text-gray-400 text-sm flex items-start gap-2">
                                    <span>📣</span>
                                    <span>Use the <strong className="text-white">Get Customers</strong> button to run a campaign and reach more buyers.</span>
                                </p>
                            </div>
                            <button onClick={onClose} className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700">
                                Start Selling!
                            </button>
                        </div>
                    </div>
                );
            }

            return (
                <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4" onClick={onClose}>
                    <div className="bg-[#1a1a1a] rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-800" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-white">Become a Seller</h2>
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
                                <div className="flex flex-col items-center mb-4">
                                    <img 
                                        src={previewPhoto} 
                                        alt="Preview"
                                        className="w-24 h-24 rounded-full object-cover border-4 border-purple-600 mb-3"
                                    />
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleImageUpload}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current.click()}
                                        className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 transition-colors"
                                    >
                                        Upload Photo
                                    </button>
                                    <p className="text-xs text-gray-400 mt-2">Max 5MB (auto-compressed to ~200KB)</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Business Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.businessName}
                                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                                        className="w-full px-4 py-2 bg-[#2a2a2a] border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500"
                                        placeholder="e.g., TechZone Mobile Lagos"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">WhatsApp Number *</label>
                                    <div className="flex gap-2">
                                        <span className="bg-[#3a3a3a] border border-gray-700 text-white px-4 py-2 rounded-lg flex items-center font-medium">
                                            +234
                                        </span>
                                        <input
                                            type="tel"
                                            required
                                            value={formData.whatsappNumber}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, '').substring(0, 10);
                                                setFormData({ ...formData, whatsappNumber: value });
                                            }}
                                            className="flex-1 px-4 py-2 bg-[#2a2a2a] border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500"
                                            placeholder="8012345678"
                                            maxLength="10"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">For buyer contacts (used in "Ask for Price" button)</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Email Address *</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-2 bg-[#2a2a2a] border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500"
                                        placeholder="e.g., yourname@gmail.com"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">For login and account verification</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Category *</label>
                                    <select
                                        required
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-4 py-2 bg-[#2a2a2a] border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500"
                                    >
                                        <option value="phones">📱 Phones & Gadgets</option>
                                        <option value="electronics">💻 Electronics</option>
                                        <option value="shoes">👟 Shoes & Footwear</option>
                                        <option value="fashion">👔 Clothes & Fashion</option>
                                        <option value="furniture">🏠 Home & Furniture</option>
                                        <option value="foods">🍕 Foods & Edibles</option>
                                        <option value="beauty">💄 Beauty & Personal Care</option>
                                        <option value="general">🛒 General Store</option>
                                    </select>
                                </div>

                                {(formData.category === 'shoes' || formData.category === 'fashion') && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Target Gender</label>
                                        <select
                                            value={formData.gender}
                                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                            className="w-full px-4 py-2 bg-[#2a2a2a] border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500"
                                        >
                                            <option value="">Select...</option>
                                            <option value="male">👨 Male</option>
                                            <option value="female">👩 Female</option>
                                            <option value="both">👥 Both</option>
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Location *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        className="w-full px-4 py-2 bg-[#2a2a2a] border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500"
                                        placeholder="e.g., Lagos Island, Nigeria"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Password *</label>
                                    <input
                                        type="password"
                                        required
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-4 py-2 bg-[#2a2a2a] border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500"
                                        placeholder="Create a strong password"
                                        minLength="6"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Minimum 6 characters</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Bio (optional)</label>
                                    <textarea
                                        value={formData.bio}
                                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                        className="w-full px-4 py-2 bg-[#2a2a2a] border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500"
                                        rows="3"
                                        placeholder="Tell customers about your business..."
                                    />
                                </div>

                                {/* All sellers list immediately - no verification wall */}
                                <div className="bg-green-900/20 border border-green-700 rounded-xl p-4 text-center">
                                    <p className="text-green-400 font-bold">🎉 Your store goes live instantly!</p>
                                    <p className="text-gray-400 text-xs mt-1">You'll appear as "Unverified" until we review your account. Buyers can still find and contact you right away.</p>
                                </div>

                                {isFreeSlot === true && (
                                    <div className="bg-green-900/20 border border-green-700 rounded-xl p-4 text-center" style={{display:'none'}}>
                                        <p className="text-green-400 font-bold">🎉 You're one of our first 5 sellers!</p>
                                        <p className="text-gray-400 text-xs mt-1">No verification required. Your account activates instantly!</p>
                                    </div>
                                )}

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
                                    {isLoading ? 'Creating Account...' : 'Register as Seller'}
                                </button>
                                
                                {onSwitchToLogin && (
                                    <p className="text-center text-gray-400 text-sm mt-4">
                                        Already have an account?{' '}
                                        <button 
                                            type="button"
                                            onClick={onSwitchToLogin}
                                            className="text-purple-500 hover:text-purple-400 font-medium"
                                        >
                                            Login here
                                        </button>
                                    </p>
                                )}
                            </form>
                        </div>
                    </div>
                </div>
            );
        }

        // Login Modal Component
        function LoginModal({ onClose, onLoginSuccess, onSwitchToRegister }) {
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

        // Add Product Modal with 4 Images
