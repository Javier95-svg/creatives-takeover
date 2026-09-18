/**
 * How far a visitor gets before the tour asks for an account.
 *
 * Two different things are being balanced. The tour exists to show an
 * institution how the product works from the inside, so looking is cheap and
 * should stay generous. Doing is what an account is for, so anything that would
 * write, send or spend is refused outright rather than counted.
 *
 * The counted limits sit between those: a visitor can use the assistant a
 * couple of times and can walk most of the product, and crossing either asks
 * them to sign up. Both numbers are here on purpose, so they can be tuned
 * without reading any component.
 */

/** Questions the assistant answers before the composer closes. */
export const TOUR_QUESTION_LIMIT = 2;

/** Distinct panels a visitor opens before the tour asks for an account. */
export const TOUR_PANEL_LIMIT = 12;

export interface TourBudget {
  /** Distinct panel keys opened so far. */
  panelsSeen: string[];
  /** Questions put to the assistant so far. */
  questionsAsked: number;
}

export const EMPTY_TOUR_BUDGET: TourBudget = { panelsSeen: [], questionsAsked: 0 };

export function questionsLeft(budget: TourBudget) {
  return Math.max(0, TOUR_QUESTION_LIMIT - budget.questionsAsked);
}

export function panelsLeft(budget: TourBudget) {
  return Math.max(0, TOUR_PANEL_LIMIT - budget.panelsSeen.length);
}

/** True once the assistant has answered as often as the tour allows. */
export function questionsExhausted(budget: TourBudget) {
  return questionsLeft(budget) === 0;
}

/**
 * Whether opening this panel crosses the browsing limit. A panel already seen
 * never costs anything, so going back to compare two panels is free.
 */
export function panelBlocked(budget: TourBudget, panel: string) {
  return !budget.panelsSeen.includes(panel) && panelsLeft(budget) === 0;
}

export function recordPanel(budget: TourBudget, panel: string): TourBudget {
  if (budget.panelsSeen.includes(panel)) return budget;
  return { ...budget, panelsSeen: [...budget.panelsSeen, panel] };
}

export function recordQuestion(budget: TourBudget): TourBudget {
  return { ...budget, questionsAsked: budget.questionsAsked + 1 };
}
