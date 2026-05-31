export const isMVPBuilderCreditFeature = (feature: string) =>
  feature.startsWith('APP_BUILDER_');

export const resolveMVPBuilderChargeAmount = (
  feature: string,
  requiredCredits: number,
  totalAvailable: number,
  allowPartialSpend: boolean
) => {
  if (
    allowPartialSpend &&
    isMVPBuilderCreditFeature(feature) &&
    totalAvailable > 0
  ) {
    return Math.min(requiredCredits, totalAvailable);
  }

  return requiredCredits;
};
