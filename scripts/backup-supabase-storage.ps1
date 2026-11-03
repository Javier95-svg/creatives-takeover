param(
  [string]$DestinationBucket = 'ct-supabase-storage-backups',
  [string]$SnapshotId = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
)

$ErrorActionPreference = 'Stop'

if ($DestinationBucket -notmatch '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$') {
  throw 'DestinationBucket must be a simple S3 bucket name.'
}
if ($SnapshotId -notmatch '^\d{8}T\d{6}Z$') {
  throw 'SnapshotId must be a UTC timestamp such as 20261103T120000Z.'
}
if (-not (Get-Command rclone -ErrorAction SilentlyContinue)) {
  throw 'Install rclone before running this backup.'
}

$required = @(
  'RCLONE_CONFIG_CTSOURCE_TYPE', 'RCLONE_CONFIG_CTSOURCE_PROVIDER',
  'RCLONE_CONFIG_CTSOURCE_ACCESS_KEY_ID', 'RCLONE_CONFIG_CTSOURCE_SECRET_ACCESS_KEY',
  'RCLONE_CONFIG_CTSOURCE_ENDPOINT', 'RCLONE_CONFIG_CTSOURCE_REGION',
  'RCLONE_CONFIG_CTR2_TYPE', 'RCLONE_CONFIG_CTR2_PROVIDER',
  'RCLONE_CONFIG_CTR2_ACCESS_KEY_ID', 'RCLONE_CONFIG_CTR2_SECRET_ACCESS_KEY',
  'RCLONE_CONFIG_CTR2_ENDPOINT'
)
$missing = @($required | Where-Object { -not [Environment]::GetEnvironmentVariable($_) })
if ($missing.Count) {
  throw "Missing environment variable names: $($missing -join ', ')"
}

# The source remote's root lists Supabase Storage buckets. Every bucket is
# copied under one immutable snapshot prefix in a private R2 bucket.
$buckets = @(& rclone lsf ctsource: --dirs-only)
if ($LASTEXITCODE -ne 0) { throw 'Could not list Supabase Storage buckets.' }
$buckets = @($buckets | ForEach-Object { $_.TrimEnd('/') } | Where-Object { $_ })
if (-not $buckets.Count) { throw 'No source buckets were listed; refusing an empty backup.' }

foreach ($bucket in $buckets) {
  if ($bucket -notmatch '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,62}$') {
    throw 'A source bucket name has unexpected characters; review it manually.'
  }
  $source = "ctsource:$bucket"
  $destination = "ctr2:$DestinationBucket/$SnapshotId/$bucket"
  Write-Output "Copying and verifying bucket $bucket in snapshot $SnapshotId"

  & rclone copy $source $destination --immutable --transfers 4 --checkers 4
  if ($LASTEXITCODE -ne 0) { throw "Copy failed for bucket $bucket." }

  # Read both sides and compare bytes even if the providers expose different
  # ETag/hash formats. No files are downloaded to the local disk.
  & rclone check $source $destination --download --one-way --checkers 4
  if ($LASTEXITCODE -ne 0) { throw "Byte verification failed for bucket $bucket." }
}

Write-Output "Verified snapshot $SnapshotId in R2 bucket $DestinationBucket."
