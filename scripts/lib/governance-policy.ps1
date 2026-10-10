function Format-VerificationSummaryValue {
    param([AllowNull()][object]$Value)
    if ($null -eq $Value) { return '' }
    return ([string]$Value).Replace('\', '\\').Replace("`r", '\r').Replace("`n", '\n').Replace(';', '\;').Replace(',', '\,').Replace('[', '\[').Replace(']', '\]')
}

function Format-VerificationSummaryArray {
    param([AllowEmptyCollection()][object[]]$Values)
    return '[' + ((@($Values) | ForEach-Object { Format-VerificationSummaryValue -Value $_ }) -join ',') + ']'
}

function Get-VerificationPolicyDocumentationBlock {
    param([Parameter(Mandatory = $true)]$Policy)

    $lines = [Collections.Generic.List[string]]::new()
    $lines.Add('<!-- BEGIN GENERATED VERIFICATION POLICY SUMMARY -->')
    $lines.Add('- Root: schemaVersion=' + (Format-VerificationSummaryValue $Policy.schemaVersion) + '; comprehensiveGateIds=' + (Format-VerificationSummaryArray @($Policy.comprehensiveGateIds)) + '; unknownImpactGateIds=' + (Format-VerificationSummaryArray @($Policy.unknownImpactGateIds)))
    foreach ($focused in @($Policy.focusedRegressions)) {
        $lines.Add('- FocusedRegression: id=' + (Format-VerificationSummaryValue $focused.id) + '; triggerPaths=' + (Format-VerificationSummaryArray @($focused.triggerPaths)) + '; command=' + (Format-VerificationSummaryValue $focused.command) + '; completionRequired=' + (Format-VerificationSummaryValue $focused.completionRequired))
    }
    foreach ($runtimeProfile in @($Policy.runtimeProfiles)) {
        $lines.Add('- RuntimeProfile: id=' + (Format-VerificationSummaryValue $runtimeProfile.id) + '; platform=' + (Format-VerificationSummaryValue $runtimeProfile.platform) + '; edition=' + (Format-VerificationSummaryValue $runtimeProfile.edition) + '; executable=' + (Format-VerificationSummaryValue $runtimeProfile.executable) + '; versionRule=' + (Format-VerificationSummaryValue $runtimeProfile.versionRule) + '; required=' + (Format-VerificationSummaryValue $runtimeProfile.required) + '; supportStatus=' + (Format-VerificationSummaryValue $runtimeProfile.supportStatus))
    }
    foreach ($changeClass in @($Policy.classes)) {
        $lines.Add('- Class: id=' + (Format-VerificationSummaryValue $changeClass.id) + '; triggers=' + (Format-VerificationSummaryArray @($changeClass.triggers)) + '; iterationGateIds=' + (Format-VerificationSummaryArray @($changeClass.iterationGateIds)) + '; targetedRegressionGateIds=' + (Format-VerificationSummaryArray @($changeClass.targetedRegressionGateIds)) + '; completionGateIds=' + (Format-VerificationSummaryArray @($changeClass.completionGateIds)) + '; releaseOnlyGateIds=' + (Format-VerificationSummaryArray @($changeClass.releaseOnlyGateIds)) + '; omittableGateIds=' + (Format-VerificationSummaryArray @($changeClass.omittableGateIds)) + '; omissionRecord=' + (Format-VerificationSummaryValue $changeClass.omissionRecord))
    }
    foreach ($gate in @($Policy.gates)) {
        $lines.Add('- Gate: id=' + (Format-VerificationSummaryValue $gate.id) + '; command=' + (Format-VerificationSummaryValue $gate.command) + '; stages=' + (Format-VerificationSummaryArray @($gate.stages)) + '; includes=' + (Format-VerificationSummaryArray @($gate.includes)) + '; invalidatedBy=' + (Format-VerificationSummaryArray @($gate.invalidatedBy)) + '; evidenceDestination=' + (Format-VerificationSummaryValue $gate.evidenceDestination))
    }
    $lines.Add('<!-- END GENERATED VERIFICATION POLICY SUMMARY -->')
    return ($lines -join "`n")
}
