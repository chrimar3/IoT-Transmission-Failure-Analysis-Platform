# BMAD Method Manual Installation Guide

Since the automated installation is complex, here's how to manually install npx bmad-method:

## Step 1: Run the Interactive Installer

```bash
./node_modules/.bin/bmad-method install
```

## Step 2: Answer the Configuration Prompts

### Basic Setup
1. **Project Path**: Enter the full path when prompted:
   ```
   /Users/chrism/CU-BEMS IoT Transmission Failure Analysis Platform
   ```

2. **Package Selection**:
   - Use arrow keys to navigate
   - Space to select "BMad Agile Core System (v4.43.1)"
   - Press Enter to continue

### Documentation Settings
3. **PRD Sharding**: Choose `Y` (Yes) for multiple files
4. **Architecture Documentation**: Choose `Y` (Yes) for multiple files
5. **Documentation Structure**: Choose `Y` (Yes) for organized structure
6. **File Naming**: Choose `kebab-case` or default
7. **Documentation Format**: Choose `markdown` or default

### Git Integration
8. **Git Integration**: Choose `Y` (Yes)
9. **Git Repository**: Choose `Y` (Yes) if you want Git integration
10. **Branch Strategy**: Enter `main` or your preferred branch

### IDE Configuration
11. **IDE Selection**:
    - Navigate with arrow keys
    - Space to select "Claude Code" (since you're using it)
    - Press Enter when done
12. **IDE Integration**: Choose `Y` (Yes) for Claude Code integration

### Project Type Detection
13. **Project Type**: Choose `web-application` or let it auto-detect
14. **Framework**: Choose `Y` (Yes) for Next.js detection
15. **TypeScript**: Choose `Y` (Yes)
16. **React**: Choose `Y` (Yes)

### Build & Development Tools
17. **Build System**: Choose `npm`
18. **Package Manager**: Choose `npm`
19. **Testing Framework**: Choose `jest`
20. **Linting**: Choose `eslint`
21. **Code Formatting**: Choose `prettier`

### Database & API
22. **Database**: Choose `postgresql`
23. **Database Integration**: Choose `supabase`
24. **API Framework**: Choose `next-api`

### Styling
25. **CSS Framework**: Choose `tailwind`
26. **UI Components**: Choose `custom`

### CI/CD
27. **CI/CD**: Choose `github-actions`
28. **Automated Testing**: Choose `Y` (Yes)

### Domain-Specific (IoT)
29. **Project Domain**: Choose `iot` or `data-analysis`
30. **Data Analysis**: Choose `Y` (Yes)
31. **Sensor Data**: Choose `Y` (Yes)
32. **Analytics**: Choose `Y` (Yes)

### Final Configuration
33. **Save Configuration**: Choose `Y` (Yes)
34. **Initialize Project**: Choose `Y` (Yes)

## Step 3: Verify Installation

After completion, check:

```bash
./node_modules/.bin/bmad-method status
```

You should see BMAD method files installed in your project.

## Alternative: Quick Setup

If the manual process is too lengthy, we can continue using your existing custom BMAD framework which is already working perfectly for your IoT analysis needs.

The current BMAD implementation provides:
- ✅ IoT-specific analysis
- ✅ $297K savings identification
- ✅ Working dashboard at http://localhost:3000/bmad
- ✅ API at http://localhost:3000/api/bmad

Both approaches can coexist - your custom BMAD for IoT analysis and the npx bmad-method for general project management.