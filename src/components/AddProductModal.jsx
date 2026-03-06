import React, { useState, useEffect, useRef } from 'react'
import { supabaseClient } from '../supabase'

export default function AddProductModal({ onClose, onAdd, isUploading }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        images: ['', '', '', '']
    });
    const [previewImages, setPreviewImages] = useState([
        DEFAULT_PRODUCT_IMAGE,
        DEFAULT_PRODUCT_IMAGE,
        DEFAULT_PRODUCT_IMAGE,
        DEFAULT_PRODUCT_IMAGE
    ]);
    const [uploadingIndex, setUploadingIndex] = useState(null);
    const fileInputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

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
                    
                    const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                    resolve(compressedBase64);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name) {
            alert('Please fill in all required fields');
            return;
        }
        
        onAdd({ 
            ...formData, 
            price: 'Ask for Price', 
            images: previewImages,
            description: formData.description 
        });
    };

    const handleImageUpload = async (index, e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size must be less than 5MB');
                return;
            }
            
            try {
                setUploadingIndex(index);
                const compressedBase64 = await compressImage(file, 800, 0.7);
                
                const newPreviews = [...previewImages];
                newPreviews[index] = compressedBase64;
                setPreviewImages(newPreviews);
                
                const newImages = [...formData.images];
                newImages[index] = compressedBase64;
                setFormData({ ...formData, images: newImages });
                
                setUploadingIndex(null);
            } catch (error) {
                console.error('Image compression error:', error);
                alert('Failed to process image. Please try another image.');
                setUploadingIndex(null);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[#1a1a1a] rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-800" onClick={(e) => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-white">Add Product</h2>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white">
                            ✕
                        </button>
                    </div>

                    {/* Instruction Banner */}
                    <div className="bg-purple-900/30 border border-purple-700/50 rounded-xl p-4 mb-5">
                        <p className="text-purple-300 text-sm font-semibold mb-1">📸 How to add products correctly</p>
                        <p className="text-gray-300 text-xs leading-relaxed">Upload <span className="text-white font-bold">4 photos of the same product</span>. Each form = one product type.</p>
                        <div className="mt-2 space-y-1">
                            <p className="text-green-400 text-xs">✅ 4 photos of Round Neck Sweaters → one form</p>
                            <p className="text-green-400 text-xs">✅ 4 photos of Joggers → a separate form</p>
                            <p className="text-red-400 text-xs">❌ Don't mix different products in one form</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Product Images (4 images) *</label>
                            <p className="text-xs text-gray-400 mb-2">Upload real product photos (Max 5MB each, auto-compressed)</p>
                            <div className="grid grid-cols-2 gap-2">
                                {[0, 1, 2, 3].map((index) => (
                                    <div key={index} className="relative">
                                        <img 
                                            src={previewImages[index]} 
                                            alt={`Preview ${index + 1}`}
                                            className="w-full h-32 object-cover rounded-lg border-2 border-purple-600"
                                        />
                                        <input
                                            type="file"
                                            ref={fileInputRefs[index]}
                                            onChange={(e) => handleImageUpload(index, e)}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRefs[index].current.click()}
                                            disabled={uploadingIndex === index}
                                            className="absolute bottom-2 right-2 bg-purple-600 text-white px-2 py-1 rounded text-xs hover:bg-purple-700 disabled:bg-gray-600"
                                        >
                                            {uploadingIndex === index ? '...' : (previewImages[index] === DEFAULT_PRODUCT_IMAGE ? 'Upload' : 'Change')}
                                        </button>
                                        <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                                            {index + 1}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Product Name *</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 bg-[#2a2a2a] border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500"
                                placeholder="e.g., iPhone 15 Pro Max"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Product Description (Optional)</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-2 bg-[#2a2a2a] border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500"
                                rows="4"
                                placeholder="Describe your product: features, condition, specifications, etc."
                            />
                            <p className="text-xs text-gray-400 mt-1">This will be shown in "About Product" section</p>
                        </div>

                        <button
                            type="submit"
                            disabled={isUploading}
                            className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isUploading && (
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            )}
                            {isUploading ? 'Uploading...' : 'Add Product'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

// Campaign Modal
