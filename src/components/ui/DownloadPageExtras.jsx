import React, { useState } from 'react';
import { CheckCircle, MessageSquareCheck, ThumbsDown, ThumbsUp } from 'lucide-react';
import { DOMAINS } from '../../lib/toolConfig';
import { RELATED_TOOLS } from '../../lib/relatedTools';
import { trackEvent } from '../../lib/analytics';

function getRecommendations(toolId) {
  const toolGroups = DOMAINS.flatMap(domain =>
    domain.categories.map(category => category.tools)
  );
  const tools = toolGroups.flat();
  const recommendations = [];

  const addTool = (candidate) => {
    const tool = tools.find(item => item.id === candidate);
    if (tool && tool.id !== toolId && !tool.comingSoon && !recommendations.some(item => item.id === tool.id)) {
      recommendations.push(tool);
    }
  };

  (RELATED_TOOLS[toolId] || []).forEach(addTool);
  toolGroups.find(group => group.some(tool => tool.id === toolId))
    ?.forEach(tool => addTool(tool.id));
  tools.forEach(tool => addTool(tool.id));

  return recommendations.slice(0, 5);
}

export default function DownloadPageExtras({ toolId }) {
  const routeToolId = toolId || (typeof window !== 'undefined'
    ? window.location.pathname.split('/').filter(Boolean)[0] || ''
    : '');
  const [feedbackState, setFeedbackState] = useState('idle');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackReason, setFeedbackReason] = useState(null);
  const [submittedRating, setSubmittedRating] = useState(null);
  const recommendations = getRecommendations(routeToolId);

  const handleFeedback = (rating) => {
    trackEvent('tool_feedback', { tool_name: routeToolId || 'unknown_tool', rating });
    setSubmittedRating(rating);
    setFeedbackState('submitted');
  };

  const submitDetailedFeedback = (reason) => {
    trackEvent('tool_feedback_detail', {
      tool_name: routeToolId || 'unknown_tool',
      reason,
      feedback_text: reason === 'other_issue' && feedbackText ? feedbackText.substring(0, 100) : undefined,
    });
    setSubmittedRating('thumbs_down');
    setFeedbackState('submitted');
  };

  const handleNegativeFeedback = () => {
    trackEvent('tool_feedback', { tool_name: routeToolId || 'unknown_tool', rating: 'thumbs_down' });
    setFeedbackState('thumbs_down');
  };

  const navigateToTool = (event, id) => {
    event.preventDefault();
    window.history.pushState({}, '', `/${id}`);
    window.dispatchEvent(new Event('popstate'));
  };

  return (
    <section className="mx-auto mt-8 w-full max-w-4xl border-t border-gray-100 pt-6" aria-label="Continue working and feedback">
      <h4 className="mb-4 text-center text-xs font-bold uppercase tracking-wider text-gray-400">
        Continue working
      </h4>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {recommendations.map(tool => {
          const Icon = tool.icon;
          return (
            <a
              key={tool.id}
              href={`/${tool.id}`}
              onClick={event => navigateToTool(event, tool.id)}
              className="group flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 text-center transition-colors hover:border-blue-200 hover:bg-blue-50"
            >
              <Icon className="h-6 w-6 text-gray-400 transition-colors group-hover:text-blue-600" aria-hidden="true" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">{tool.name}</span>
            </a>
          );
        })}
      </div>

      <div className="mx-auto mt-6 flex min-h-28 w-full max-w-2xl items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 p-5">
        {feedbackState === 'idle' && (
          <div className="flex w-full flex-col items-center gap-3">
            <p className="text-sm font-medium text-gray-700">Did this tool work well for you?</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleFeedback('thumbs_up')}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:border-green-200 hover:bg-green-50 hover:text-green-700"
              >
                <ThumbsUp className="h-4 w-4" /> Yes
              </button>
              <button
                type="button"
                onClick={handleNegativeFeedback}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                <ThumbsDown className="h-4 w-4" /> No
              </button>
            </div>
          </div>
        )}

        {feedbackState === 'thumbs_down' && (
          <div className="flex w-full flex-col items-center gap-3">
            <p className="text-sm font-medium text-gray-700">Sorry about that. What went wrong?</p>
            {feedbackReason !== 'other_issue' ? (
              <div className="flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => submitDetailedFeedback('file_still_too_large')} className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-100">File size still too large</button>
                <button type="button" onClick={() => submitDetailedFeedback('quality_loss')} className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-100">Output quality dropped</button>
                <button type="button" onClick={() => submitDetailedFeedback('processing_too_slow')} className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-100">Processing was slow</button>
                <button type="button" onClick={() => setFeedbackReason('other_issue')} className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-100">Other issue</button>
              </div>
            ) : (
              <form
                className="flex w-full flex-col gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitDetailedFeedback('other_issue');
                }}
              >
                <input
                  type="text"
                  value={feedbackText}
                  onChange={event => setFeedbackText(event.target.value)}
                  placeholder="Tell us more (max 100 chars)..."
                  maxLength={100}
                  aria-label="Describe the issue"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setFeedbackReason(null)} className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700">Cancel</button>
                  <button type="submit" className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800">Submit</button>
                </div>
              </form>
            )}
          </div>
        )}

        {feedbackState === 'submitted' && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700" role="status">
            {submittedRating === 'thumbs_up' ? <CheckCircle className="h-4 w-4" /> : <MessageSquareCheck className="h-4 w-4" />}
            {submittedRating === 'thumbs_up' ? 'Thanks for your feedback!' : 'Thank you for helping us improve!'}
          </p>
        )}
      </div>
    </section>
  );
}
