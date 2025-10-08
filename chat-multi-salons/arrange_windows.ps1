Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class WinAPI {
    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
    
    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
    
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    
    public const uint SWP_SHOWWINDOW = 0x0040;
    public const uint SWP_NOZORDER = 0x0004;
    public const int SW_RESTORE = 9;
}
"@

Add-Type -AssemblyName System.Windows.Forms

$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$screenWidth = $screen.Width
$screenHeight = $screen.Height

# Calculate dimensions for 3 windows side by side
$windowWidth = [math]::Floor($screenWidth / 3)
$windowHeight = $screenHeight - 40  # Account for taskbar

Write-Host "Screen: $screenWidth x $screenHeight"
Write-Host "Each window: $windowWidth x $windowHeight"
Write-Host ""

# Wait a moment for windows to settle
Start-Sleep -Milliseconds 500

# Get Firefox windows
$firefoxWindows = Get-Process firefox -ErrorAction SilentlyContinue | 
    Where-Object { $_.MainWindowHandle -ne 0 -and [WinAPI]::IsWindowVisible($_.MainWindowHandle) } |
    Sort-Object StartTime |
    Select-Object -Last 3

Write-Host "Found $($firefoxWindows.Count) Firefox windows"

if ($firefoxWindows.Count -lt 3) {
    Write-Host "⚠ Warning: Only found $($firefoxWindows.Count) windows. Expected 3." -ForegroundColor Yellow
    Write-Host "Try increasing the timeout in the batch file."
    Read-Host "Press Enter to continue anyway"
}

# Arrange each window
for ($i = 0; $i -lt [Math]::Min(3, $firefoxWindows.Count); $i++) {
    $window = $firefoxWindows[$i]
    $handle = $window.MainWindowHandle
    $x = $i * $windowWidth
    
    Write-Host "Window $($i+1): Moving to X=$x"
    
    # First restore the window (in case it's maximized)
    [WinAPI]::ShowWindow($handle, [WinAPI]::SW_RESTORE) | Out-Null
    Start-Sleep -Milliseconds 100
    
    # Now position it
    $result = [WinAPI]::SetWindowPos(
        $handle,
        [IntPtr]::Zero,
        $x,
        0,
        $windowWidth,
        $windowHeight,
        [WinAPI]::SWP_SHOWWINDOW -bor [WinAPI]::SWP_NOZORDER
    )
    
    if ($result) {
        Write-Host "  ✓ Success" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Failed" -ForegroundColor Red
    }
    
    Start-Sleep -Milliseconds 200
}

Write-Host ""
Write-Host "Done! Windows should now be arranged side by side." -ForegroundColor Cyan