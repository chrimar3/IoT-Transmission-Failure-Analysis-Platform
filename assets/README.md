# 🎨 Assets (`/assets`)

Static assets for the CU-BEMS IoT Transmission Failure Analysis Platform.

## 🗂️ Directory Structure

```
assets/
├── images/            # General images and graphics
├── icons/             # Icon sets and SVG icons
└── media/             # Videos, audio, and multimedia files
```

## 📁 Asset Categories

### Images (`/images`)
**Purpose**: General purpose images, backgrounds, and graphics
- Backgrounds and textures
- General illustrations
- Marketing materials
- Social media graphics

**File Formats**:
- `.png` - Screenshots, UI elements
- `.jpg` - Photos, complex images
- `.svg` - Vector graphics, logos
- `.webp` - Optimized web images

### Icons (`/icons`)
**Purpose**: Icon sets and iconography
- UI icons (buttons, navigation)
- Status indicators
- Technology logos
- Custom illustrations

**Icon Standards**:
- Size: 16x16, 24x24, 32x32, 48x48, 96x96
- Format: SVG preferred, PNG fallback
- Style: Consistent with design system
- Colors: Monochrome with theme variants

### Media (`/media`)
**Purpose**: Multimedia content
- Demo videos
- Audio files
- Animated GIFs
- Interactive media

## 📏 Asset Guidelines

### File Naming
- Use kebab-case: `energy-dashboard-hero.png`
- Include dimensions for multiple sizes: `logo-192x192.png`
- Version numbers if needed: `dashboard-v2.png`

### Optimization
- **Images**: Compress for web (80% quality for JPG, optimize PNG)
- **SVGs**: Minify and remove unnecessary metadata
- **Videos**: Use web-compatible formats (MP4, WebM)

### Organization
- Group by feature/component: `dashboard/`, `login/`, `reports/`
- Separate by size variants: `icons/16x16/`, `icons/32x32/`
- Use descriptive subdirectories

## 🔗 Usage in Code

### React Components
```tsx
import dashboardHero from '@/assets/images/dashboard-hero.png';
import energyIcon from '@/assets/icons/energy.svg';

function Dashboard() {
  return (
    <div>
      <img src={dashboardHero} alt="Dashboard Overview" />
      <img src={energyIcon} alt="Energy Icon" />
    </div>
  );
}
```

### CSS/Tailwind
```css
.hero-bg {
  background-image: url('/assets/images/energy-pattern.png');
}
```

### Next.js Image Optimization
```tsx
import Image from 'next/image';
import dashboardImg from '@/assets/images/dashboard-overview.png';

<Image
  src={dashboardImg}
  alt="Dashboard"
  width={1200}
  height={800}
  priority
/>
```

## 🎯 Asset Categories by Use Case

### Landing Page Assets
- Hero images and backgrounds
- Feature illustrations
- Technology stack logos
- Company/project branding

### Dashboard Assets
- Chart icons and indicators
- Status symbols
- Action buttons
- Data visualization graphics

### Mobile Assets
- App icons and splash screens
- Touch-optimized graphics
- Responsive image variants

### Documentation Assets
- Architecture diagrams
- Screenshots and mockups
- Tutorial illustrations
- Flow charts

## 📱 Responsive Considerations

### Image Variants
Provide multiple sizes for responsive design:
```
hero-image-mobile.jpg    (750w)
hero-image-tablet.jpg    (1200w)
hero-image-desktop.jpg   (1920w)
hero-image-large.jpg     (2560w)
```

### SVG Icons
Use scalable SVGs that work at any size:
```svg
<svg viewBox="0 0 24 24" fill="currentColor">
  <path d="..."/>
</svg>
```

## 🔒 Legal Considerations

### Image Rights
- ✅ Own all images or have proper licensing
- ✅ Attribution for Creative Commons content
- ✅ Commercial use rights for stock photos
- ❌ Never use copyrighted images without permission

### Brand Assets
- Company logos used with permission
- Technology logos following brand guidelines
- Proper attribution in documentation

## 🚀 Performance Optimization

### Image Optimization Tools
- **TinyPNG**: PNG/JPG compression
- **SVGO**: SVG optimization
- **ImageOptim**: Mac batch optimization
- **Next.js Image**: Automatic optimization

### Lazy Loading
Implement lazy loading for non-critical images:
```tsx
<Image
  src="/assets/images/chart.png"
  alt="Chart"
  loading="lazy"
  placeholder="blur"
/>
```

### CDN Strategy
Consider CDN for asset delivery:
- CloudFront (AWS)
- Cloudflare Images
- Vercel Image Optimization

## 📋 Asset Checklist

### Before Adding New Assets
- [ ] Proper licensing/permissions
- [ ] Optimized file size
- [ ] Correct dimensions/format
- [ ] Descriptive filename
- [ ] Placed in correct directory

### Quality Standards
- [ ] High resolution (2x for retina)
- [ ] Consistent style/branding
- [ ] Accessible (alt text ready)
- [ ] Web-optimized formats
- [ ] Version controlled

## 🔄 Maintenance

### Regular Tasks
- Review and optimize large assets
- Update outdated screenshots
- Maintain consistent branding
- Archive unused assets
- Update attribution/licensing

This asset organization ensures efficient, scalable, and legally compliant use of all visual and media content in the IoT platform.