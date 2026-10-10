[CmdletBinding()]
param(
    [string]$ProjectPath = '',
    [switch]$Check,
    [switch]$Apply,
    [int]$MaxAgentsBytes = 32768
)
$ErrorActionPreference = 'Stop'
if ($Check -eq $Apply) { throw 'Select exactly one mode: -Check or -Apply.' }
if ([string]::IsNullOrWhiteSpace($ProjectPath)) { $ProjectPath = Join-Path $PSScriptRoot '..' }
$root = (Resolve-Path -LiteralPath $ProjectPath).Path.TrimEnd('\','/')
$utf8 = [Text.UTF8Encoding]::new($false, $true)
. (Join-Path $PSScriptRoot 'lib/governance-policy.ps1')

function Assert-NormalPath {
    param([string]$Path)
    $full = [IO.Path]::GetFullPath($Path)
    if (-not $full.StartsWith($root + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Path outside project: $Path"
    }
    $cursor = $full
    while ($cursor -and $cursor.Length -ge $root.Length) {
        $item = Get-Item -LiteralPath $cursor -Force -ErrorAction Stop
        if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Reparse path is not supported: $cursor" }
        $cursor = Split-Path -Parent $cursor
    }
}
function Read-Text { param([string]$Path); return $utf8.GetString([IO.File]::ReadAllBytes($Path)).Replace("`r`n","`n").Replace("`r","`n") }
function Text-Hash {
    param([string]$Text)
    $sha = [Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($sha.ComputeHash($utf8.GetBytes($Text)))).Replace('-','').ToLowerInvariant() } finally { $sha.Dispose() }
}
function Equal-Bytes { param([byte[]]$A,[byte[]]$B); return [Convert]::ToBase64String($A) -ceq [Convert]::ToBase64String($B) }
$paths = [ordered]@{
    common = Join-Path $root 'governance/common-governance.md'
    rules = Join-Path $root 'governance/project-rules.md'
    policy = Join-Path $root 'governance/verification-policy.json'
    renderer = Join-Path $root 'scripts/render-governance.ps1'
    validator = Join-Path $root 'scripts/check-governance.ps1'
    helper = Join-Path $root 'scripts/lib/governance-policy.ps1'
    turnover = Join-Path $root 'references/task-turnover-contract.md'
    agents = Join-Path $root 'AGENTS.md'
    operations = Join-Path $root 'docs/operations.md'
    lock = Join-Path $root 'governance/governance.lock.toml'
}
$before = @{}
foreach ($path in $paths.Values) {
    Assert-NormalPath $path
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Required file missing: $path" }
    $before[$path] = [IO.File]::ReadAllBytes($path)
}
$common = Read-Text $paths.common
$versionMatches = [regex]::Matches($common, '(?m)^<!-- project-governance-version: ([0-9]+\.[0-9]+\.[0-9]+) -->$')
if ($versionMatches.Count -ne 1) { throw 'One local project governance version marker is required.' }
$version = $versionMatches[0].Groups[1].Value
$lockText = Read-Text $paths.lock
if ([regex]::Matches($lockText, '(?m)^ownership_model = "project-owned"$').Count -ne 1) {
    throw 'Project-owned governance requires the owner-approved ownership record.'
}
$commonHash = Text-Hash $common
$header = @(
    '# AGENTS.md',
    '',
    '<!-- GENERATED FROM PROJECT-OWNED LOCAL SOURCES. DO NOT EDIT DIRECTLY. -->',
    "<!-- Local governance version: $version -->",
    "<!-- Local common SHA-256: $commonHash -->",
    '<!-- Edit governance/common-governance.md or project-rules.md; run scripts/render-governance.ps1 -Apply when generation inputs change. -->',
    ''
) -join "`n"
$route = @(
    '', '', '## Project-specific Rules', '',
    'Before any write, delegation, Git mutation, external action, implementation, or completion claim, read `governance/project-rules.md` and the task-routed authoritative documents it identifies. Resolve conflicts with the local contract before acting.', ''
) -join "`n"
$agents = $header + $common.TrimEnd() + $route
if ($utf8.GetByteCount($agents) -gt $MaxAgentsBytes) { throw "Generated AGENTS exceeds $MaxAgentsBytes bytes." }
$policy = (Read-Text $paths.policy) | ConvertFrom-Json
$summary = Get-VerificationPolicyDocumentationBlock $policy
$operations = $utf8.GetString($before[$paths.operations])
$begin = '<!-- BEGIN GENERATED VERIFICATION POLICY SUMMARY -->'
$end = '<!-- END GENERATED VERIFICATION POLICY SUMMARY -->'
if ([regex]::Matches($operations,[regex]::Escape($begin)).Count -ne 1 -or
    [regex]::Matches($operations,[regex]::Escape($end)).Count -ne 1) { throw 'Exactly one policy-summary marker pair is required.' }
$start = $operations.IndexOf($begin)
$finish = $operations.IndexOf($end)
if ($finish -le $start) { throw 'Policy-summary markers are out of order.' }
$nl = if ($operations.Contains("`r`n")) { "`r`n" } else { "`n" }
$operations = $operations.Substring(0,$start) + $summary.Replace("`n",$nl) + $operations.Substring($finish+$end.Length)
$lockBase = [regex]::Replace($lockText,'(?m)^(local_governance_version|local_[a-z_]+_sha256|generated_[a-z_]+_sha256) = "[^"]*"\n?','').TrimEnd()
$localFields = @(
    "local_governance_version = `"$version`"",
    "local_common_sha256 = `"$commonHash`"",
    "local_policy_sha256 = `"$(Text-Hash (Read-Text $paths.policy))`"",
    "local_renderer_sha256 = `"$(Text-Hash (Read-Text $paths.renderer))`"",
    "local_validator_sha256 = `"$(Text-Hash (Read-Text $paths.validator))`"",
    "local_helper_sha256 = `"$(Text-Hash (Read-Text $paths.helper))`"",
    "local_turnover_sha256 = `"$(Text-Hash (Read-Text $paths.turnover))`"",
    "generated_agents_sha256 = `"$(Text-Hash $agents)`"",
    "generated_summary_sha256 = `"$(Text-Hash $summary)`""
)
$expected = [ordered]@{}
$expected[$paths.agents] = $utf8.GetBytes($agents)
$expected[$paths.operations] = $utf8.GetBytes($operations)
$expected[$paths.lock] = $utf8.GetBytes($lockBase + "`n" + ($localFields -join "`n") + "`n")
$changed = @($expected.Keys | Where-Object { -not (Equal-Bytes $before[$_] $expected[$_]) })
if ($Check) {
    # Generated text uses normalized LF comparison; operations outside the block remain byte-preserved by Apply.
    foreach ($path in $expected.Keys) {
        $actual = $utf8.GetString($before[$path]).Replace("`r`n","`n")
        $wanted = $utf8.GetString($expected[$path]).Replace("`r`n","`n")
        if ($actual -cne $wanted) { throw "Stale local projection: $path. Run scripts/render-governance.ps1 -Apply." }
    }
} else {
    $sourceValidation = & $paths.validator -ProjectPath $root -SourcesOnly
    if (-not $sourceValidation.source_validation_only) { throw 'Source validation did not return its explicit result.' }
    $written = [Collections.Generic.List[string]]::new()
    function Write-AtomicBytes {
        param([string]$Path,[byte[]]$Bytes)
        $temporary = $Path + '.governance-' + [guid]::NewGuid().ToString('N') + '.tmp'
        try {
            [IO.File]::WriteAllBytes($temporary,$Bytes)
            [IO.File]::Move($temporary,$Path,$true)
        } finally {
            if (Test-Path -LiteralPath $temporary) { [IO.File]::Delete($temporary) }
        }
    }
    try {
        foreach ($path in $changed) {
            foreach ($inputPath in $paths.Values) {
                Assert-NormalPath $inputPath
                $guard = if ($written.Contains($inputPath)) { $expected[$inputPath] } else { $before[$inputPath] }
                if (-not (Equal-Bytes ([IO.File]::ReadAllBytes($inputPath)) $guard)) { throw "Concurrent change: $inputPath" }
            }
            Write-AtomicBytes $path $expected[$path]
            $written.Add($path)
        }
        $validation = & $paths.validator -ProjectPath $root -MaxAgentsBytes $MaxAgentsBytes
        if (-not $validation.generated_agents_current) { throw 'Final validation did not confirm local projections.' }
    } catch {
        $failure = $_
        foreach ($path in $written) {
            try {
                Assert-NormalPath $path
                if (Equal-Bytes ([IO.File]::ReadAllBytes($path)) $expected[$path]) {
                    Write-AtomicBytes $path $before[$path]
                } else { Write-Warning "Concurrent output preserved; manual recovery needed: $path" }
            } catch {
                Write-Warning "Output recovery incomplete; other outputs will still be checked: $path ($($_.Exception.Message))"
            }
        }
        throw $failure
    }
}
[pscustomobject]@{
    project_path = $root
    local_governance_version = $version
    generated_content_current = $true
    mode = $(if ($Check) { 'Check' } else { 'Apply' })
    write_count = $(if ($Check) { 0 } else { $changed.Count })
    changed_paths = $(if ($Check) { @() } else { $changed })
}
