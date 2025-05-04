// Access React and ReactDOM from the global scope
const { useState, useRef, useEffect } = React;

// Create a simple 3D scene using Three.js directly
class ThreeScene {
  constructor(container) {
    // Scene setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x0a0a0a, 1);
    container.appendChild(this.renderer.domElement);
    
    // Camera position
    this.camera.position.z = 15;
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(10, 10, 10);
    this.scene.add(pointLight);
    
    // Add torus knot
    const geometry = new THREE.TorusKnotGeometry(5, 1.5, 100, 16);
    const material = new THREE.MeshStandardMaterial({
      color: 0x9c27b0,
      emissive: 0xff9800,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2,
      wireframe: true
    });
    this.torusKnot = new THREE.Mesh(geometry, material);
    this.scene.add(this.torusKnot);
    
    // Add particles
    this.particles = new THREE.Group();
    this.scene.add(this.particles);
    
    for (let i = 0; i < 200; i++) {
      const geometry = new THREE.SphereGeometry(Math.random() * 0.2 + 0.1, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x9c27b0 : 0xff9800,
        transparent: true,
        opacity: 0.7
      });
      const particle = new THREE.Mesh(geometry, material);
      
      // Random position
      particle.position.x = (Math.random() - 0.5) * 30;
      particle.position.y = (Math.random() - 0.5) * 30;
      particle.position.z = (Math.random() - 0.5) * 30;
      
      this.particles.add(particle);
    }
    
    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Start animation loop
    this.animate();
  }
  
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  animate() {
    requestAnimationFrame(this.animate.bind(this));
    
    // Rotate torus knot
    this.torusKnot.rotation.x += 0.01;
    this.torusKnot.rotation.y += 0.015;
    
    // Rotate particles
    this.particles.rotation.x += 0.001;
    this.particles.rotation.y += 0.002;
    
    this.renderer.render(this.scene, this.camera);
  }
  
  dispose() {
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.dispose();
  }
}

// Main App Component
const App = () => {
  const [isLoading, setIsLoading] = useState(false);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  
  useEffect(() => {
    // Initialize Three.js scene
    if (canvasRef.current) {
      sceneRef.current = new ThreeScene(canvasRef.current);
    }
    
    // Cleanup on unmount
    return () => {
      if (sceneRef.current) {
        sceneRef.current.dispose();
      }
    };
  }, []);
  
  const handleRedirect = () => {
    setIsLoading(true);
    setTimeout(() => {
      window.location.href = "https://webgpt.app/zensite_main_page";
    }, 1500);
  };
  
  return (
    <>
      <div className="canvas-container" ref={canvasRef}></div>
      <div className="content">
        <h1>Welcome to WebGPT</h1>
        <button 
          className="redirect-button"
          onClick={handleRedirect}
          disabled={isLoading}
        >
          {isLoading ? "Redirecting..." : "Enter WebGPT"}
        </button>
        <div className={`loading-text ${isLoading ? 'visible' : ''}`}>
          Taking you to the main page...
        </div>
      </div>
    </>
  );
};

// Render the App
ReactDOM.render(<App />, document.getElementById('root'));