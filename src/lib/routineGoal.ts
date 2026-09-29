/** Kept import-free so server code can type routine goals without date-fns. */
export type RoutineGoal =
  | 'validate_idea'
  | 'find_cofounders'
  | 'grow_audience'
  | 'launch_product'
  | 'raise_funding';
