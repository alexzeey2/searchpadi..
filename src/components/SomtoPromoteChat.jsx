import React, { useState, useEffect, useRef } from 'react'
import { supabaseClient } from '../supabase'
import { WHATSAPP_NUMBER } from '../helpers'

export default function SomtoPromoteChat({ onClose, currentUser }) {
    const SOMTO_AVATAR = "https://i.postimg.cc/KcrmDRbc/grok-1771024499914.jpg";
    const RATE = 4000;
    const PER = 5;
    const MAX_FREE_SLOTS = 3;
    const BANK = { bank: 'Opay', account: '9058150220', name: 'AlexanderBede Somtochukwu Ugwu' };

    const sellerProducts = currentUser?.data?.products || [];
    const sellerName = (currentUser?.data?.name || '').split(' ')[0] || 'there';

    // sheet: null | 'select' | 'price' | 'payment' | 'success'
    const [sheet, setSheet] = useState(null);
    const [messages, setMessages] = useState([]);
    const [typing, setTyping] = useState(false);
    const [opts, setOpts] = useState([]);
    const [showNum, setShowNum] = useState(false);
    const [numVal, setNumVal] = useState('');
    const [currentProduct, setCurrentProduct] = useState(null);
    const [pendingCount, setPendingCount] = useState(0);
    const [screenshot, setScreenshot] = useState(null);
    const [screenshotPreview, setScreenshotPreview] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [copied, setCopied] = useState(false);
    const msgsRef = useRef(null);
    const numRef = useRef(null);
    const screenshotRef = useRef(null);

    // Free slot state
    const [freeSlotAvailable, setFreeSlotAvailable] = useState(false);
    const [sellerAlreadyClaimed, setSellerAlreadyClaimed] = useState(false);
    const [slotsLeft, setSlotsLeft] = useState(0);
    const [isFreeOrder, setIsFreeOrder] = useState(false);
    const [slotCheckDone, setSlotCheckDone] = useState(false);

    // pricing helpers — free order costs ₦0, paid is normal rate
    const rounded = (n) => n;
    const cost = (n) => isFreeOrder ? 0 : Math.round(n / PER * RATE);
    const fee = (n) => 0;
    const grand = (n) => cost(n);
    const fmt = (n) => `₦${Math.round(n).toLocaleString('en-NG')}`;

    // Get current month string e.g. "2026-03"
    const getMonthYear = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    };

    // Check free slots — returns values directly to avoid stale state reads in init()
    const checkFreeSlots = async () => {
        try {
            const monthYear = getMonthYear();
            const sellerId = currentUser?.data?.id;

            // Check both tables — some claims may only exist in pending_payments
            const [{ data: slotData }, { data: paymentData }] = await Promise.all([
                supabaseClient
                    .from('free_campaign_slots')
                    .select('seller_id')
                    .eq('month_year', monthYear),
                supabaseClient
                    .from('pending_payments')
                    .select('seller_id')
                    .eq('plan_type', 'free_campaign')
                    .in('status', ['pending', 'running', 'approved', 'completed'])
                    .gte('payment_timestamp', `${monthYear}-01T00:00:00.000Z`)
            ]);

            // Combine unique seller IDs from both tables
            const slotSellerIds = new Set((slotData || []).map(s => s.seller_id));
            const paymentSellerIds = new Set((paymentData || []).map(s => s.seller_id));
            const allClaimedIds = new Set([...slotSellerIds, ...paymentSellerIds]);

            const takenCount = allClaimedIds.size;
            const remaining = Math.max(0, MAX_FREE_SLOTS - takenCount);
            const alreadyClaimed = allClaimedIds.has(sellerId) || false;
            const qualifies = sellerProducts.length >= PER && remaining > 0 && !alreadyClaimed;

            setSlotsLeft(remaining);
            setSellerAlreadyClaimed(alreadyClaimed);
            setFreeSlotAvailable(qualifies);
            setSlotCheckDone(true);
            return { qualifies, alreadyClaimed, remaining };
        } catch (err) {
            console.error('Free slot check failed:', err);
            setSlotCheckDone(true);
            return { qualifies: false, alreadyClaimed: false, remaining: 0 };
        }
    };

    // Claim free slot in Supabase
    const claimFreeSlot = async () => {
        try {
            const { error } = await supabaseClient
                .from('free_campaign_slots')
                .insert([{ month_year: getMonthYear(), seller_id: currentUser?.data?.id }]);
            if (error) throw error;
            return true;
        } catch (err) {
            console.error('Failed to claim free slot:', err);
            return false;
        }
    };

    const getRemainingDays = () => {
        const now = new Date();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return lastDay.getDate() - now.getDate();
    };

    const scrollDown = () => {
        setTimeout(() => { if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight; }, 80);
    };

    const addMsg = (text, who = 'bot') => {
        setMessages(prev => [...prev, { text, who, id: Date.now() + Math.random() }]);
    };

    const say = async (lines, delay = 820) => {
        for (let i = 0; i < lines.length; i++) {
            setTyping(true);
            await new Promise(r => setTimeout(r, delay + Math.random() * 180));
            setTyping(false);
            addMsg(lines[i]);
            scrollDown();
            await new Promise(r => setTimeout(r, 180));
        }
    };

    const showProductButtons = () => {
        const btns = [];
        if (sellerProducts.length > 0) btns.push({ label: 'Select Product', primary: true, fn: () => setSheet('select') });
        if (btns.length === 0) {
            // no products
        }
        setOpts(btns);
    };

    useEffect(() => {
        const init = async () => {
            await new Promise(r => setTimeout(r, 300));
            await say([
                `Hey ${sellerName}! 👋 I'm Somto.`,
                `My job is to convince people to message you on WhatsApp and ask about your product.`,
            ], 800);
            if (sellerProducts.length === 0) {
                await say([`But first, you need to add at least one product to your store. Add a product and come back! 🙂`], 900);
                return;
            }

            // Check free slots — use returned values directly, not state (state is async)
            const { qualifies, alreadyClaimed, remaining } = await checkFreeSlots();

            if (qualifies) {
                await say([
                    `🎉 Good news! You qualify for a FREE campaign this month.`,
                    `We're running ${MAX_FREE_SLOTS} free campaigns every month for active sellers — and there's ${remaining > 0 ? remaining : 1} slot${remaining !== 1 ? 's' : ''} left.`,
                    `Your first ${PER} customers are on us. Which product would you like me to promote?`,
                ], 800);
            } else if (alreadyClaimed) {
                await say([
                    `You've already used your free campaign this month! 🙌`,
                    `Your next free slot opens in ${getRemainingDays()} days.`,
                    `Want to run a paid campaign in the meantime? Which product shall we promote?`,
                ], 800);
            } else if (remaining <= 0) {
                // All free slots taken — skip free campaign pitch
                await say([
                    `All free campaign slots for this month are taken.`,
                    `But you can still run a paid campaign — which product would you like me to promote?`,
                ], 800);
            } else if (sellerProducts.length < PER) {
                await say([
                    `You need at least ${PER} products posted to qualify for a free campaign.`,
                    `You currently have ${sellerProducts.length}. Add ${PER - sellerProducts.length} more and a free slot could be yours! 🚀`,
                    `For now, which product would you like to promote?`,
                ], 800);
            } else {
                await say([`Which product would you like me to promote?`], 700);
            }
            showProductButtons();
        };
        init();
    }, []);

    useEffect(() => { scrollDown(); }, [messages, typing, sheet]);

    const handleSelectProduct = async (product) => {
        setCurrentProduct(product);
        setSheet(null);
        setOpts([]);
        addMsg(product.name, 'user');
        await new Promise(r => setTimeout(r, 350));

        // Re-check slots fresh right now — don't rely on stale state from mount
        const { qualifies: stillQualifies } = await checkFreeSlots();

        if (stillQualifies) {
            // Free campaign — lock in, no payment needed
            setIsFreeOrder(true);
            setPendingCount(PER);
            await say([
                `Great choice! "${product.name}" 🔥`,
                `Your free campaign will send ${PER} people straight to your WhatsApp. No payment needed — it's on us! 🎁`,
                `Here's a summary of what you're getting 👇`,
            ], 800);
            setSheet('price');
        } else {
            // Slots gone or no longer qualifies — go straight to paid
            setIsFreeOrder(false);
            await say([
                `Great choice! "${product.name}" 🔥`,
                `So how many customers would you like to ask about it?`,
                `Every ${PER} people = ${fmt(RATE)}. Minimum is ${PER}.`,
            ], 800);
            setShowNum(true);
            setTimeout(() => numRef.current?.focus(), 150);
        }
    };

    const submitNumber = async () => {
        const num = parseInt(numVal);
        if (!num || num < PER) { numRef.current?.focus(); return; }
        setPendingCount(num);
        setShowNum(false);
        setOpts([]);
        // Go straight to price sheet — no chat message, keeps chat clean
        setSheet('price');
    };

    const handlePay = async () => {
        if (isFreeOrder) {
            setSubmitting(true);
            try {
                // Check if seller already has a pending or approved free campaign this month
                const now = new Date();
                const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                
                const { data: existing } = await supabaseClient
                    .from('pending_payments')
                    .select('id')
                    .eq('seller_id', currentUser.data.id)
                    .eq('plan_type', 'free_campaign')
                    .in('status', ['pending', 'approved'])
                    .gte('payment_timestamp', `${monthYear}-01T00:00:00.000Z`);

                if (existing && existing.length > 0) {
                    alert('You already have a free campaign this month. You can only claim one free campaign per month.');
                    setSubmitting(false);
                    return;
                }

                // Claim the slot first — blocking this time
                const claimed = await claimFreeSlot();
                if (!claimed) {
                    alert('Sorry, the free campaign slot is no longer available. Please try again next month.');
                    setSubmitting(false);
                    return;
                }

                const insertData = {
                    seller_id: currentUser.data.id,
                    seller_name: currentUser.data.name,
                    seller_email: currentUser.data.email,
                    seller_whatsapp: currentUser.data.whatsappNumber || currentUser.data.whatsapp || '',
                    plan_type: 'free_campaign',
                    amount: 0,
                    target_count: PER,
                    category: currentUser.data.category || 'general',
                    product_id: currentProduct?.id || null,
                    product_name: currentProduct?.name || '',
                    product_image: currentProduct?.images?.[0] || null,
                    payment_timestamp: new Date().toISOString(),
                    payment_screenshot: null,
                    status: 'pending'
                };

                const { error } = await supabaseClient.from('pending_payments').insert([insertData]);
                if (error) {
                    alert('❌ Error: ' + error.message);
                    return;
                }
                setSheet('success');
            } catch (err) {
                alert('❌ Something went wrong: ' + err.message);
            } finally { 
                setSubmitting(false); 
            }
            return;
        }
        // Paid — go to payment sheet
        setSheet(null);
        await say([`Transfer the amount below to my account, then send me your payment screenshot 👇`], 800);
        setSheet('payment');
    };

    const handleScreenshotUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alert('Image must be less than 5MB'); return; }
        const reader = new FileReader();
        reader.onload = (ev) => { setScreenshot(ev.target.result); setScreenshotPreview(ev.target.result); };
        reader.readAsDataURL(file);
    };

    const handleCopyAccount = () => {
        navigator.clipboard?.writeText(BANK.account).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSubmit = async () => {
        if (!screenshot) { alert('Please upload your payment screenshot first'); return; }
        setSubmitting(true);
        try {
            const { error } = await supabaseClient.from('pending_payments').insert([{
                seller_id: currentUser.data.id,
                seller_name: currentUser.data.name,
                seller_email: currentUser.data.email,
                seller_whatsapp: currentUser.data.whatsappNumber || currentUser.data.whatsapp || '',
                plan_type: 'custom',
                amount: grand(pendingCount),
                target_count: rounded(pendingCount),
                category: currentUser.data.category,
                product_id: currentProduct.id,
                product_name: currentProduct.name,
                product_image: currentProduct.images?.[0] || null,
                payment_timestamp: new Date().toISOString(),
                payment_screenshot: screenshot,
                status: 'pending'
            }]);
            if (error) throw error;
            setSheet(null);
            setScreenshot(null);
            setScreenshotPreview(null);
            addMsg('📸 Payment screenshot sent', 'user');
            setSheet('success');
        } catch (err) {
            console.error(err);
            alert('Failed to submit. Please try again.');
        } finally { setSubmitting(false); }
    };

    const handleAfterSuccess = async () => {
        setSheet(null);
        const productName = currentProduct?.name;
        setCurrentProduct(null);
        setNumVal('');
        setPendingCount(0);
        await say([
            `Your "${productName}" campaign is under review.`,
            `Buyers will start messaging your WhatsApp in 4–6 days. Keep it active!`,
            `Want to promote another product?`,
        ], 850);
        setOpts([
            { label: 'Promote another', primary: true, fn: () => { setOpts([]); addMsg('Promote another', 'user'); setTimeout(() => showProductButtons(), 400); } },
            { label: "No, I'm good", fn: () => { setOpts([]); addMsg("No, I'm good", 'user'); setTimeout(async () => await say([`Alright! Come back anytime. 🙂`], 500), 400); } }
        ]);
    };

    // Shared panel styles
    const sheetOverlay = { position: 'fixed', inset: 0, zIndex: 10, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'fadeIn .2s ease' };
    const sheetBody = { background: '#13151f', borderTop: '1px solid rgba(255,255,255,0.07)', borderRadius: '24px 24px 0 0', width: '100%', padding: '24px 20px 44px', animation: 'slideUp 0.35s cubic-bezier(.34,1.2,.64,1)' };
    const pill = { width: 36, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, margin: '0 auto 20px' };
    const shBtn = { width: '100%', padding: 14, borderRadius: 13, background: 'linear-gradient(135deg,#7c5cfc,#4a30c8)', border: 'none', color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: 'pointer' };
    const shBtnDisabled = { ...shBtn, opacity: 0.35, cursor: 'not-allowed' };
    const shCancel = { display: 'block', textAlign: 'center', marginTop: 12, color: '#6b6b88', fontSize: 13, cursor: 'pointer' };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 150, background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }} onClick={onClose}>
            <div style={{ background: '#0b0d15', borderRadius: '20px 20px 0 0', maxHeight: '88vh', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.3s ease-out' }} onClick={e => e.stopPropagation()}>

                {/* Handle + Header */}
                <div style={{ flexShrink: 0 }}>
                    <div style={{ width: 36, height: 4, background: '#2a2a3a', borderRadius: 2, margin: '12px auto 0' }}/>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                        <img src={SOMTO_AVATAR} style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid #7c5cfc' }} alt="Somto"/>
                        <div style={{ flex: 1 }}>
                            <p style={{ color: '#eeeef5', fontWeight: 700, fontSize: 15, margin: 0 }}>Somto</p>
                            <p style={{ color: '#22c55e', fontSize: 11, margin: 0 }}>● Online now</p>
                        </div>
                        <button onClick={onClose} style={{ background: '#1a1d2a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '50%', width: 30, height: 30, color: '#6b6b88', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>✕</button>
                    </div>
                </div>

                {/* Chat messages */}
                <div ref={msgsRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 8px', display: 'flex', flexDirection: 'column', gap: 9, minHeight: 0 }}>
                    {messages.map(m => (
                        <div key={m.id} className="message-enter" style={{ display: 'flex', maxWidth: '82%', alignSelf: m.who === 'user' ? 'flex-end' : 'flex-start' }}>
                            <div style={{
                                padding: '10px 14px', borderRadius: 18, fontSize: 14, lineHeight: 1.55,
                                background: m.who === 'bot' ? '#1a1d2a' : '#7c5cfc',
                                border: m.who === 'bot' ? '1px solid rgba(255,255,255,0.07)' : 'none',
                                borderBottomLeftRadius: m.who === 'bot' ? 4 : 18,
                                borderBottomRightRadius: m.who === 'user' ? 4 : 18,
                                color: '#eeeef5',
                            }}>{m.text}</div>
                        </div>
                    ))}
                    {typing && (
                        <div style={{ alignSelf: 'flex-start' }} className="message-enter">
                            <div className="typing-indicator"><div className="typing-dot"/><div className="typing-dot"/><div className="typing-dot"/></div>
                        </div>
                    )}
                </div>

                {/* Action bar */}
                <div style={{ padding: '10px 16px 20px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, background: 'rgba(11,13,21,0.97)' }}>
                    {opts.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: showNum ? 8 : 0 }}>
                            {opts.map((o, i) => (
                                <button key={i} onClick={o.fn} style={{
                                    background: o.primary ? '#7c5cfc' : '#1a1d2a',
                                    border: `1px solid ${o.primary ? '#7c5cfc' : 'rgba(255,255,255,0.07)'}`,
                                    color: '#eeeef5', borderRadius: 20, padding: '9px 18px',
                                    fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
                                }}>{o.label}</button>
                            ))}
                        </div>
                    )}
                    {showNum && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#1a1d2a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '9px 12px' }}>
                            <input
                                ref={numRef}
                                type="number"
                                placeholder={`e.g. 12 (min ${PER})`}
                                min={PER}
                                value={numVal}
                                onChange={e => setNumVal(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && submitNumber()}
                                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#eeeef5', fontFamily: 'inherit', fontSize: 14, fontWeight: 600 }}
                            />
                            <span style={{ fontSize: 12, color: '#6b6b88', flexShrink: 0 }}>min. {PER}</span>
                            <button onClick={submitNumber} style={{ width: 34, height: 34, borderRadius: 10, background: '#7c5cfc', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* SELECT PRODUCT SHEET */}
            {sheet === 'select' && (
                <div style={sheetOverlay} onClick={e => e.target === e.currentTarget && setSheet(null)}>
                    <div style={sheetBody} onClick={e => e.stopPropagation()}>
                        <div style={pill}/>
                        <p style={{ fontWeight: 700, fontSize: 16, color: '#eeeef5', marginBottom: 4 }}>Select a Product</p>
                        <p style={{ color: '#6b6b88', fontSize: 13, marginBottom: 18 }}>Choose which product to promote</p>
                        <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                            {sellerProducts.map((p, i) => (
                                <div key={i} onClick={() => handleSelectProduct(p)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#1a1d2a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '11px 13px', cursor: 'pointer' }}>
                                    <div style={{ width: 44, height: 44, borderRadius: 9, overflow: 'hidden', flexShrink: 0 }}>
                                        <img src={p.images?.[0] || DEFAULT_PRODUCT_IMAGE} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: 700, fontSize: 14, color: '#eeeef5', margin: '0 0 2px' }}>{p.name}</p>
                                        <p style={{ color: '#6b6b88', fontSize: 12, margin: 0 }}>{p.images?.length || 0} photos</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <span style={shCancel} onClick={() => setSheet(null)}>Cancel</span>
                    </div>
                </div>
            )}

            {/* PRICE SHEET */}
            {sheet === 'price' && currentProduct && (
                <div style={sheetOverlay} onClick={e => e.target === e.currentTarget && setSheet(null)}>
                    <div style={sheetBody} onClick={e => e.stopPropagation()}>
                        <div style={pill}/>
                        <p style={{ fontWeight: 700, fontSize: 16, color: '#eeeef5', marginBottom: 18 }}>{isFreeOrder ? '🎁 Your Free Campaign' : "Here's what you're paying for"}</p>
                        {/* Product */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#1a1d2a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 13, padding: 12, marginBottom: 16 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 9, overflow: 'hidden', flexShrink: 0 }}>
                                <img src={currentProduct.images?.[0] || DEFAULT_PRODUCT_IMAGE} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                            </div>
                            <div>
                                <p style={{ fontWeight: 700, fontSize: 14, color: '#eeeef5', margin: '0 0 2px' }}>{currentProduct.name}</p>
                                <p style={{ color: '#6b6b88', fontSize: 12, margin: 0 }}>{rounded(pendingCount)} people to your WhatsApp</p>
                            </div>
                        </div>
                        {/* Breakdown */}
                        <div style={{ background: '#1a1d2a', borderRadius: 12, padding: 14, marginBottom: 18 }}>
                            {[
                                ['Customers', `${rounded(pendingCount)} people`],
                                ['Campaign cost', fmt(cost(pendingCount))],
                            ].map(([l, v], i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '5px 0', color: '#eeeef5' }}>
                                    <span style={{ color: '#6b6b88' }}>{l}</span><span>{v}</span>
                                </div>
                            ))}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, padding: '12px 0 5px', borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: 8, color: '#eeeef5' }}>
                                <span>Total</span><span style={{ color: '#a48bfd' }}>{fmt(grand(pendingCount))}</span>
                            </div>
                        </div>
                        <button style={{...shBtn, opacity: submitting ? 0.7 : 1}} onClick={handlePay} disabled={submitting}>{submitting ? 'Submitting...' : isFreeOrder ? '🎁 Claim Free Campaign' : 'Proceed to Payment'}</button>
                        {!isFreeOrder && <span style={shCancel} onClick={() => { setSheet(null); setShowNum(true); setTimeout(() => numRef.current?.focus(), 150); }}>Change number</span>}
                    </div>
                </div>
            )}

            {/* PAYMENT SHEET */}
            {sheet === 'payment' && (
                <div style={sheetOverlay} onClick={e => e.target === e.currentTarget && setSheet(null)}>
                    <div style={{ ...sheetBody, maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={pill}/>
                        <p style={{ fontWeight: 700, fontSize: 16, color: '#eeeef5', marginBottom: 4 }}>Make Payment</p>
                        <p style={{ color: '#6b6b88', fontSize: 13, marginBottom: 18 }}>Transfer to the account below, then upload your screenshot</p>
                        {/* Bank details */}
                        <div style={{ background: '#0a1929', border: '1px solid #1e3a5f', borderRadius: 14, padding: 16, marginBottom: 16 }}>
                            <p style={{ color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>Transfer to</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div>
                                    <p style={{ color: '#64748b', fontSize: 11, margin: '0 0 2px' }}>Bank</p>
                                    <p style={{ color: '#eeeef5', fontWeight: 700, fontSize: 15, margin: 0 }}>{BANK.bank}</p>
                                </div>
                                <div>
                                    <p style={{ color: '#64748b', fontSize: 11, margin: '0 0 4px' }}>Account Number</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <p style={{ color: '#a48bfd', fontWeight: 800, fontSize: 22, letterSpacing: '0.1em', margin: 0 }}>{BANK.account}</p>
                                        <button onClick={handleCopyAccount} style={{ background: '#2d1f5e', color: copied ? '#22c55e' : '#a48bfd', border: 'none', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                            {copied ? 'Copied!' : 'Copy'}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <p style={{ color: '#64748b', fontSize: 11, margin: '0 0 2px' }}>Account Name</p>
                                    <p style={{ color: '#eeeef5', fontSize: 14, fontWeight: 600, margin: 0 }}>{BANK.name}</p>
                                </div>
                                <div style={{ borderTop: '1px solid #1e3a5f', paddingTop: 10 }}>
                                    <p style={{ color: '#64748b', fontSize: 11, margin: '0 0 2px' }}>Amount</p>
                                    <p style={{ color: '#eeeef5', fontWeight: 800, fontSize: 26, margin: 0 }}>{fmt(grand(pendingCount))}</p>
                                </div>
                            </div>
                        </div>
                        <div style={{ background: '#2d2500', border: '1px solid #5a4500', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
                            <p style={{ color: '#fbbf24', fontSize: 12, margin: 0 }}>After transfer, upload your payment screenshot. I'll confirm and reach you on WhatsApp within 5–10 minutes.</p>
                        </div>
                        {/* Screenshot upload */}
                        <input type="file" ref={screenshotRef} onChange={handleScreenshotUpload} accept="image/*" style={{ display: 'none' }}/>
                        {screenshotPreview ? (
                            <div style={{ position: 'relative', marginBottom: 14 }}>
                                <img src={screenshotPreview} alt="Payment" style={{ width: '100%', maxHeight: 150, objectFit: 'contain', background: '#0b0d15', borderRadius: 12, border: '2px solid #22c55e' }}/>
                                <button onClick={() => screenshotRef.current.click()} style={{ position: 'absolute', top: 8, right: 8, background: '#fff', color: '#111', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Change</button>
                            </div>
                        ) : (
                            <button onClick={() => screenshotRef.current.click()} style={{ width: '100%', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 13, padding: 18, background: 'transparent', color: '#6b6b88', fontSize: 14, cursor: 'pointer', textAlign: 'center', marginBottom: 14 }}>
                                📸 Upload Payment Screenshot
                            </button>
                        )}
                        <button style={screenshotPreview && !submitting ? shBtn : shBtnDisabled} disabled={!screenshotPreview || submitting} onClick={handleSubmit}>
                            {submitting ? 'Submitting...' : 'Submit Payment'}
                        </button>
                        <span style={shCancel} onClick={() => setSheet(null)}>Cancel</span>
                    </div>
                </div>
            )}

            {/* SUCCESS SCREEN */}
            {sheet === 'success' && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 20, background: '#0b0d15', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center', padding: 30, animation: 'fadeIn .4s ease' }} onClick={e => e.stopPropagation()}>
                    <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'rgba(34,197,94,.12)', border: '2px solid rgba(34,197,94,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <p style={{ fontFamily: 'inherit', fontSize: 22, fontWeight: 700, color: '#eeeef5', margin: 0 }}>Payment Received!</p>
                    <p style={{ color: '#6b6b88', fontSize: 14, maxWidth: 270, lineHeight: 1.65, margin: 0 }}>Buyers will start messaging your WhatsApp in 4–6 days. Keep it active.</p>
                    <button style={{ ...shBtn, marginTop: 8, maxWidth: 200 }} onClick={handleAfterSuccess}>Back to Chat</button>
                </div>
            )}
        </div>
    );
}

        // WhatsApp Safety Modal

