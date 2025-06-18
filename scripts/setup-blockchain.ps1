Write-Host "🔗 Setting up Blockchain Environment..." -ForegroundColor Green
Write-Host ""

# Check if Ganache is running
Write-Host "1. Checking if Ganache is running..." -ForegroundColor Yellow
$ganacheRunning = netstat -an | findstr ":8545" | findstr "LISTENING"

if ($ganacheRunning) {
    Write-Host "✅ Ganache is already running on port 8545" -ForegroundColor Green
} else {
    Write-Host "❌ Ganache is not running" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 To start Ganache:" -ForegroundColor Yellow
    Write-Host "1. Open Ganache application" -ForegroundColor Cyan
    Write-Host "2. Click 'Start' or 'Quickstart'" -ForegroundColor Cyan
    Write-Host "3. Make sure it's running on port 8545" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Press any key after starting Ganache..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# Check if contract is deployed
Write-Host ""
Write-Host "2. Checking if contract is deployed..." -ForegroundColor Yellow
$contractFile = "backend/contract_info.json"

if (Test-Path $contractFile) {
    Write-Host "✅ Contract info file exists" -ForegroundColor Green
    $contractInfo = Get-Content $contractFile | ConvertFrom-Json
    Write-Host "   Contract Address: $($contractInfo.address)" -ForegroundColor Cyan
} else {
    Write-Host "❌ Contract not deployed" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Deploying contract..." -ForegroundColor Yellow
    
    try {
        npm run blockchain:deploy
        Write-Host "✅ Contract deployed successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to deploy contract" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test blockchain connection
Write-Host ""
Write-Host "3. Testing blockchain connection..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://192.168.0.4:8000/blockchain-status" -Method Get -TimeoutSec 5
    if ($response.status -eq "connected") {
        Write-Host "✅ Blockchain connection successful" -ForegroundColor Green
        Write-Host "   Network: $($response.network)" -ForegroundColor Cyan
        Write-Host "   Contract: $($response.contract_address)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Blockchain connection failed" -ForegroundColor Red
        Write-Host "   Status: $($response.status)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Cannot test blockchain connection" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Blockchain Setup Complete!" -ForegroundColor Green
Write-Host "=================================================="
Write-Host ""
Write-Host "📱 Your app can now:" -ForegroundColor Cyan
Write-Host "✅ Upload multiple photos at once" -ForegroundColor Green
Write-Host "✅ Store photo hashes on blockchain" -ForegroundColor Green
Write-Host "✅ View real transaction hashes" -ForegroundColor Green
Write-Host "✅ See block numbers in Ganache" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Try uploading photos in your app now!" -ForegroundColor Yellow 