# Nyuchi Platform - Environment Setup Script (PowerShell)
# This script helps set up the basic environment configuration

Write-Host "🚀 Setting up Nyuchi Platform environment..." -ForegroundColor Green
Write-Host ""

# Check if .env.local already exists
if (Test-Path ".env.local") {
    Write-Host "⚠️  .env.local already exists!" -ForegroundColor Yellow
    $response = Read-Host "Do you want to overwrite it? (y/N)"
    if ($response -notmatch "^[Yy]$") {
        Write-Host "Setup cancelled." -ForegroundColor Red
        exit 1
    }
}

# Copy template
Write-Host "📋 Copying environment template..." -ForegroundColor Blue
Copy-Item "env.example" ".env.local"

# Generate secure secrets
Write-Host "🔐 Generating secure secrets..." -ForegroundColor Blue

# Generate random strings for secrets
function Generate-RandomString {
    param([int]$length = 32)
    return [System.Web.Security.Membership]::GeneratePassword($length, 0)
}

try {
    Add-Type -AssemblyName 'System.Web'
    
    $jwtSecret = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Generate-RandomString -length 32)))
    $apiSecret = -join ((1..32) | ForEach {'{0:X}' -f (Get-Random -Maximum 16)})
    
    # Update the template with generated secrets
    $content = Get-Content ".env.local" -Raw
    $content = $content -replace "your-super-secure-jwt-secret-at-least-32-characters-long", $jwtSecret
    $content = $content -replace "your-api-secret-key", $apiSecret
    Set-Content ".env.local" $content
    
    Write-Host "✅ Generated secure JWT and API secrets" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not generate secrets automatically. You'll need to manually set JWT_SECRET and API_SECRET_KEY" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Edit .env.local and update the placeholder values"
Write-Host "2. Get your Supabase credentials from https://supabase.com"
Write-Host "3. Set up Cloudflare D1 database: npx wrangler d1 create nyuchi-platform-db"
Write-Host "4. Configure payment providers (Paynow, Stripe)"
Write-Host "5. Run: npm run dev"
Write-Host ""
Write-Host "📖 For detailed setup instructions, see: docs/ENVIRONMENT_SETUP.md" -ForegroundColor Gray
Write-Host ""
Write-Host "✨ Environment template created at .env.local" -ForegroundColor Green
