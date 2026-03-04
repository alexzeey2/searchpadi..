
        const { useState, useEffect, useRef } = React;

        // Initialize Supabase
        const SUPABASE_URL = 'https://fxjnbqymkdvuqfeagpur.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4am5icXlta2R2dXFmZWFncHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMTE0NTUsImV4cCI6MjA4NjU4NzQ1NX0.qcQPStoxVPdJfAEDJ-f0xiu_EQkRnZd2c2uDIhMMAdg';
        const { createClient } = supabase;
        const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            realtime: { params: { eventsPerSecond: 0 } }, // disable realtime — not used, saves overhead
            global: {
                fetch: (url, options = {}) => {
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 12000); // 12s timeout for slow networks
                    return fetch(url, { ...options, signal: controller.signal })
                        .finally(() => clearTimeout(timeout));
                }
            }
        });

        // Phone formatting helper
        const formatPhoneNumber = (phone) => {
            phone = phone.replace(/\D/g, '');
            if (phone.startsWith('0')) phone = phone.substring(1);
            if (phone.startsWith('234')) phone = phone.substring(3);
            return '+234' + phone;
        };

        const WHATSAPP_NUMBER = "+2349058150220";

        // Default placeholder image URLs (will be used as fallbacks)
        const DEFAULT_PROFILE_IMAGE = "https://via.placeholder.com/400x400/6366f1/ffffff?text=Profile";
        const DEFAULT_PRODUCT_IMAGE = "https://via.placeholder.com/400x400/6366f1/ffffff?text=Product";

