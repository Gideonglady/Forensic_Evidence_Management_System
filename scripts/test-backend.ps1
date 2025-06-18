Write-Host "🧪 Testing Backend Endpoints..." -ForegroundColor Green
Write-Host ""

try {
    # Test root endpoint
    Write-Host "1. Testing root endpoint..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "http://localhost:8000/" -Method Get
    Write-Host "✅ Root endpoint response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3
    Write-Host ""

    # Test health status
    Write-Host "2. Testing health status..." -ForegroundColor Yellow
    if ($response.status -eq "healthy") {
        Write-Host "✅ Backend is healthy!" -ForegroundColor Green
    } else {
        Write-Host "❌ Backend health check failed" -ForegroundColor Red
    }
    Write-Host ""

    Write-Host "🎉 Backend tests completed successfully!" -ForegroundColor Green
    Write-Host "📱 You can now start the Expo app with: npm start" -ForegroundColor Cyan
    Write-Host "🔧 Backend is running on: http://localhost:8000" -ForegroundColor Cyan

} catch {
    Write-Host "❌ Backend test failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Make sure the backend is running:" -ForegroundColor Yellow
    Write-Host "   npm run backend" -ForegroundColor Cyan
} 