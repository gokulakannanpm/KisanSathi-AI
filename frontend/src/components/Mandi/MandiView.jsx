import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Search,
  AlertCircle,
  Sparkles,
  MapPin,
  RefreshCw,
  Clock,
  CheckCircle,
  Database
} from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';
import { LiveFallbackBadge } from '../Common/LiveFallbackBadge';
import { COMMODITY_OPTIONS } from '../../config/constants';
import { apiService } from '../../services/api';

export const MandiView = () => {
  const { mandiPrices, t, openAiExplainer, farmer } = useFarmer();
  const [selectedCommodity, setSelectedCommodity] = useState('All');
  const [selectedSource, setSelectedSource] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Koyambedu dedicated benchmark state (Thanjavur profile only)
  const [koyambeduData, setKoyambeduData] = useState([]);
  const [koyambeduMeta, setKoyambeduMeta] = useState(null);
  const [koyambeduLoading, setKoyambeduLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Strict geographic scoping: Koyambedu benchmark is ONLY available for Thanjavur, Tamil Nadu profile
  const isThanjavurFarmer = farmer?.id === 'demo_farmer_03' || (
    farmer?.district?.toLowerCase() === 'thanjavur' && farmer?.state?.toLowerCase() === 'tamil nadu'
  );

  // Automatically reset source filter if switched to another profile
  useEffect(() => {
    if (!isThanjavurFarmer && selectedSource === 'koyambedu') {
      setSelectedSource('all');
    }
  }, [isThanjavurFarmer, selectedSource]);

  // Load Koyambedu data when Thanjavur farmer selects the tab
  useEffect(() => {
    let isMounted = true;
    if (isThanjavurFarmer && selectedSource === 'koyambedu') {
      setKoyambeduLoading(true);
      apiService.getKoyambeduBenchmark(farmer?.id || 'demo_farmer_03')
        .then(res => {
          if (!isMounted) return;
          if (res && res.data) {
            setKoyambeduData(res.data);
            setKoyambeduMeta({
              data_status: res.data_status,
              is_live: res.is_live,
              observation_date: res.observation_date,
              retrieved_at: res.retrieved_at,
              source_attribution: res.source_attribution,
              source_url: res.source_url
            });
          }
        })
        .catch(err => {
          console.warn("Failed to load Koyambedu benchmark:", err);
        })
        .finally(() => {
          if (isMounted) setKoyambeduLoading(false);
        });
    }
    return () => { isMounted = false; };
  }, [isThanjavurFarmer, selectedSource, farmer?.id]);

  // Cooldown countdown timer for manual refresh
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(c => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleManualRefresh = async () => {
    if (cooldown > 0 || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const res = await apiService.refreshKoyambeduBenchmark(farmer?.id || 'demo_farmer_03');
      if (res && res.data) {
        setKoyambeduData(res.data);
        setKoyambeduMeta({
          data_status: res.data_status,
          is_live: res.is_live,
          observation_date: res.observation_date,
          retrieved_at: res.retrieved_at,
          source_attribution: res.source_attribution,
          source_url: res.source_url
        });
        setCooldown(60);
      }
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Determine active dataset to display
  const isViewingKoyambedu = isThanjavurFarmer && selectedSource === 'koyambedu';
  const rawListToFilter = isViewingKoyambedu ? koyambeduData : mandiPrices;

  // Extract unique commodities from dataset + options
  const availableCommodities = Array.from(
    new Set([
      ...COMMODITY_OPTIONS,
      ...rawListToFilter.map(p => (p.commodity || '').split(' ')[0]).filter(Boolean)
    ])
  );

  const filteredPrices = rawListToFilter.filter((item) => {
    const itemMarketLower = (item.market || '').toLowerCase();
    const itemSourceLower = (item.source_name || '').toLowerCase();
    const isKoyambeduItem = itemMarketLower.includes('koyambedu') || itemSourceLower.includes('koyambedu');

    // Strict leak protection: Non-Thanjavur farmers CANNOT see Koyambedu records
    if (!isThanjavurFarmer && isKoyambeduItem) {
      return false;
    }

    // 1. Commodity filter
    const matchesCommodity =
      selectedCommodity === 'All' ||
      item.commodity.toLowerCase().includes(selectedCommodity.toLowerCase()) ||
      (item.commodity_tamil && item.commodity_tamil.toLowerCase().includes(selectedCommodity.toLowerCase()));

    // 2. Source filter (only applicable in non-Koyambedu mode)
    let matchesSource = true;
    if (!isViewingKoyambedu) {
      if (selectedSource === 'agmarknet') {
        matchesSource = !isKoyambeduItem;
      } else if (selectedSource === 'tamil_nadu') {
        matchesSource = item.state === 'Tamil Nadu' && !isKoyambeduItem;
      }
    }

    // 3. Search query
    const matchesSearch =
      (item.commodity && item.commodity.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.commodity_tamil && item.commodity_tamil.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.market && item.market.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.district && item.district.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.state && item.state.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCommodity && matchesSource && matchesSearch;
  });

  // Dynamic source tabs based strictly on selected farmer profile
  const sourceTabs = [
    { id: 'all', label: t.allMarketSources || 'All Mandi Sources' },
    { id: 'agmarknet', label: t.apmcWholesaleMandis || 'APMC Wholesale Mandis' },
    ...(isThanjavurFarmer ? [
      { id: 'tamil_nadu', label: t.tamilNaduRegulated || 'Tamil Nadu Regulated' },
      { id: 'koyambedu', label: t.koyambeduBenchmark || 'Koyambedu Benchmark (Chennai)' }
    ] : [])
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* View Header */}
      <div>
        <h2 className="section-title">
          <TrendingUp size={24} color="#15803d" />
          <span>{t.mandiTitle || "Live APMC Mandi Rates & Market Trends"}</span>
        </h2>
        <p className="section-subtitle">
          {t.mandiSubtitle || "Verified wholesale modal prices with transparent data indicators"}
        </p>
      </div>

      {/* Farmer Location & Personalization Banner */}
      {farmer && (
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 'var(--radius-lg)',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
          fontSize: '0.85rem',
          color: '#166534'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={18} color="#15803d" />
            <span>
              <strong>{t.personalizedLocation || "Personalized Location"}:</strong> {farmer.name}'s holding in <strong>{farmer.district}, {farmer.state}</strong>
            </span>
          </div>
          {farmer.crops && farmer.crops.length > 0 && (
            <span style={{ fontSize: '0.78rem', background: '#dcfce7', padding: '0.2rem 0.5rem', borderRadius: '999px', fontWeight: 600 }}>
              {t.cropsCultivated || "Crops"}: {farmer.crops.map(c => t.crops?.[c.toLowerCase()] || c).join(', ')}
            </span>
          )}
        </div>
      )}

      {/* Dedicated Koyambedu Benchmark Explanation Banner for Thanjavur Profile */}
      {isViewingKoyambedu && (
        <div style={{
          background: '#eff6ff',
          border: '1px solid #93c5fd',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
          fontSize: '0.85rem',
          color: '#1e40af',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.95rem' }}>
              <span>🏢 {t.koyambeduTitle || 'Koyambedu Market Benchmark — Chennai'}</span>
              <span style={{
                fontSize: '0.72rem',
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                fontWeight: 700,
                background: koyambeduMeta?.data_status === 'live' ? '#dcfce7' : (koyambeduMeta?.data_status === 'cached' ? '#dbeafe' : (koyambeduMeta?.data_status === 'stale' ? '#fef3c7' : '#f1f5f9')),
                color: koyambeduMeta?.data_status === 'live' ? '#15803d' : (koyambeduMeta?.data_status === 'cached' ? '#1d4ed8' : (koyambeduMeta?.data_status === 'stale' ? '#b45309' : '#475569')),
                border: '1px solid currentColor'
              }}>
                {koyambeduMeta?.data_status === 'live' && (t.statusLive || '🟢 Live KWMC Sync')}
                {koyambeduMeta?.data_status === 'cached' && (t.statusCached || '💾 Cached (24h)')}
                {koyambeduMeta?.data_status === 'stale' && (t.statusStale || '⚠️ Stale Cache (>24h)')}
                {(!koyambeduMeta?.data_status || koyambeduMeta?.data_status === 'manual_reference') && (t.statusManualRef || '📋 Reference Snapshot (Offline)')}
              </span>
            </div>

            {/* Manual Refresh Button with Rate Limiting Cooldown */}
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing || cooldown > 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                background: cooldown > 0 ? '#f1f5f9' : '#1d4ed8',
                color: cooldown > 0 ? '#94a3b8' : 'white',
                border: 'none',
                cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease'
              }}
              title={cooldown > 0 ? `Please wait ${cooldown}s before refreshing again` : "Fetch latest prices from official KWMC portal"}
            >
              <RefreshCw size={14} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
              <span>
                {isRefreshing ? (t.refreshing || 'Refreshing...') : (cooldown > 0 ? `${t.refreshRates || 'Refresh'} (${cooldown}s)` : (t.refreshRates || 'Refresh Rates'))}
              </span>
            </button>
          </div>

          <div style={{ color: '#1e3a8a', fontSize: '0.82rem', lineHeight: 1.5 }}>
            {t.koyambeduDisclaimer || "Official market price data from the Market Management Committee (MMC) Koyambedu Wholesale Market Complex (mmckwmc.tn.gov.in). Chennai wholesale market auction rates are provided as a regional benchmark. They do not represent local Thanjavur farm-gate rates and do not deduct transit freight from the Cauvery delta."}
          </div>

          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.75rem', color: '#64748b', borderTop: '1px solid #bfdbfe', paddingTop: '0.5rem' }}>
            <span>📅 <strong>Observation Date:</strong> {koyambeduMeta?.observation_date || '2026-10-13'}</span>
            <span>🌐 <strong>Official Source:</strong> <a href="https://mmckwmc.tn.gov.in/landing-page/commodity" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>mmckwmc.tn.gov.in</a></span>
            <span>📊 <strong>Records Active:</strong> {koyambeduData.length} commodities</span>
          </div>
        </div>
      )}

      {/* Notice Banner explaining Live vs Fallback */}
      {!isViewingKoyambedu && (
        <div style={{
          background: '#ffffff',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-lg)',
          padding: '0.85rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <AlertCircle size={20} color="#d97706" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.85rem', color: '#475569' }}>
            <strong>{t.transparencyNoticeHeader || "Transparency Notice:"}</strong> {t.transparencyNoticeText || "Prices marked LIVE DATA are fetched in real-time from official portals. Items marked FALLBACK indicate verified baseline rates. MSP is government announced and never fabricated."}
          </div>
        </div>
      )}

      {/* Market Source Category Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {sourceTabs.map(src => (
          <button
            key={src.id}
            onClick={() => { setSelectedSource(src.id); setSelectedCommodity('All'); }}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.8rem',
              background: selectedSource === src.id ? '#15803d' : '#f8fafc',
              color: selectedSource === src.id ? 'white' : '#475569',
              border: `1px solid ${selectedSource === src.id ? '#15803d' : 'var(--border-medium)'}`,
              cursor: 'pointer'
            }}
          >
            {src.label}
          </button>
        ))}
      </div>

      {/* Filters & Search Bar */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Search */}
        <div style={{
          position: 'relative',
          flex: '1',
          minWidth: '240px'
        }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder={t.searchPlaceholder || "Search commodity, mandi, or state..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 0.75rem 0.65rem 2.4rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-medium)',
              background: '#ffffff',
              fontSize: '0.9rem'
            }}
          />
        </div>

        {/* Commodity Filter Pills */}
        <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '4px', maxWidth: '100%' }}>
          <button
            onClick={() => setSelectedCommodity('All')}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '999px',
              fontWeight: 700,
              fontSize: '0.8rem',
              background: selectedCommodity === 'All' ? '#15803d' : '#ffffff',
              color: selectedCommodity === 'All' ? 'white' : '#64748b',
              border: '1px solid var(--border-subtle)',
              whiteSpace: 'nowrap',
              cursor: 'pointer'
            }}
          >
            {t.allCrops || "All Crops"}
          </button>
          {availableCommodities.map((crop) => (
            <button
              key={crop}
              onClick={() => setSelectedCommodity(crop)}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '999px',
                fontWeight: 700,
                fontSize: '0.8rem',
                background: selectedCommodity === crop ? '#15803d' : '#ffffff',
                color: selectedCommodity === crop ? 'white' : '#64748b',
                border: '1px solid var(--border-subtle)',
                whiteSpace: 'nowrap',
                cursor: 'pointer'
              }}
            >
              {t.crops?.[crop.toLowerCase().split(' ')[0]] || crop}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State for Koyambedu */}
      {koyambeduLoading && isViewingKoyambedu && (
        <div className="ks-card" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
          <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 0.5rem', color: '#15803d' }} />
          <div>Loading Koyambedu market benchmark feed...</div>
        </div>
      )}

      {/* Empty State when no records match filter */}
      {!koyambeduLoading && filteredPrices.length === 0 && (
        <div className="ks-card" style={{
          textAlign: 'center',
          padding: '2.5rem 1.5rem',
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1px dashed var(--border-medium)'
        }}>
          <AlertCircle size={36} color="#94a3b8" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.4rem' }}>
            {t.noMandiRecordsFound || "No Mandi Records Found"}
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '440px', margin: '0 auto 1.25rem' }}>
            {t.noMandiRecordsDesc || `No market arrivals found matching commodity "${selectedCommodity}" in the selected category. We never substitute data from unrelated markets.`}
          </p>
          <button
            onClick={() => { setSelectedCommodity('All'); setSelectedSource(isViewingKoyambedu ? 'koyambedu' : 'all'); setSearchQuery(''); }}
            className="btn-primary"
            style={{ margin: '0 auto' }}
          >
            {t.clearFiltersViewAll || "Clear Filters & View All"}
          </button>
        </div>
      )}

      {/* Mandi Price Cards Grid */}
      {!koyambeduLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '1.25rem' }}>
          {filteredPrices.map((item, idx) => {
            const hasMsp = item.msp !== null && item.msp !== undefined && item.msp > 0;
            const isAboveMsp = hasMsp && item.modal_price >= item.msp;
            const isKoyambedu = (item.market || '').toLowerCase().includes('koyambedu');

            return (
              <div key={idx} className="ks-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                        {item.commodity}
                        {item.commodity_tamil && (
                          <span style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: 600, marginLeft: '0.35rem' }}>
                            ({item.commodity_tamil})
                          </span>
                        )}
                      </h3>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {item.category || item.variety || t.standardQuality || 'Standard Quality'} • {item.market}, {item.district}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 600, marginTop: '2px' }}>
                        {isKoyambedu ? (t.terminalWholesaleMarket || 'Chennai Terminal Wholesale Benchmark') : `${item.state} APMC Mandi`}
                      </div>
                    </div>
                    {isKoyambedu ? (
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        background: item.data_status === 'live' ? '#dcfce7' : (item.data_status === 'cached' ? '#dbeafe' : (item.data_status === 'stale' ? '#fef3c7' : '#f1f5f9')),
                        color: item.data_status === 'live' ? '#15803d' : (item.data_status === 'cached' ? '#1d4ed8' : (item.data_status === 'stale' ? '#b45309' : '#475569')),
                        border: '1px solid currentColor'
                      }}>
                        {item.data_status === 'live' ? (t.statusLive || 'Live KWMC') : (item.data_status === 'cached' ? (t.statusCached || 'Cached') : (item.data_status === 'stale' ? (t.statusStale || 'Stale') : (t.statusManualRef || 'Reference')))}
                      </span>
                    ) : (
                      <LiveFallbackBadge
                        source={item.source}
                        sourceName={item.source_name}
                        fallbackReason={item.fallback_reason}
                      />
                    )}
                  </div>

                  {/* Price Display */}
                  <div style={{
                    background: '#f8fafc',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem 1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    margin: '0.75rem 0'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                        {isKoyambedu ? "Advisory Midpoint Rate" : (t.modalMandiRate || "Modal Wholesale Rate")}
                      </div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#15803d' }}>
                        ₹{item.modal_price ? item.modal_price.toLocaleString() : `${item.min_price} - ${item.max_price}`} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>/ {item.raw_unit || item.unit || t.perQuintal || "1 Kg"}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{t.minMaxPrice || "Min / Max Range"}</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                        ₹{item.min_price} - ₹{item.max_price}
                      </div>
                    </div>
                  </div>

                  {/* Government MSP Comparison Pill or Horticultural Note */}
                  {hasMsp ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem',
                      padding: '0.4rem 0.65rem',
                      borderRadius: '8px',
                      background: isAboveMsp ? '#dcfce7' : '#fee2e2',
                      color: isAboveMsp ? '#166534' : '#b91c1c',
                      fontWeight: 700,
                      marginBottom: '0.75rem'
                    }}>
                      <span>{t.govtMsp || "Govt MSP"}: ₹{item.msp}</span>
                      <span>{isAboveMsp ? `+₹${item.modal_price - item.msp} ${t.aboveMsp || 'above MSP'}` : `-₹${item.msp - item.modal_price} ${t.belowMsp || 'below MSP'}`}</span>
                    </div>
                  ) : (
                    <div style={{
                      fontSize: '0.75rem',
                      padding: '0.3rem 0.5rem',
                      borderRadius: '6px',
                      background: '#f1f5f9',
                      color: '#64748b',
                      fontWeight: 600,
                      marginBottom: '0.75rem'
                    }}>
                      {item.msp_source || t.noMspMandate || "MSP data unavailable (No government MSP mandated for horticultural perishables)"}
                    </div>
                  )}

                  {/* AI Selling Tip */}
                  {item.ai_selling_tip && (
                    <div style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '8px',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.8rem',
                      color: '#166534',
                      marginBottom: '0.75rem'
                    }}>
                      <strong>💡 {t.sellingAdvice || "Selling Advice"}:</strong> {item.ai_selling_tip}
                    </div>
                  )}
                </div>

                {/* Card Footer with AI Assistant Trigger */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {item.observation_date || item.date || 'Today'}
                  </span>
                  <button
                    onClick={() => openAiExplainer({
                      headline: `${item.commodity} Market Strategy`,
                      reasoning: isKoyambedu
                        ? `Official Koyambedu Wholesale Auction Benchmark: ₹${item.min_price} - ₹${item.max_price} / ${item.raw_unit || item.unit}. Observation date: ${item.observation_date || item.date}. Regional benchmark for commercial comparison.`
                        : `Current modal rate at ${item.market} is ₹${item.modal_price} (Min ₹${item.min_price}, Max ₹${item.max_price}).`,
                      impact: `Market benchmark analysis for ${farmer?.district || 'Tamil Nadu'}`
                    })}
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <Sparkles size={14} color="#15803d" />
                    <span>{t.marketAdviceButton || "Market Strategy"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
