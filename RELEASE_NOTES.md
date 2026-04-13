# Release Notes

## [1.2.0] - 2026-02-10

### Added

- **Review dialog on book completion** — When you mark a book as "read," a rating prompt appears asking for 1-5 stars and an optional comment (max 200 characters). Reviews can be edited anytime and appear on the book page and in your friends' feed.

- **Precise finish dates on scoreboard** — Friends' scoreboard now displays the exact date someone finished reading (e.g., `05/02/2024`) instead of reading duration, making it easier to coordinate discussions and see what friends just finished.

- **Footer on public pages** — Login, register, and invite join pages now include BookVault branding, tagline, copyright notice, and a link to Responsible Use Terms. Provides brand consistency and legal transparency before signup.

### Changed

- Scoreboard display: Switched from relative reading time ("5 days") to absolute completion dates in `dd/MM/yyyy` format
- Date formatting now uses locale-aware `shortdate()` utility function with Portuguese/English support

### Fixed

- Footer layout alignment on public pages — Sticky footer now properly anchors to bottom of viewport

---

## How to Use

**Rate a book when you finish:**
1. Open a book marked as "read"
2. The review dialog appears automatically
3. Select 1-5 stars (required)
4. Add optional comment (up to 200 chars)
5. Click "Save"

**See when friends finished reading:**
- Open any book
- Check the Friends scoreboard
- View exact completion dates for each friend

---

## Commits Included

- `de746cd` - fix: make /terms route public
- `89593f4` - fix: align footer properly on public pages
- `bc18091` - feat: add footer to public pages (login, register, join invite)
- `49e8266` - feat: remove drag and drop from kanban, add review dialog to book details
- `88f6828` - fix(tests): update FriendsScoreboard test to expect shortdate format
- `1ccde8d` - fix(dateUtils): include year in shortdate format (dd/MM/yyyy)
- `cf6d620` - feat(dateUtils): add shortdate function and use in scoreboards
- `e6c30aa` - fix(scoreboard): fix undefined language error in FriendProgressItem
- `0d64bba` - fix(scoreboard): show finished date instead of days count
- `71a4f2e` - fix(friends): propagate profile pictures to friends page
