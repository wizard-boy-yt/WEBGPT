# WebGPT 3D Redirection Page

This is a standalone 3D redirection page for WebGPT that features:

- A cool 3D animated background using Three.js
- Purple-orange gradient theme on a dark background
- A stylish button that redirects to webgpt.app/zensite_main_page
- Fallback options if 3D effects don't load

## How to Use

1. Upload the entire `redirect` folder to your hosting service
2. Set the URL in Supabase to point to the index.html file in this folder

## Files Included

- `index.html` - The main HTML file that loads all dependencies
- `styles.css` - Contains all styling for the page
- `app.js` - Contains the React and Three.js code for the 3D effects and redirection logic
- `fallback.js` - Provides a fallback if Three.js fails to load
- `simple.html` - An ultra-simple version with no dependencies (use this if you have issues)

## Features

- **3D Background**: Animated torus knot and particles with purple and orange colors
- **Responsive Design**: Works on mobile and desktop devices
- **Graceful Degradation**: Falls back to a simpler version if 3D effects don't load
- **Standalone**: No build step required, all dependencies loaded via CDN

## Dependencies

This page uses:
- React
- Three.js
- Babel (for JSX transformation)

All dependencies are loaded via CDN, so no build step is required.

## Troubleshooting

If you experience issues:

1. Try clearing your browser cache
2. Check if Three.js is loading properly in your browser
3. If problems persist, use the `simple.html` version instead

## Customization

You can modify the following:
- The redirection URL in `app.js` (currently set to "https://webgpt.app/zensite_main_page")
- The colors in `styles.css` (currently using purple-orange gradient)
- The 3D effects in `app.js`