import os
import time
import subprocess
from datetime import datetime, timedelta
import shutil
import heapq

HOME = os.path.expanduser('~')

print("="*60)
print("1. UNUSED APPLICATIONS (> 3 Months)")
print("="*60)
three_months_ago = datetime.now() - timedelta(days=90)
apps = []
for app_dir in ['/Applications', os.path.join(HOME, 'Applications')]:
    if not os.path.exists(app_dir): continue
    for app in os.listdir(app_dir):
        if app.endswith('.app'):
            app_path = os.path.join(app_dir, app)
            try:
                # mdls -name kMDItemLastUsedDate -raw "/Applications/App.app"
                output = subprocess.check_output(['mdls', '-name', 'kMDItemLastUsedDate', '-raw', app_path], text=True, stderr=subprocess.DEVNULL)
                if output == '(null)' or output.strip() == '':
                    apps.append(('1900-01-01', app_path)) # Sort never-used to the top
                else:
                    date_str = output.split(' +')[0]
                    last_used = datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
                    if last_used < three_months_ago:
                        apps.append((last_used.strftime("%Y-%m-%d"), app_path))
            except Exception:
                pass

apps.sort(key=lambda x: x[0])
for date, path in apps:
    display_date = "Never Used / Unknown" if date == '1900-01-01' else date
    print(f"[{display_date}] {path}")
print("\n")


print("="*60)
print("2. DELETING OLD NODE_MODULES (> 14 days)")
print("="*60)
two_weeks_ago = time.time() - (14 * 24 * 60 * 60)
deleted_size_total = 0

def get_dir_size(path):
    total = 0
    for dirpath, _, filenames in os.walk(path):
        for f in filenames:
            fp = os.path.join(dirpath, f)
            if not os.path.islink(fp):
                try:
                    total += os.path.getsize(fp)
                except Exception:
                    pass
    return total

search_dirs = [os.path.join(HOME, d) for d in ['Documents', 'Downloads', 'Desktop', 'gADK', 'Projects', 'src', 'newrepo']]

for s_dir in search_dirs:
    if not os.path.exists(s_dir): continue
    for root, dirs, files in os.walk(s_dir, topdown=True):
        if 'node_modules' in dirs:
            nm_path = os.path.join(root, 'node_modules')
            try:
                mtime = os.path.stat(nm_path).st_mtime
                if mtime < two_weeks_ago:
                    size = get_dir_size(nm_path)
                    shutil.rmtree(nm_path)
                    deleted_size_total += size
                    print(f"Deleted: {nm_path} ({size / (1024*1024):.2f} MB)")
            except Exception as e:
                print(f"Failed to process/delete {nm_path}: {e}")
            
            # Don't traverse inside node_modules regardless
            dirs.remove('node_modules')
            
        # skip other massive/unrelated dirs
        dirs[:] = [d for d in dirs if d not in {'.git', 'venv', 'env', '.venv', 'Pods', '.next', '.cache', 'build', 'dist', 'target'}]

print(f"\nTotal space freed from old node_modules: {deleted_size_total / (1024*1024):.2f} MB\n")


print("="*60)
print("3. NEXT 10 LARGEST FILES")
print("="*60)

largest = []
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

skip_dirs = {'node_modules', '.git', 'venv', 'env', '.venv', 'Pods', '.next', '.cache', 'build', 'dist', 'target', 'Caches'}

for root, dirs, files in os.walk(HOME, topdown=True):
    dirs[:] = [d for d in dirs if d not in skip_dirs]
    for f in files:
        try:
            path = os.path.join(root, f)
            if path in known_files: continue
            if not os.path.islink(path):
                size = os.path.getsize(path)
                if size > 10000000: # only consider >10 MB
                    if len(largest) < 10:
                        heapq.heappush(largest, (size, path))
                    elif size > largest[0][0]:
                        heapq.heapreplace(largest, (size, path))
        except Exception:
            pass
            
result = sorted(largest, reverse=True)
for size, path in result:
    print(f"{size / (1024*1024):.2f} MB: {path}")
