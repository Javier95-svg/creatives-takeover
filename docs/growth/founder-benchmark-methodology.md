# Founder Benchmark Publishing Standard

Creatives Takeover should not publish a benchmark page until it has real observations. This standard prevents fabricated statistics and makes future original data retrievable, citable, and reproducible.

## Required record fields

- Anonymous response or account identifier
- Observation date and reporting window
- Founder stage: idea, validation, MVP, launched, traction, or fundraising
- Business model and product category
- Team size band and founder geography band
- Defined event fields such as interview completed, waitlist signup, activation, retained use, first revenue, or investor meeting
- Event definition version so a changed metric is not mixed with an older definition
- Consent state for aggregate research use

Do not publish raw names, emails, free-text startup details, or cohorts small enough to identify a participant.

## Publication thresholds

- Require at least 30 eligible observations for an overall descriptive result.
- Suppress any segmented result with fewer than 10 observations.
- Report the sample size, collection dates, inclusion rules, missing-data handling, and exact metric definition beside every chart or table.
- Label medians, means, percentages, and model estimates correctly. Do not imply causality from an observational sample.
- Keep projections and platform-generated scores separate from observed founder behavior.

## Public evidence package

Every benchmark release must include:

1. An answer-first summary stating what was measured, the sample, dates, and the principal finding.
2. A methodology section with definitions, exclusions, limitations, and change history.
3. A downloadable, de-identified CSV or aggregate table when privacy permits.
4. A stable canonical URL and publication date.
5. Dataset JSON-LD containing `name`, `description`, `creator`, `datePublished`, `temporalCoverage`, `spatialCoverage` when applicable, `variableMeasured`, `measurementTechnique`, `license`, and `distribution` only when a downloadable dataset exists.
6. Article citations linking each external comparison to its primary source.

## Editorial acceptance check

- Recalculate every published figure from the release dataset or query output.
- Have a second reviewer verify the denominator, units, labels, and source URLs.
- Confirm the article editor reports at least one source for external quantitative claims.
- Confirm original figures are explicitly labeled “Creatives Takeover data” with sample size and date range.
- Archive the exact aggregate export used for the release.

Until these checks pass, use qualitative frameworks and worked examples rather than presenting invented benchmark numbers.
