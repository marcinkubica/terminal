# Changelog

## [Unreleased]

### Added
- **🔒 Automatic Boundary Directory Enforcement**: Server now automatically starts in a secure boundary directory
  - Default boundary directory is `/tmp`
  - Can be overridden with `BOUNDARY_DIR` environment variable
  - Process automatically changes to boundary directory on startup
  - Safe fallback behavior if boundary directory doesn't exist (warns but continues)
  - All directory operations remain restricted to within the boundary
- **🔓 Boundary Escape Override**: New `BOUNDARY_ESCAPE` environment variable
  - Set `BOUNDARY_ESCAPE=true` to disable boundary enforcement entirely
  - When enabled, server starts in current directory and allows unrestricted navigation
  - Provides flexibility for advanced users while maintaining security by default
- Unit tests for boundary directory enforcement functionality
- Unit tests for boundary escape functionality

### Changed
- Server working directory is now automatically set to boundary directory at startup
- Improved security posture by ensuring operations start in controlled environment

### Technical Details
- Added startup logic in `getBoundaryDir()` function to enforce working directory
- Enhanced test suite to validate boundary directory behavior
- Handles filesystem symlinks properly (e.g., `/tmp` → `/private/tmp` on macOS)

## Previous Versions
- See git history for previous changes before this changelog was introduced
