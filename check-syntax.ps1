$errors = $null
$tokens = $null
[System.Management.Automation.Language.Parser]::ParseFile(
    'D:\Projekte\git\mp3-transcriber-app\.powershell-aliases.ps1',
    [ref]$tokens,
    [ref]$errors
) | Out-Null

if ($errors.Count -gt 0) {
    $errors | ForEach-Object {
        Write-Host "Zeile $($_.Extent.StartLineNumber): $($_.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "Keine Parse-Fehler" -ForegroundColor Green
}
