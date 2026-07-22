[CmdletBinding()]
param(
  [string]$ProjectRef = 'rcjlaybjnozqbsoxzboa',
  [switch]$SkipDatabase
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
  throw 'Supabase CLI is not installed or is not available on PATH.'
}

if (-not $SkipDatabase) {
  Write-Host 'Applying the analytics delivery-health migration...'
  # The production migration history contains legacy versions that are absent
  # from this repository, so db push refuses to run. Apply this idempotent,
  # reviewed migration directly without rewriting production migration history.
  & supabase db query --linked --file 'supabase/migrations/20260722150000_analytics_delivery_health.sql' --output table
  if ($LASTEXITCODE -ne 0) {
    throw "Analytics delivery-health migration failed with exit code $LASTEXITCODE"
  }
}

$analyticsFunctions = @(
  'stripe-webhook',
  'pmf-survey-respond',
  'icp-analyzer',
  'gtm-analyzer',
  'pmf-evidence-scorer',
  'mvp-builder-generate'
)

foreach ($functionName in $analyticsFunctions) {
  Write-Host "Deploying $functionName..."
  & supabase functions deploy $functionName --project-ref $ProjectRef
  if ($LASTEXITCODE -ne 0) {
    throw "Deployment failed for $functionName with exit code $LASTEXITCODE"
  }
}

Write-Host 'Analytics migration and Edge Function deployment completed successfully.'
