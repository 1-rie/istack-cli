# /setup-ios-deploy

**Role:** DevOps Engineer  
**Stage:** Ship (one-time setup)  
**Reads:** existing project structure, Xcode project settings  
**Writes:** `Gemfile`, `fastlane/Appfile`, `fastlane/Fastfile`, `.github/workflows/testflight.yml`  
**Feeds into:** `/ship-ios` every time it runs

One-time setup. Run once per project. After this, `/ship-ios` runs without manual ceremony.

---

## Phase 0 — Prerequisites check

```bash
# Xcode CLI tools
xcode-select -p && echo "✅ Xcode CLI tools" || echo "❌ Run: xcode-select --install"

# Ruby/Bundler
ruby --version && echo "✅ Ruby"
bundler --version 2>/dev/null && echo "✅ Bundler" || echo "⚠️  Bundler not installed"

# Fastlane
fastlane --version 2>/dev/null && echo "✅ Fastlane $(fastlane --version | head -1)" || echo "⚠️  Fastlane not installed"

# GitHub CLI (for secrets setup)
gh --version 2>/dev/null && echo "✅ gh CLI" || echo "⚠️  gh CLI not installed (optional but helpful)"
```

Install Fastlane via Bundler (pins the version — team always uses same version):

```bash
cat > Gemfile << 'EOF'
source "https://rubygems.org"
gem "fastlane"
gem "xcpretty"
EOF

bundle install
```

---

## Phase 1 — Project detection

```bash
# Get bundle ID
PLIST=$(find . -name "Info.plist" | grep -v Pods | head -1)
BUNDLE_ID=$(/usr/libexec/PlistBuddy -c "Print CFBundleIdentifier" "$PLIST" 2>/dev/null)
echo "Bundle ID: $BUNDLE_ID"

# Get scheme
WORKSPACE=$(ls *.xcworkspace 2>/dev/null | head -1)
PROJECT=$(ls *.xcodeproj 2>/dev/null | head -1)
PROJ_ARG=""
[ -n "$WORKSPACE" ] && PROJ_ARG="-workspace $WORKSPACE" || PROJ_ARG="-project $PROJECT"
SCHEME=$(xcodebuild $PROJ_ARG -list 2>/dev/null | grep -A 20 "Schemes:" | grep -v "Schemes:" | head -1 | xargs)
echo "Scheme: $SCHEME"
```

Ask user:
- "Your Apple ID email for App Store Connect?"
- "Is this app on an Individual account or Organization? (for team IDs)"
- "Do you have a separate GitHub repo for certificates (for match)? If not, I'll help you create one."

---

## Phase 2 — Initialize Fastlane

```bash
# Init with TestFlight option
bundle exec fastlane init
# Choose: 2 (Automate beta distribution to TestFlight)
# Enter bundle ID when prompted
# Enter Apple ID when prompted
```

This creates `fastlane/Appfile` and `fastlane/Fastfile`.

Update `fastlane/Appfile`:
```ruby
app_identifier("[BUNDLE_ID]")
apple_id("[APPLE_ID]")
itc_team_id("[ITC_TEAM_ID]")   # From App Store Connect → Users → your account
team_id("[TEAM_ID]")            # From developer.apple.com → Membership
```

---

## Phase 3 — Setup match (code signing)

match stores certificates and provisioning profiles in an encrypted private git repo. This means any machine (including CI) can sign the app with one command.

```bash
# Create match config
bundle exec fastlane match init
# Choose: git
# Enter: URL of a PRIVATE git repo for certificates
# (Create one at github.com/new — make it private, name it [app]-certificates)
```

Create certificates:
```bash
# Development certificates
bundle exec fastlane match development

# App Store distribution certificates  
bundle exec fastlane match appstore
```

**Save the match passphrase securely** — you'll need it as a GitHub secret.

---

## Phase 4 — Write Fastfile

```ruby
# fastlane/Fastfile
default_platform(:ios)

platform :ios do

  desc "Run tests on simulator"
  lane :test do
    run_tests(
      scheme: "[SCHEME]",
      devices: ["iPhone 16"],
      clean: true,
      result_bundle: true,
      output_directory: ".iStack/current/artifacts/test-results"
    )
  end

  desc "Build and upload to TestFlight"
  lane :beta do
    # Pre-flight checks
    ensure_git_status_clean
    git_pull

    # Sync certificates
    match(type: "appstore", readonly: is_ci)

    # Increment build number
    increment_build_number(
      build_number: latest_testflight_build_number + 1
    )
    
    # Build
    build_app(
      scheme: "[SCHEME]",
      configuration: "Release",
      export_method: "app-store",
      output_directory: "./build",
      output_name: "App.ipa",
      clean: true
    )

    # Upload
    upload_to_testflight(
      skip_waiting_for_build_processing: true,
      changelog: changelog_from_git_commits(
        commits_count: 10,
        pretty: "- %s"
      )
    )

    # Tag
    add_git_tag(
      tag: "v#{get_version_number}/#{get_build_number}"
    )
    push_git_tags

    # Update docs
    notification(subtitle: "TestFlight", message: "Build uploaded successfully")
  end

  desc "Full CI pipeline: test → beta"
  lane :ci do
    test
    beta
  end

end
```

---

## Phase 5 — App Store Connect API Key

Using an API key is more secure and reliable than an Apple ID + password (which requires app-specific passwords and is affected by 2FA).

1. Go to: App Store Connect → Users and Access → Integrations → API Keys
2. Click + to generate a new key
3. Role: Developer (sufficient for TestFlight uploads)
4. Download the `.p8` file — **only downloadable once**
5. Note the Key ID and Issuer ID

Add to Fastfile:
```ruby
# Add before lanes
app_store_connect_api_key(
  key_id: ENV["APP_STORE_CONNECT_API_KEY_ID"],
  issuer_id: ENV["APP_STORE_CONNECT_API_ISSUER_ID"],
  key_content: ENV["APP_STORE_CONNECT_API_KEY_CONTENT"],
  is_key_content_base64: false
)
```

---

## Phase 6 — GitHub Actions workflow

```bash
mkdir -p .github/workflows
```

```yaml
# .github/workflows/testflight.yml
name: TestFlight

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      notes:
        description: 'Release notes'
        required: false
        default: ''

concurrency:
  group: testflight
  cancel-in-progress: false  # Never cancel a build in flight

jobs:
  deploy:
    name: Build & Upload to TestFlight
    runs-on: macos-15
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.3'
          bundler-cache: true

      - name: Setup Xcode
        uses: maxim-lobanov/setup-xcode@v1
        with:
          xcode-version: latest-stable

      - name: Run Tests
        run: bundle exec fastlane test

      - name: Upload to TestFlight
        env:
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
          MATCH_GIT_BASIC_AUTHORIZATION: ${{ secrets.MATCH_GIT_BASIC_AUTHORIZATION }}
          APP_STORE_CONNECT_API_KEY_ID: ${{ secrets.APP_STORE_CONNECT_API_KEY_ID }}
          APP_STORE_CONNECT_API_ISSUER_ID: ${{ secrets.APP_STORE_CONNECT_API_ISSUER_ID }}
          APP_STORE_CONNECT_API_KEY_CONTENT: ${{ secrets.APP_STORE_CONNECT_API_KEY_CONTENT }}
          FASTLANE_XCODEBUILD_SETTINGS_TIMEOUT: "120"
        run: bundle exec fastlane beta

      - name: Upload build artifacts on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: fastlane-logs
          path: |
            fastlane/report.xml
            fastlane/logs/
```

---

## Phase 7 — Add GitHub Secrets

```bash
# Set secrets via gh CLI (if installed)
if command -v gh &>/dev/null; then
  echo "Setting GitHub secrets..."
  
  # Match passphrase
  read -s -p "Match passphrase: " MATCH_PASS
  echo "$MATCH_PASS" | gh secret set MATCH_PASSWORD
  
  # Match git auth (base64 of "username:personal_access_token")
  read -p "GitHub username for certificates repo: " GH_USER
  read -s -p "GitHub personal access token: " GH_TOKEN
  echo -n "$GH_USER:$GH_TOKEN" | base64 | gh secret set MATCH_GIT_BASIC_AUTHORIZATION
  
  echo "API key secrets — enter from App Store Connect:"
  read -p "Key ID: " KEY_ID
  echo "$KEY_ID" | gh secret set APP_STORE_CONNECT_API_KEY_ID
  
  read -p "Issuer ID: " ISSUER_ID
  echo "$ISSUER_ID" | gh secret set APP_STORE_CONNECT_API_ISSUER_ID
  
  read -p "Path to .p8 file: " P8_PATH
  cat "$P8_PATH" | gh secret set APP_STORE_CONNECT_API_KEY_CONTENT
  
  echo "✅ All secrets set"
else
  echo "Set these secrets manually in GitHub → Settings → Secrets → Actions:"
  echo "  MATCH_PASSWORD"
  echo "  MATCH_GIT_BASIC_AUTHORIZATION  (base64 of 'username:token')"
  echo "  APP_STORE_CONNECT_API_KEY_ID"
  echo "  APP_STORE_CONNECT_API_ISSUER_ID"
  echo "  APP_STORE_CONNECT_API_KEY_CONTENT"
fi
```

---

## Phase 8 — Verify locally

```bash
# Test the full pipeline locally before trusting CI
bundle exec fastlane test
echo "Tests: $?"

bundle exec fastlane beta
echo "Beta: $?"
```

---

## Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DEPLOY SETUP COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Fastlane:         ✅ Configured
Match:            ✅ Certificates synced (development + appstore)
GitHub Actions:   ✅ .github/workflows/testflight.yml
GitHub Secrets:   ✅ All set / ⚠️ Set manually: [list]

HOW IT WORKS:
→ Push to main → GitHub Actions → tests run → if green → TestFlight upload
→ Manual: Actions tab → TestFlight → Run workflow

WHAT TO RUN FROM NOW ON:
→ /ship-ios  (local, when you want to push immediately)
→ git push   (CI handles it automatically)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
