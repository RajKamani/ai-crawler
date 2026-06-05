import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { API_BASE_URL } from '@/constants/Config';
import { SummarizeSheet } from '@/components/SummarizeSheet';
import { AdGateModal } from '@/components/AdGateModal';
import { useRewardedAd } from '@/hooks/useRewardedAd';

interface SummaryContextType {
  requestSummary: (postId: string, postTitle: string, initialSummaryText?: string | null) => Promise<void>;
  allowanceRemaining: number | null;
  fetchAllowance: () => Promise<void>;
}

const SummaryContext = createContext<SummaryContextType | undefined>(undefined);

export const SummaryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const { showToast } = useToast();

  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [isAdGateVisible, setIsAdGateVisible] = useState(false);
  const [currentPostId, setCurrentPostId] = useState<string | null>(null);
  const [currentPostTitle, setCurrentPostTitle] = useState('');
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [allowanceRemaining, setAllowanceRemaining] = useState<number | null>(null);

  // Auth headers helper
  const getAuthHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token || 'mock-user-session-token-12345'}`,
    };
  };

  const fetchAllowance = async () => {
    try {
      const allowanceRes = await fetch(`${API_BASE_URL}/summary/allowance`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (allowanceRes.ok) {
        const allowance = await allowanceRes.json();
        setAllowanceRemaining(allowance.total_remaining);
      }
    } catch (err) {
      console.warn('Failed to fetch summary allowance:', err);
    }
  };

  useEffect(() => {
    if (session) {
      fetchAllowance();
    }
  }, [session]);

  // Callback when rewarded ad finishes
  const onRewardedComplete = async () => {
    if (!currentPostId) return;
    
    setIsAdGateVisible(false);
    showToast({ message: 'Reward unlocked: +1 Summary Credit!', type: 'success' });
    
    // 1. Claim rewarded credit on the backend
    try {
      const claimRes = await fetch(`${API_BASE_URL}/summary/claim-reward`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      
      if (!claimRes.ok) {
        throw new Error('Failed to claim credit on backend');
      }
      fetchAllowance();
    } catch (err) {
      console.warn('[Ad Payout] Error updating allowance, proceeding anyway:', err);
    }

    // 2. Open drawer and load summary
    setIsSheetVisible(true);
    await fetchSummary(currentPostId);
  };

  const onAdFailed = (error: string) => {
    showToast({ message: error, type: 'error' });
  };

  // Wire up Mobile Ads hook
  const { showAd, isLoaded, reloadAd } = useRewardedAd(onRewardedComplete, onAdFailed);

  // Fetch summary action
  const fetchSummary = async (postId: string) => {
    setIsLoadingSummary(true);
    setSummaryText(null);
    try {
      const res = await fetch(`${API_BASE_URL}/summary`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ post_id: postId }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setSummaryText(data.summary);
        fetchAllowance();
      } else {
        setSummaryText('Unable to retrieve AI summary. Please check your daily credit limit.');
        showToast({ message: data.detail || 'Summary request failed', type: 'error' });
      }
    } catch (err) {
      setSummaryText('Error loading AI summary. Check connection.');
      showToast({ message: 'Network request failed', type: 'error' });
    } finally {
      setIsLoadingSummary(false);
    }
  };

  // Public trigger method
  const requestSummary = async (postId: string, postTitle: string, initialSummaryText?: string | null) => {
    setCurrentPostId(postId);
    setCurrentPostTitle(postTitle);

    // 1. If summary is already cached on post, show sheet immediately (free)
    if (initialSummaryText) {
      setSummaryText(initialSummaryText);
      setIsSheetVisible(true);
      setIsLoadingSummary(false);
      return;
    }

    // 2. Use cached allowance state for instant UI responsiveness
    const hasQuota = allowanceRemaining === null || allowanceRemaining > 0;

    if (hasQuota) {
      // We have quota - show sheet and fetch
      setIsSheetVisible(true);
      await fetchSummary(postId);
    } else {
      // Quota exhausted - prompt ad
      reloadAd(); // Preload ad if not already preloaded
      setIsAdGateVisible(true);
    }
  };

  return (
    <SummaryContext.Provider value={{ requestSummary, allowanceRemaining, fetchAllowance }}>
      {children}
      
      {/* Centralized SummarizeSheet Bottom Drawer */}
      <SummarizeSheet
        isVisible={isSheetVisible}
        onClose={() => setIsSheetVisible(false)}
        postTitle={currentPostTitle}
        summary={summaryText}
        isLoading={isLoadingSummary}
      />

      {/* Centralized AdGateModal */}
      <AdGateModal
        isVisible={isAdGateVisible}
        onClose={() => setIsAdGateVisible(false)}
        onWatchAd={showAd}
        isAdLoaded={isLoaded}
      />
    </SummaryContext.Provider>
  );
};

export const useSummary = () => {
  const context = useContext(SummaryContext);
  if (!context) {
    throw new Error('useSummary must be used within a SummaryProvider');
  }
  return context;
};
