import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const useFeedbackModal = (questionsCompleted: boolean) => {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackCompleted, setFeedbackCompleted] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Don't show for authenticated users
    if (isAuthenticated) return;

    // Don't show if questions haven't been completed
    if (!questionsCompleted) return;

    // Check if user has already completed feedback in this session
    try {
      const hasCompletedFeedback = sessionStorage.getItem('bizmap-feedback-completed');
      if (hasCompletedFeedback) {
        setFeedbackCompleted(true);
        return;
      }
    } catch (error) {
      console.warn('Feedback storage unavailable:', error);
      return;
    }

    // Show feedback modal after questions are completed
    setShowFeedback(true);
  }, [isAuthenticated, questionsCompleted]);

  const closeFeedback = () => {
    setShowFeedback(false);
  };

  const completeFeedback = (feedbackData?: { creditBonus?: number }) => {
    setShowFeedback(false);
    setFeedbackCompleted(true);
    // Remember that user has completed feedback for this session
    try {
      sessionStorage.setItem('bizmap-feedback-completed', 'true');
    } catch (error) {
      console.warn('Feedback storage unavailable:', error);
    }
    
    // Store credit bonus if provided
    if (feedbackData?.creditBonus) {
      try {
        sessionStorage.setItem('feedback-credit-bonus', feedbackData.creditBonus.toString());
      } catch (error) {
        console.warn('Feedback storage unavailable:', error);
      }
    }
  };

  return {
    showFeedback,
    feedbackCompleted,
    closeFeedback,
    completeFeedback
  };
};
