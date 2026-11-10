import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, RotateCw, X } from 'lucide-react';
import { Language } from '../types';

interface QuickRepliesBarProps {
  messageText: string | null;
  messageId: string | null;
  senderName?: string;
  language: Language;
  isRtl: boolean;
  onSelectReply: (reply: string) => void;
  disabled?: boolean;
}

// Memory cache to prevent redundant API calls for previously analyzed messages
const repliesCache = new Map<string, string[]>();

export const QuickRepliesBar: React.FC<QuickRepliesBarProps> = ({
  messageText,
  messageId,
  senderName,
  language,
  isRtl,
  onSelectReply,
  disabled = false,
}) => {
  const [replies, setReplies] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const lastFetchedIdRef = useRef<string | null>(null);

  // Reset dismissal when a new message arrives
  useEffect(() => {
    if (messageId && messageId !== lastFetchedIdRef.current) {
      setIsDismissed(false);
    }
  }, [messageId]);

  const fetchReplies = async (forceRefresh = false) => {
    if (!messageId || !messageText || !messageText.trim()) {
      setReplies([]);
      return;
    }

    if (!forceRefresh && repliesCache.has(messageId)) {
      setReplies(repliesCache.get(messageId) || []);
      lastFetchedIdRef.current = messageId;
      return;
    }

    lastFetchedIdRef.current = messageId;
    setIsLoading(true);

    try {
      const response = await fetch('/api/quick-replies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageText,
          language,
          senderName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.replies) && data.replies.length > 0) {
          const validReplies = data.replies.slice(0, 3);
          repliesCache.set(messageId, validReplies);
          setReplies(validReplies);
          return;
        }
      }
    } catch (err) {
      console.warn('[QuickReplies] Failed to fetch AI replies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (messageId && messageText && !disabled) {
      fetchReplies();
    } else {
      setReplies([]);
    }
  }, [messageId, messageText, disabled]);

  if (disabled || isDismissed || (!isLoading && replies.length === 0)) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.98 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="w-full mb-2 px-1"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 max-w-full">
          {/* AI Sparkle Badge */}
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-xl bg-teal-50/90 border border-teal-200/80 text-[#087F75] text-[10px] font-bold shrink-0 select-none shadow-2xs"
            title={isRtl ? 'ردود سريعة ذكية مدعومة بالذكاء الاصطناعي' : 'AI-generated Quick Replies'}
          >
            <Sparkles className="w-3 h-3 text-[#087F75] shrink-0 animate-pulse" />
            <span className="hidden sm:inline">
              {isRtl ? 'ردود سريعة' : 'Quick Replies'}
            </span>
          </div>

          {/* Three Quick Reply Buttons / Skeleton Placeholders */}
          {isLoading ? (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              {[1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className="h-7 rounded-xl bg-slate-100 border border-slate-200/60 animate-pulse flex-1 min-w-[70px]"
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto scrollbar-none">
              {replies.slice(0, 3).map((reply, idx) => (
                <motion.button
                  key={`${messageId}_${idx}`}
                  type="button"
                  whileHover={{ scale: 1.02, backgroundColor: '#f0fdfa' }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => onSelectReply(reply)}
                  className="px-3 py-1.5 bg-white hover:bg-teal-50/80 active:bg-teal-100/70 border border-slate-200/90 hover:border-[#087F75]/40 text-slate-800 hover:text-[#087F75] rounded-xl text-xs font-semibold whitespace-nowrap transition-all shadow-2xs hover:shadow-xs cursor-pointer truncate max-w-[200px]"
                  title={reply}
                >
                  {reply}
                </motion.button>
              ))}
            </div>
          )}

          {/* Refresh Action */}
          <button
            type="button"
            onClick={() => fetchReplies(true)}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-[#087F75] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
            title={isRtl ? 'تحديث الردود المقترحة' : 'Regenerate suggestions'}
            aria-label={isRtl ? 'تحديث' : 'Refresh'}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Dismiss Action */}
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
            title={isRtl ? 'إخفاء' : 'Dismiss'}
            aria-label={isRtl ? 'إغلاق' : 'Dismiss'}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
