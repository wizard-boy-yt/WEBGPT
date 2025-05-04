// Simple fallback script if Three.js fails to load
window.addEventListener('DOMContentLoaded', function() {
  // Check if Three.js loaded properly
  if (!window.THREE || document.querySelector('.canvas-container').children.length === 0) {
    console.log('Three.js not loaded properly, using fallback');
    
    // Apply fallback styles
    document.body.classList.add('fallback-mode');
    
    // Create fallback content
    const root = document.getElementById('root');
    
    // Clear any existing content
    root.innerHTML = '';
    
    // Create content container
    const content = document.createElement('div');
    content.className = 'content fallback-content';
    
    // Add heading
    const heading = document.createElement('h1');
    heading.textContent = 'Welcome to WebGPT';
    content.appendChild(heading);
    
    // Add button
    const button = document.createElement('button');
    button.className = 'redirect-button';
    button.textContent = 'Enter WebGPT';
    button.addEventListener('click', function() {
      const loadingText = document.querySelector('.loading-text');
      loadingText.classList.add('visible');
      button.textContent = 'Redirecting...';
      button.disabled = true;
      
      setTimeout(function() {
        window.location.href = 'https://webgpt.app/zensite_main_page';
      }, 1500);
    });
    content.appendChild(button);
    
    // Add loading text
    const loadingText = document.createElement('div');
    loadingText.className = 'loading-text';
    loadingText.textContent = 'Taking you to the main page...';
    content.appendChild(loadingText);
    
    // Add to DOM
    root.appendChild(content);
  }
});