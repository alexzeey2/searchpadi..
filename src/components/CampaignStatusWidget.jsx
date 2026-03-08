import React, { useState, useEffect } from 'react'
import { supabaseClient } from '../supabase'

export default function CampaignStatusWidget({ sellerId }) {
    const [campaign, setCampaign] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const load = async () => {
            const { data } = await supabaseClient
                .from('pending_payments').select('status, ad_clicks, click_quota, product_name')
                .eq('seller_id', sellerId).in('status', ['running', 'pending', 'completed'])
                .order('created_at', { ascending: false }).limit(1);
            setCampaign(data?.[0] || null);
            setLoading(false);
        };
        load();
    }, [sellerId]);
    if (loading) return null;
    if (!campaign) return (
        <div className="bg-white/5 rounded-xl p-3 mb-3 text-center">
            <p className="text-gray-400 text-xs">No active campaign</p>
        </div>
    );
    const clicks = campaign.ad_clicks || 0;
    const quota = campaign.click_quota || 5;
    const pct = Math.min((clicks / quota) * 100, 100);
    const statusColor = campaign.status === 'running' ? 'text-green-400' : campaign.status === 'completed' ? 'text-gray-400' : 'text-yellow-400';
    const statusLabel = campaign.status === 'running' ? '🟢 Running' : campaign.status === 'completed' ? '✅ Completed' : '⏳ Pending';
    return (
        <div className="bg-white/5 rounded-xl p-3 mb-3">
            <div className="flex justify-between items-center mb-1">
                <p className="text-white text-xs font-semibold">Campaign: {campaign.product_name}</p>
                <span className={`text-xs font-bold ${statusColor}`}>{statusLabel}</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5 mb-1">
                <div className="bg-purple-500 h-1.5 rounded-full transition-all" style={{width: `${pct}%`}}></div>
            </div>
            <p className="text-gray-400 text-xs">{clicks} of {quota} clicks used</p>
        </div>
    );
}
