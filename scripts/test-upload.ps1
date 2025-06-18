Write-Host "🧪 Testing Photo Upload Endpoint..." -ForegroundColor Green
Write-Host ""

try {
    # Test the upload endpoint with a simple request
    Write-Host "1. Testing upload endpoint availability..." -ForegroundColor Yellow
    
    $uri = "http://192.168.0.4:8000/process-photo"
    Write-Host "Endpoint: $uri" -ForegroundColor Cyan
    
    # Create a simple test request
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    
    $bodyLines = (
        "--$boundary",
        "Content-Disposition: form-data; name=`"caseNumber`"",
        "",
        "TEST_CASE_001",
        "--$boundary",
        "Content-Disposition: form-data; name=`"photo`"; filename=`"test.jpg`"",
        "Content-Type: image/jpeg",
        "",
        "fake_image_data",
        "--$boundary--"
    ) -join $LF
    
    $headers = @{
        "Content-Type" = "multipart/form-data; boundary=$boundary"
    }
    
    Write-Host "2. Sending test upload request..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri $uri -Method Post -Body $bodyLines -Headers $headers
    
    Write-Host "✅ Upload endpoint is working!" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Upload test failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Troubleshooting tips:" -ForegroundColor Yellow
    Write-Host "1. Make sure the backend is running: npm run backend" -ForegroundColor Cyan
    Write-Host "2. Check if the IP address is correct: 192.168.0.4" -ForegroundColor Cyan
    Write-Host "3. Ensure your device/emulator is on the same network" -ForegroundColor Cyan
} 