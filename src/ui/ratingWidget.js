import { escapeHtml } from "./escapeHtml.js";

export const FEEDBACK_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLScw-qnf5QKTYlAdHONFHa1PP5bsXWUvCeSegfZhg3HEY111xA/viewform";
export const CWS_REVIEW_URL = "INSERT_CWS_REVIEW_URL";

export const RATING_WIDGET_KEYS = {
  completed: "ratingWidgetCompleted",
  dismissedAt: "ratingWidgetDismissedAt",
  lastShownAt: "ratingWidgetLastShownAt",
  ratedAt: "ratingWidgetRatedAt",
  selectedRating: "ratingWidgetSelectedRating"
};

export const RATING_WIDGET_DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
export const RATING_WIDGET_SHOW_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function renderStars(selectedRating = 0) {
  return [1, 2, 3, 4, 5]
    .map((rating) => {
      const isSelected = Number(selectedRating) >= rating;

      return `
        <button
          type="button"
          class="rating-widget__star ${isSelected ? "rating-widget__star--selected" : ""}"
          data-action="select-rating"
          data-rating="${rating}"
          aria-label="Rate ${rating} out of 5"
          aria-pressed="${isSelected ? "true" : "false"}"
          title="Rate ${rating} out of 5"
        >&#9733;</button>
      `;
    })
    .join("");
}

function renderPrompt(state) {
  return `
    <div class="rating-widget__main">
      <div>
        <div class="eyebrow">Feedback</div>
        <h2 class="section-title">Rate this extension</h2>
        <p class="muted">How was your experience?</p>
      </div>
      <div class="rating-widget__stars" role="radiogroup" aria-label="Rate this extension">
        ${renderStars(state.selectedRating)}
      </div>
    </div>
    <div class="rating-widget__actions">
      <button type="button" class="button rating-widget__dismiss" data-action="dismiss-rating-widget">
        Not now
      </button>
    </div>
  `;
}

function renderReviewRequest(cwsReviewUrl) {
  const hasReviewUrl = /^https?:\/\//i.test(cwsReviewUrl);

  return `
    <div class="rating-widget__message">
      <div>
        <div class="eyebrow">Feedback</div>
        <h2 class="section-title">Thanks!</h2>
        <p class="muted">Could you leave a quick review in the Chrome Web Store? It really helps.</p>
      </div>
      <div class="rating-widget__actions">
        <button
          type="button"
          class="button button--secondary"
          data-action="open-cws-review"
          ${hasReviewUrl ? "" : "disabled"}
          title="${hasReviewUrl ? "Open Chrome Web Store review page" : "Chrome Web Store review URL is not configured yet"}"
        >
          Leave a review
        </button>
      </div>
    </div>
  `;
}

function renderLowFeedbackMessage() {
  return `
    <div class="rating-widget__message">
      <div>
        <div class="eyebrow">Feedback</div>
        <h2 class="section-title">Sorry to hear that.</h2>
        <p class="muted">Please tell us what went wrong so we can improve.</p>
      </div>
    </div>
  `;
}

function renderNeutralMessage() {
  return `
    <div class="rating-widget__message">
      <div>
        <div class="eyebrow">Feedback</div>
        <h2 class="section-title">Thanks for your feedback!</h2>
      </div>
      <div class="rating-widget__actions">
        <button type="button" class="button button--secondary" data-action="open-feedback-form">
          Tell us what can be improved
        </button>
      </div>
    </div>
  `;
}

export function renderRatingWidget(state = {}) {
  if (!state.visible) {
    return "";
  }

  const mode = state.mode || "prompt";
  const contentByMode = {
    low: renderLowFeedbackMessage,
    neutral: renderNeutralMessage,
    prompt: () => renderPrompt(state),
    review: () => renderReviewRequest(state.cwsReviewUrl || CWS_REVIEW_URL)
  };
  const renderContent = contentByMode[mode] || contentByMode.prompt;

  return `
    <section class="rating-widget" aria-label="${escapeHtml("Rate this extension")}">
      ${renderContent()}
    </section>
  `;
}
