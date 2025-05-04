export const demoSnippets = {
  html: [
    // Demo 1: Simple card
    `<div class="card">
  <div class="card-header">
    <h2>Welcome to WebGPT</h2>
  </div>
  <div class="card-body">
    <p>Build beautiful websites with AI in minutes.</p>
    <button id="learnMore">Learn More</button>
  </div>
</div>`,

    // Demo 2: Profile card
    `<div class="profile-card">
  <div class="profile-header">
    <div class="profile-avatar"></div>
    <h2>Wizard Was Taken</h2>
    <p class="profile-title">Web Developer</p>
  </div>
  <div class="profile-stats">
    <div class="stat">
      <span class="stat-value">42</span>
      <span class="stat-label">Projects</span>
    </div>
    <div class="stat">
      <span class="stat-value">10k</span>
      <span class="stat-label">Followers</span>
    </div>
    <div class="stat">
      <span class="stat-value">5.0</span>
      <span class="stat-label">Rating</span>
    </div>
  </div>
  <button id="followBtn">Follow</button>
</div>`,

    // Demo 3: Feature showcase
    `<div class="features">
  <h2 class="features-title">Why Choose WebGPT?</h2>
  
  <div class="feature-grid">
    <div class="feature-item">
      <div class="feature-icon">🚀</div>
      <h3>Fast Development</h3>
      <p>Build websites in minutes, not days.</p>
    </div>
    
    <div class="feature-item">
      <div class="feature-icon">🎨</div>
      <h3>Beautiful Design</h3>
      <p>Professional templates for any project.</p>
    </div>
    
    <div class="feature-item">
      <div class="feature-icon">🤖</div>
      <h3>AI Powered</h3>
      <p>Smart suggestions and automated features.</p>
    </div>
    
    <div class="feature-item">
      <div class="feature-icon">📱</div>
      <h3>Responsive</h3>
      <p>Works on all devices out of the box.</p>
    </div>
  </div>
  
  <button id="startNow">Start Building Now</button>
</div>`,
  ],

  css: [
    // Demo 1: Simple card
    `.card {
  max-width: 400px;
  margin: 2rem auto;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background-color: #2a2a2a;
  color: #e2e2e2;
}

.card-header {
  padding: 1.5rem;
  background-color: #8b5cf6;
  color: white;
}

.card-header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.card-body {
  padding: 1.5rem;
}

.card-body p {
  margin-top: 0;
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

button {
  background-color: #8b5cf6;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #7c3aed;
}`,

    // Demo 2: Profile card
    `.profile-card {
  max-width: 350px;
  margin: 2rem auto;
  border-radius: 12px;
  overflow: hidden;
  background-color: #2a2a2a;
  color: #e2e2e2;
  text-align: center;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.profile-header {
  padding: 2rem 1rem;
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
}

.profile-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: #f4f4f4;
  margin: 0 auto 1rem;
  border: 3px solid white;
}

.profile-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: white;
}

.profile-title {
  margin: 0.5rem 0 0;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
}

.profile-stats {
  display: flex;
  justify-content: space-around;
  padding: 1.5rem 0;
  border-bottom: 1px solid #3a3a3a;
}

.stat {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: bold;
  color: #8b5cf6;
}

.stat-label {
  font-size: 0.8rem;
  color: #a0a0a0;
  margin-top: 0.25rem;
}

#followBtn {
  margin: 1.5rem auto;
  display: block;
  background-color: #8b5cf6;
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 50px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

#followBtn:hover {
  background-color: #7c3aed;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}`,

    // Demo 3: Feature showcase
    `.features {
  max-width: 800px;
  margin: 2rem auto;
  padding: 2rem;
  background-color: #2a2a2a;
  border-radius: 12px;
  color: #e2e2e2;
  text-align: center;
}

.features-title {
  font-size: 2rem;
  margin-bottom: 2rem;
  color: #8b5cf6;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.feature-item {
  padding: 1.5rem;
  background-color: #333;
  border-radius: 8px;
  transition: transform 0.3s, box-shadow 0.3s;
}

.feature-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.feature-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.feature-item h3 {
  margin: 0 0 0.5rem;
  color: #8b5cf6;
}

.feature-item p {
  margin: 0;
  font-size: 0.9rem;
  color: #b0b0b0;
}

#startNow {
  background-color: #8b5cf6;
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 50px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 1rem;
}

#startNow:hover {
  background-color: #7c3aed;
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}`,
  ],

  js: [
    // Demo 1: Simple card
    `// Add interactivity to the card
document.getElementById('learnMore').addEventListener('click', function() {
  alert('Welcome to ZenSite! Build amazing websites with AI.');
  
  // Change button text after click
  this.textContent = 'Thanks for your interest!';
  this.style.backgroundColor = '#4c1d95';
});`,

    // Demo 2: Profile card
    `// Profile card interactions
const followBtn = document.getElementById('followBtn');
let isFollowing = false;

followBtn.addEventListener('click', function() {
  if (!isFollowing) {
    // Update button to following state
    this.textContent = 'Following';
    this.style.backgroundColor = '#4c1d95';
    
    // Update follower count
    const followerCount = document.querySelector('.stat:nth-child(2) .stat-value');
    const currentCount = followerCount.textContent;
    followerCount.textContent = currentCount === '10k' ? '10.1k' : '10k';
    
    isFollowing = true;
  } else {
    // Revert to original state
    this.textContent = 'Follow';
    this.style.backgroundColor = '#8b5cf6';
    
    // Update follower count
    const followerCount = document.querySelector('.stat:nth-child(2) .stat-value');
    const currentCount = followerCount.textContent;
    followerCount.textContent = currentCount === '10.1k' ? '10k' : '10.1k';
    
    isFollowing = false;
  }
});

// Add hover effects to stats
const stats = document.querySelectorAll('.stat');
stats.forEach(stat => {
  stat.addEventListener('mouseenter', function() {
    this.querySelector('.stat-value').style.transform = 'scale(1.2)';
    this.querySelector('.stat-value').style.color = '#a78bfa';
  });
  
  stat.addEventListener('mouseleave', function() {
    this.querySelector('.stat-value').style.transform = 'scale(1)';
    this.querySelector('.stat-value').style.color = '#8b5cf6';
  });
});`,

    // Demo 3: Feature showcase
    `// Feature showcase interactions
const featureItems = document.querySelectorAll('.feature-item');
const startNowBtn = document.getElementById('startNow');

// Add hover animations to feature items
featureItems.forEach((item, index) => {
  item.addEventListener('mouseenter', function() {
    // Staggered animation delay based on index
    setTimeout(() => {
      this.style.backgroundColor = '#3a3a3a';
      this.style.transform = 'translateY(-5px)';
      this.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.2)';
      
      // Highlight the icon
      const icon = this.querySelector('.feature-icon');
      icon.style.transform = 'scale(1.2)';
    }, index * 100);
  });
  
  item.addEventListener('mouseleave', function() {
    this.style.backgroundColor = '#333';
    this.style.transform = 'translateY(0)';
    this.style.boxShadow = 'none';
    
    // Reset icon
    const icon = this.querySelector('.feature-icon');
    icon.style.transform = 'scale(1)';
  });
});

// Add pulse animation to start button
startNowBtn.addEventListener('mouseenter', function() {
  this.classList.add('pulse-animation');
});

startNowBtn.addEventListener('mouseleave', function() {
  this.classList.remove('pulse-animation');
});

// Add click effect
startNowBtn.addEventListener('click', function() {
  alert('Ready to start building your website with ZenSite!');
  
  // Change text after click
  this.textContent = 'Building...';
  
  // Simulate loading
  setTimeout(() => {
    this.textContent = 'Start Building Now';
  }, 2000);
});

// Add CSS for pulse animation
const style = document.createElement('style');
style.textContent = \`
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
  
  .pulse-animation {
    animation: pulse 1s infinite;
  }
\`;
document.head.appendChild(style);`,
  ],
}

