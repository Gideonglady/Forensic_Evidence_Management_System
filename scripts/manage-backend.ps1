param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("status", "start", "stop", "restart")]
    [string]$Action = "status"
)

Write-Host "🔧 Backend Management Script" -ForegroundColor Green
Write-Host ""

function Get-BackendStatus {
    $processes = Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -eq "python" }
    $port8000 = netstat -an | findstr ":8000" | findstr "LISTENING"
    
    if ($port8000) {
        Write-Host "✅ Backend Status: RUNNING" -ForegroundColor Green
        Write-Host "   Port 8000 is listening" -ForegroundColor Cyan
        Write-Host "   URL: http://192.168.0.4:8000" -ForegroundColor Cyan
        
        # Test the endpoint
        try {
            $response = Invoke-RestMethod -Uri "http://192.168.0.4:8000/" -Method Get -TimeoutSec 5
            Write-Host "   Health Check: ✅ Healthy" -ForegroundColor Green
        } catch {
            Write-Host "   Health Check: ❌ Not responding" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Backend Status: NOT RUNNING" -ForegroundColor Red
        Write-Host "   Port 8000 is not listening" -ForegroundColor Yellow
    }
}

function Start-Backend {
    Write-Host "🚀 Starting Backend..." -ForegroundColor Yellow
    
    # Check if already running
    $port8000 = netstat -an | findstr ":8000" | findstr "LISTENING"
    if ($port8000) {
        Write-Host "⚠️  Backend is already running on port 8000" -ForegroundColor Yellow
        return
    }
    
    # Start the backend
    Start-Process -FilePath "python" -ArgumentList "main.py" -WorkingDirectory "backend" -WindowStyle Minimized
    Write-Host "✅ Backend started in background" -ForegroundColor Green
    Write-Host "   Wait a few seconds for it to fully start..." -ForegroundColor Cyan
    
    # Wait and check status
    Start-Sleep -Seconds 3
    Get-BackendStatus
}

function Stop-Backend {
    Write-Host "🛑 Stopping Backend..." -ForegroundColor Yellow
    
    # Find Python processes that might be running the backend
    $processes = Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -eq "python" }
    
    if ($processes) {
        foreach ($process in $processes) {
            try {
                $process.Kill()
                Write-Host "✅ Stopped Python process (PID: $($process.Id))" -ForegroundColor Green
            } catch {
                Write-Host "⚠️  Could not stop process (PID: $($process.Id))" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "ℹ️  No Python processes found" -ForegroundColor Cyan
    }
    
    # Check if port is still in use
    Start-Sleep -Seconds 2
    $port8000 = netstat -an | findstr ":8000" | findstr "LISTENING"
    if (-not $port8000) {
        Write-Host "✅ Port 8000 is now free" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Port 8000 is still in use" -ForegroundColor Yellow
    }
}

function Restart-Backend {
    Write-Host "🔄 Restarting Backend..." -ForegroundColor Yellow
    Stop-Backend
    Start-Sleep -Seconds 2
    Start-Backend
}

# Main execution
switch ($Action) {
    "status" { Get-BackendStatus }
    "start" { Start-Backend }
    "stop" { Stop-Backend }
    "restart" { Restart-Backend }
}

Write-Host ""
Write-Host "📋 Usage:" -ForegroundColor Cyan
Write-Host "   .\scripts\manage-backend.ps1 status    - Check backend status" -ForegroundColor White
Write-Host "   .\scripts\manage-backend.ps1 start     - Start backend" -ForegroundColor White
Write-Host "   .\scripts\manage-backend.ps1 stop      - Stop backend" -ForegroundColor White
Write-Host "   .\scripts\manage-backend.ps1 restart   - Restart backend" -ForegroundColor White 