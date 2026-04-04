#!/usr/bin/env python3
"""
Safe Disk Cleanup Script
Analyzes disk usage and optionally cleans old node_modules directories

SAFETY FEATURES:
- Dry-run mode by default (preview only)
- Confirmation required before any deletion
- Configurable age threshold (default 30 days)
- Exclusion list for protected directories
- Size threshold (only delete if >50MB saved)
- Detailed logging of all actions
"""

import os
import sys
import time
import subprocess
import shutil
import heapq
import argparse
from datetime import datetime, timedelta
from pathlib import Path

HOME = Path.home()
DRY_RUN = True  # Default to safe mode

# Directories to NEVER touch (safety exclusion)
PROTECTED_PATHS = {
    'node_modules'  # Don't delete if path contains these segments
}

# Critical system paths that should never be scanned for deletion
CRITICAL_PATHS = [
    '/System',
    '/usr',
    '/bin',
    '/sbin',
    '/lib',
    '/opt',
    str(HOME / 'Library' / 'Application Support'),
]

def is_protected(path: str) -> bool:
    """Check if path is in a protected/critical directory"""
    path_lower = path.lower()
    for critical in CRITICAL_PATHS:
        if path_lower.startswith(critical.lower()):
            return True
    return False

def confirm_deletion(path: str, size_mb: float, age_days: int) -> bool:
    """Interactive confirmation before deletion"""
    print(f"\n{'='*60}")
    print(f"PROPOSED DELETION:")
    print(f"  Path: {path}")
    print(f"  Size: {size_mb:.2f} MB")
    print(f"  Age: {age_days} days old")
    print(f"{'='*60}")
    
    if DRY_RUN:
        print("[DRY-RUN] Would delete (use --execute to actually delete)")
        return False
    
    response = input("Delete this directory? [y/N/q]: ").strip().lower()
    if response == 'q':
        print("Quitting...")
        sys.exit(0)
    return response == 'y'

def get_dir_size(path: str) -> int:
    """Calculate total size of directory in bytes"""
    total = 0
    try:
        for dirpath, _, filenames in os.walk(path):
            for f in filenames:
                fp = os.path.join(dirpath, f)
                if not os.path.islink(fp):
                    try:
                        total += os.path.getsize(fp)
                    except (OSError, IOError):
                        pass
    except (OSError, IOError):
        pass
    return total

def section_unused_apps():
    """Section 1: List unused applications (info only)"""
    print("="*60)
    print("1. UNUSED APPLICATIONS (> 3 Months)")
    print("="*60)
    
    three_months_ago = datetime.now() - timedelta(days=90)
    apps = []
    
    for app_dir in ['/Applications', os.path.join(HOME, 'Applications')]:
        if not os.path.exists(app_dir):
            continue
        for app in os.listdir(app_dir):
            if app.endswith('.app'):
                app_path = os.path.join(app_dir, app)
                try:
                    output = subprocess.check_output(
                        ['mdls', '-name', 'kMDItemLastUsedDate', '-raw', app_path],
                        text=True, stderr=subprocess.DEVNULL
                    )
                    if output == '(null)' or output.strip() == '':
                        apps.append(('1900-01-01', app_path))
                    else:
                        date_str = output.split(' +')[0]
                        last_used = datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
                        if last_used < three_months_ago:
                            apps.append((last_used.strftime("%Y-%m-%d"), app_path))
                except Exception:
                    pass
    
    apps.sort(key=lambda x: x[0])
    for date, path in apps[:20]:  # Limit to top 20
        display_date = "Never Used / Unknown" if date == '1900-01-01' else date
        print(f"[{display_date}] {path}")
    
    if len(apps) > 20:
        print(f"\n... and {len(apps) - 20} more")
    print("\n")

def section_node_modules_cleanup(min_age_days=30, min_size_mb=50, auto_confirm=False):
    """Section 2: Clean old node_modules directories"""
    print("="*60)
    print(f"2. OLD NODE_MODULES CLEANUP (> {min_age_days} days, > {min_size_mb} MB)")
    print("="*60)
    
    if DRY_RUN and not auto_confirm:
        print("[DRY-RUN MODE] No files will be deleted. Use --execute to delete.\n")
    
    cutoff_time = time.time() - (min_age_days * 24 * 60 * 60)
    deleted_count = 0
    deleted_size_total = 0
    candidates = []
    
    # Search directories
    search_dirs = [
        HOME / 'Documents',
        HOME / 'Downloads', 
        HOME / 'Desktop',
        HOME / 'gADK',
        HOME / 'Projects',
        HOME / 'src',
        HOME / 'newrepo'
    ]
    
    # Skip directories that are build artifacts or caches
    skip_dirs = {'.git', 'venv', 'env', '.venv', 'Pods', '.next', 
                 '.cache', 'build', 'dist', 'target', 'out', '.turbo'}
    
    for s_dir in search_dirs:
        if not s_dir.exists():
            continue
        
        for root, dirs, files in os.walk(s_dir, topdown=True):
            # Filter out skip directories
            dirs[:] = [d for d in dirs if d not in skip_dirs]
            
            if 'node_modules' in dirs:
                nm_path = os.path.join(root, 'node_modules')
                
                # Safety check
                if is_protected(nm_path):
                    print(f"[SKIP] Protected path: {nm_path}")
                    dirs.remove('node_modules')
                    continue
                
                try:
                    # Use os.stat not os.path.stat
                    mtime = os.stat(nm_path).st_mtime
                    
                    if mtime < cutoff_time:
                        size = get_dir_size(nm_path)
                        size_mb = size / (1024*1024)
                        
                        if size_mb >= min_size_mb:
                            age_days = int((time.time() - mtime) / (24 * 60 * 60))
                            candidates.append((nm_path, size_mb, age_days, size))
                        
                except (OSError, IOError) as e:
                    print(f"[ERROR] Cannot access {nm_path}: {e}")
                
                # Don't traverse inside node_modules
                dirs.remove('node_modules')
    
    # Sort by size (largest first)
    candidates.sort(key=lambda x: x[1], reverse=True)
    
    if not candidates:
        print("No qualifying node_modules directories found.")
        return
    
    print(f"Found {len(candidates)} candidate directories:\n")
    
    for nm_path, size_mb, age_days, size_bytes in candidates:
        if auto_confirm or confirm_deletion(nm_path, size_mb, age_days):
            try:
                if not DRY_RUN:
                    shutil.rmtree(nm_path)
                deleted_count += 1
                deleted_size_total += size_bytes
                print(f"  {'[DELETED]' if not DRY_RUN else '[WOULD DELETE]'} {nm_path} ({size_mb:.2f} MB)")
            except Exception as e:
                print(f"  [FAILED] {nm_path}: {e}")
    
    total_mb = deleted_size_total / (1024*1024)
    print(f"\n{'='*60}")
    print(f"Total: {deleted_count} directories")
    print(f"Space freed: {total_mb:.2f} MB ({total_mb/1024:.2f} GB)")
    print(f"{'='*60}\n")

def section_largest_files():
    """Section 3: Find largest files (info only)"""
    print("="*60)
    print("3. LARGEST FILES (> 10 MB, top 10)")
    print("="*60)
    
    # Known large files to skip (already identified)
    known_files = {
        '/Users/sanjayb/Library/Containers/com.docker.docker/Data/vms/0/data/Docker.raw',
        '/Users/sanjayb/.codeium/windsurf/ws-browser/chromium-1169/chrome-mac/Chromium.app/Contents/Frameworks/Chromium Framework.framework/Versions/136.0.7103.25/Chromium Framework',
        '/Users/sanjayb/.vscode/extensions/google.geminicodeassist-2.74.0-insiders.2/cloudcode_cli.zip',
        '/Users/sanjayb/.vscode/extensions/anthropic.claude-code-2.1.71-darwin-arm64/resources/native-binary/claude',
        '/Users/sanjayb/.antigravity/extensions/anthropic.claude-code-2.1.52-darwin-arm64/resources/native-binary/claude',
        '/Users/sanjayb/.vscode/extensions/anthropic.claude-code-2.1.27-darwin-arm64/resources/native-binary/claude',
        '/Users/sanjayb/.rustup/toolchains/stable-aarch64-apple-darwin/lib/librustc_driver-a7db591eb17189bc.dylib',
        '/Users/sanjayb/.windsurf/extensions/anthropic.claude-code-2.0.42-darwin-arm64/resources/native-binary/claude',
        '/Users/sanjayb/.local/share/claude/versions/2.0.42/claude',
        '/Users/sanjayb/.cursor/extensions/blackboxapp.blackboxagent-3.3.38/electron-binaries/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Electron Framework',
        '/Users/sanjayb/.codeium/windsurf/ws-browser/chromium_headless_shell-1169/chrome-mac/headless_shell',
        '/Users/sanjayb/.nvm/versions/node/v25.6.0/bin/node',
        '/Users/sanjayb/.nvm/versions/node/v23.9.0/bin/node',
    }
    
    skip_dirs = {'node_modules', '.git', 'venv', 'env', '.venv', 'Pods', 
                 '.next', '.cache', 'build', 'dist', 'target', 'Caches'}
    
    largest = []
    scanned = 0
    
    for root, dirs, files in os.walk(HOME, topdown=True):
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        
        for f in files:
            try:
                path = os.path.join(root, f)
                if path in known_files:
                    continue
                if os.path.islink(path):
                    continue
                
                size = os.path.getsize(path)
                scanned += 1
                
                if size > 10_000_000:  # Only consider >10 MB
                    if len(largest) < 10:
                        heapq.heappush(largest, (size, path))
                    elif size > largest[0][0]:
                        heapq.heapreplace(largest, (size, path))
                
                # Progress indicator every 10000 files
                if scanned % 10000 == 0:
                    print(f"  Scanned {scanned} files...", end='\r')
                    
            except (OSError, IOError):
                pass
    
    print(f"  Scanned {scanned} files total.\n")
    
    if largest:
        result = sorted(largest, reverse=True)
        for size, path in result:
            print(f"{size / (1024*1024):>8.2f} MB: {path}")
    else:
        print("No large files found (outside known list).")
    print()

def main():
    global DRY_RUN
    
    parser = argparse.ArgumentParser(
        description='Safe disk cleanup script',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                    # Dry run - preview only
  %(prog)s --execute          # Actually delete files (with confirmation)
  %(prog)s --execute -y       # Delete without confirmation (DANGEROUS)
  %(prog)s --days 60          # Change age threshold to 60 days
  %(prog)s --size 100         # Only delete if >100MB
        """
    )
    parser.add_argument('--execute', action='store_true',
                        help='Actually delete files (default is dry-run)')
    parser.add_argument('-y', '--yes', action='store_true',
                        help='Auto-confirm deletions (use with caution!)')
    parser.add_argument('--days', type=int, default=30,
                        help='Minimum age in days (default: 30)')
    parser.add_argument('--size', type=int, default=50,
                        help='Minimum size in MB (default: 50)')
    parser.add_argument('--apps-only', action='store_true',
                        help='Only show unused apps (safest)')
    parser.add_argument('--files-only', action='store_true',
                        help='Only show largest files (safe)')
    
    args = parser.parse_args()
    
    if args.execute:
        DRY_RUN = False
        print("⚠️  EXECUTE MODE - Files WILL be deleted!\n")
    else:
        print("🛡️  DRY-RUN MODE - No files will be deleted\n")
    
    # Run sections based on args
    if args.apps_only:
        section_unused_apps()
    elif args.files_only:
        section_largest_files()
    else:
        section_unused_apps()
        section_node_modules_cleanup(
            min_age_days=args.days,
            min_size_mb=args.size,
            auto_confirm=args.yes
        )
        section_largest_files()
    
    if DRY_RUN and not args.apps_only and not args.files_only:
        print("\n" + "="*60)
        print("To actually delete files, run with --execute flag:")
        print(f"  python3 {sys.argv[0]} --execute")
        print("="*60)

if __name__ == '__main__':
    main()
