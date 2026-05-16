# /design-swiftui

**Role:** Design Engineer
**Stage:** Build
**Reads:** `.iStack/<app-slug>/manifest.json`, `.iStack/<app-slug>/docs/PRODUCT.md`, `.iStack/<app-slug>/docs/DESIGN.md`, `.iStack/<app-slug>/artifacts/plans/design-review-*.md`, existing design system
**Writes:** `.swift` view files, `#Preview` macros, asset catalog entries
**Feeds into:** `/review`, `/qa-ios`

Not demo code. Not "a starting point." Production SwiftUI that ships.

The difference between AI-generated SwiftUI and production SwiftUI is: all states are implemented, every interaction is accessible, Dark Mode works, Dynamic Type doesn't break the layout, and the previews actually run.

---

## Before writing a single line

Read in this order:
1. `.iStack/<app-slug>/manifest.json` — product bible, stable features, targets, marketing axes
2. `.iStack/<app-slug>/docs/PRODUCT.md` — product context, core insight, target user
3. `.iStack/<app-slug>/docs/DESIGN.md` — visual system, colors, typography, component feel
4. `.iStack/<app-slug>/artifacts/plans/design-review-*.md` — design decisions already made
5. Existing view files for established patterns in this codebase
6. `CLAUDE.md` for project-specific rules

If none of these exist: ask for a description before proceeding.

---

## Architecture rules

### ViewModel pattern (@Observable)

```swift
// Every non-trivial view gets a ViewModel
@Observable
final class MyFeatureViewModel {
    // State — all on MainActor
    var items: [Item] = []
    var viewState: ViewState = .loading
    var errorMessage: String?

    enum ViewState {
        case loading
        case loaded
        case empty
        case error
    }

    // Actions
    func loadData() async {
        viewState = .loading
        do {
            items = try await service.fetch()
            viewState = items.isEmpty ? .empty : .loaded
        } catch {
            errorMessage = error.localizedDescription
            viewState = .error
        }
    }
}

// In view:
struct MyFeatureView: View {
    @State private var viewModel = MyFeatureViewModel()

    var body: some View {
        content
            .task { await viewModel.loadData() }
    }
}
```

### Never in view body
- Network calls
- Heavy computation
- Sorting/filtering large arrays
- Date formatting (use a cached formatter)

All of these belong in the ViewModel or a dedicated service.

---

## The four states — always all four

Every data-driven view implements all four. No exceptions.

```swift
private var content: some View {
    switch viewModel.viewState {
    case .loading:
        loadingView
    case .loaded:
        loadedView
    case .empty:
        emptyStateView
    case .error:
        errorView
    }
}

// Loading: skeleton or progress, never a blank screen
private var loadingView: some View {
    VStack(spacing: 16) {
        ForEach(0..<4) { _ in
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.secondary.opacity(0.15))
                .frame(height: 72)
                .shimmer() // or ProgressView() if no skeleton
        }
    }
    .padding(.horizontal, 16)
}

// Empty: always has a call-to-action, never just blank
private var emptyStateView: some View {
    ContentUnavailableView(
        "No [items] yet",
        systemImage: "tray",
        description: Text("Tap + to add your first [item].")
    )
    // iOS 17+: use ContentUnavailableView
    // iOS 16: custom VStack with Image + Text + Button
}

// Error: tells user what happened AND what to do
private var errorView: some View {
    ContentUnavailableView {
        Label("Couldn't load [items]", systemImage: "exclamationmark.triangle")
    } description: {
        Text(viewModel.errorMessage ?? "Check your connection and try again.")
    } actions: {
        Button("Try Again") {
            Task { await viewModel.loadData() }
        }
        .buttonStyle(.borderedProminent)
    }
}
```

---

## Typography — always Dynamic Type

```swift
// ✅ Correct: respects Dynamic Type
Text("Title").font(.title)
Text("Body").font(.body)
Text("Caption").font(.caption)
Text("Custom").font(.system(.callout, design: .rounded, weight: .semibold))

// ❌ Wrong: hardcoded, breaks accessibility
Text("Title").font(.system(size: 28))
```

For truncation that must happen at large sizes:
```swift
Text(item.title)
    .font(.headline)
    .lineLimit(2)
    .minimumScaleFactor(0.8) // allow slight shrink before truncation
```

---

## Color — semantic always

```swift
// ✅ Correct: adapts to Dark Mode automatically
Text("Label").foregroundStyle(.primary)
Text("Hint").foregroundStyle(.secondary)
Rectangle().fill(.background)
Rectangle().fill(Color(.systemGroupedBackground))

// Custom brand colors — MUST be in Assets.xcassets with dark variant
Text("CTA").foregroundStyle(Color("BrandPrimary"))

// ❌ Wrong: breaks in Dark Mode
Text("Label").foregroundStyle(.black)
Rectangle().fill(Color.white)
```

---

## Spacing — 8pt grid

```swift
// Preferred values: 4, 8, 12, 16, 20, 24, 32, 48
.padding(16)                    // standard screen margin
.padding(.horizontal, 16)       // horizontal only
VStack(spacing: 12) { }         // tight list items
VStack(spacing: 24) { }         // sections
.padding(.vertical, 8)          // compact padding

// ❌ Never
.padding(13)    // arbitrary
.frame(height: 44) // use minHeight or let it adapt
```

---

## Navigation

```swift
// Standard push navigation (iOS 16+)
NavigationStack {
    RootView()
        .navigationDestination(for: Item.self) { item in
            DetailView(item: item)
        }
        .navigationDestination(for: Route.self) { route in
            routeView(route)
        }
}

// Sheet with detents (iOS 16+)
.sheet(isPresented: $showSheet) {
    SheetContent()
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .presentationCornerRadius(24)
}

// Confirmation dialog (not Alert for destructive actions)
.confirmationDialog("Delete item?", isPresented: $showDeleteConfirm, titleVisibility: .visible) {
    Button("Delete", role: .destructive) { viewModel.delete(item) }
    Button("Cancel", role: .cancel) { }
}
```

---

## Lists

```swift
// For data: always List (handles swipe actions, separators, accessibility)
List {
    ForEach(viewModel.items) { item in
        ItemRow(item: item)
            .swipeActions(edge: .trailing) {
                Button(role: .destructive) {
                    viewModel.delete(item)
                } label: {
                    Label("Delete", systemImage: "trash")
                }
            }
    }
}
.listStyle(.insetGrouped)

// For custom layouts where List won't work:
ScrollView {
    LazyVStack(spacing: 0) {
        ForEach(viewModel.items) { item in
            ItemCard(item: item)
            Divider().padding(.leading, 16)
        }
    }
}
```

---

## Accessibility — always

```swift
// Every interactive element needs a label
Button {
    viewModel.toggleFavorite(item)
} label: {
    Image(systemName: item.isFavorite ? "heart.fill" : "heart")
}
.accessibilityLabel(item.isFavorite ? "Remove from favorites" : "Add to favorites")

// Images: label or hide
Image("decorativeBackground")
    .accessibilityHidden(true)

Image(systemName: "checkmark.circle.fill")
    .accessibilityLabel("Completed")

// Custom actions for complex cells
ItemRow(item: item)
    .accessibilityElement(children: .combine)
    .accessibilityAddTraits(.isButton)
    .accessibilityHint("Double tap to open details")

// Reduce motion
@Environment(\.accessibilityReduceMotion) var reduceMotion

.animation(reduceMotion ? .none : .spring(response: 0.3), value: isExpanded)
```

---

## Async images

```swift
// Always handle all phases
AsyncImage(url: URL(string: item.imageURL)) { phase in
    switch phase {
    case .empty:
        RoundedRectangle(cornerRadius: 8)
            .fill(Color.secondary.opacity(0.15))
            .overlay { ProgressView().scaleEffect(0.6) }
    case .success(let image):
        image
            .resizable()
            .aspectRatio(contentMode: .fill)
            .clipped()
    case .failure:
        RoundedRectangle(cornerRadius: 8)
            .fill(Color.secondary.opacity(0.1))
            .overlay {
                Image(systemName: "photo")
                    .foregroundStyle(.tertiary)
            }
    @unknown default:
        EmptyView()
    }
}
.frame(width: 80, height: 80)
.clipShape(RoundedRectangle(cornerRadius: 8))
```

---

## File structure

One view per file. Every file follows this structure:

```swift
import SwiftUI

// MARK: - View

struct FeatureView: View {
    @State private var viewModel = FeatureViewModel()

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("Title")
                .navigationBarTitleDisplayMode(.large)
                .task { await viewModel.load() }
        }
    }
}

// MARK: - Content

private extension FeatureView {
    @ViewBuilder
    var content: some View {
        switch viewModel.viewState {
        case .loading: loadingView
        case .loaded:  loadedView
        case .empty:   emptyStateView
        case .error:   errorView
        }
    }

    var loadedView: some View { /* ... */ }
    var loadingView: some View { /* ... */ }
    var emptyStateView: some View { /* ... */ }
    var errorView: some View { /* ... */ }
}

// MARK: - Subviews

private extension FeatureView {
    // Break complex body into named subviews
}

// MARK: - Preview

#Preview("Default") {
    FeatureView()
}

#Preview("Empty") {
    // Preview with empty state VM
    FeatureView()
}

#Preview("Dark Mode") {
    FeatureView()
        .preferredColorScheme(.dark)
}

#Preview("Large Text") {
    FeatureView()
        .dynamicTypeSize(.accessibility2)
}
```

---

## Output checklist before delivering code

Read this before outputting any SwiftUI:

- [ ] All four states implemented (loading, loaded, empty, error)?
- [ ] Empty state has a call-to-action, not just blank space?
- [ ] Error state tells user what to do (retry, go to settings)?
- [ ] No hardcoded font sizes?
- [ ] No `.foregroundStyle(.black)` or `.fill(.white)`?
- [ ] All tappable areas are at least 44×44pt?
- [ ] All interactive elements have `.accessibilityLabel`?
- [ ] `.accessibilityReduceMotion` respected for animations?
- [ ] 4 `#Preview` macros: default, empty/alt state, dark mode, large text?
- [ ] No `try!` or `!` force unwraps?
- [ ] Async work is in ViewModel, not view body?
- [ ] Does this compile? (mentally trace the code)

If any item fails: fix it before outputting.

Ready for: `/review`
