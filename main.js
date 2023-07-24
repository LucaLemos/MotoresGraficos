import * as THREE from 'three';

// Global variables
let scene, camera, renderer, cube;
let bullets = [];
const bulletSpeed = 0.2;
let mouseDown = false;
let lastMouseX = null;
let lastMouseY = null;

// Function to initialize the scene
function init() {
    // Scene
    scene = new THREE.Scene();
	scene.background = new THREE.Color(0x111111);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 5);
    camera.lookAt(scene.position);

    // Renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Cube
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const edgeGeometry = new THREE.EdgesGeometry(geometry);
	const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });

    cube = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0xffffff }));
	cube.position.y = 0.5

    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    cube.add(edges);

    scene.add(cube);

	// Floor
    const floorGeometry = new THREE.PlaneGeometry(10, 10, 1, 1);
    const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.DoubleSide });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2; // Rotate the floor to be horizontal
    scene.add(floor);

	// Mouse Controls
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousemove', onMouseMove);

	// Keyboard Controls
    document.addEventListener('keydown', onKeyDown, false);

    // Event listeners
    window.addEventListener('resize', onWindowResize, false);
}

// Function to handle window resizing
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseDown(event) {
    mouseDown = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
}

function onMouseUp() {
    mouseDown = false;
}

function onMouseMove(event) {
    if (!mouseDown) return;

    const sensitivity = 0.002;
    const deltaX = event.clientX - lastMouseX;
    const deltaY = event.clientY - lastMouseY;

    // Update the camera rotation based on mouse movement
    camera.rotation.y -= deltaX * sensitivity;
    camera.rotation.x -= deltaY * sensitivity;

    // Limit the camera's vertical rotation to avoid flipping upside down
    const maxVerticalRotation = Math.PI / 2;
    camera.rotation.x = Math.max(-maxVerticalRotation, Math.min(maxVerticalRotation, camera.rotation.x));

    // Update last mouse position
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
}

// Function to handle keyboard input
function onKeyDown(event) {
    const step = 0.1; // Control the cube's movement speed
    switch (event.code) {
        case 'KeyA': // A key
            cube.position.x -= step;
            break;
        case 'KeyD': // D key
            cube.position.x += step;
            break;
        case 'KeyW': // W key
            cube.position.z -= step;
            break;
        case 'KeyS': // S key
            cube.position.z += step;
            break;
		case 'ArrowUp':
			createBullet(new THREE.Vector3(0, 0, -bulletSpeed)); // Shoot up
			break;
		case 'ArrowDown':
			createBullet(new THREE.Vector3(0, 0, bulletSpeed)); // Shoot down
			break;
		case 'ArrowLeft':
			createBullet(new THREE.Vector3(-bulletSpeed, 0, 0)); // Shoot left
			break;
		case 'ArrowRight':
			createBullet(new THREE.Vector3(bulletSpeed, 0, 0)); // Shoot right
			break;
    }
}

function createBullet(move) {
	const geometry = new THREE.CircleGeometry(0.05, 8);
	const material = new THREE.PointsMaterial({ color: 0xff00ff });
	const bullet = new THREE.Points(geometry, material);

	bullet.position.copy(cube.position);
	bullet.velocity = move.clone();
	scene.add(bullet);
	bullets.push(bullet);
}

function updateBullet() {
	for(let i = bullets.length - 1; i >= 0; i--) {
		const bullet = bullets[i];
		bullet.position.add(bullet.velocity);

		if(bullet.position.z < -10 || bullet.position.x < -10 || bullet.position.x > 10 || bullet.position.y < -5 || bullet.position.y > 5) {
			scene.remove(bullet);
			bullets.splice(i, 1);
		}
	}
}

// Function to animate the cube
function animate() {
    requestAnimationFrame(animate);

	updateBullet();

    renderer.render(scene, camera);
}

// Initialize the scene and start the animation
init();
animate();