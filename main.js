import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let physicsWorld, scene, camera, renderer, rigidBodies = [], tmpTrans, clock;

let colGroupPlane = 1, colGroupRedBall = 2, colGroupGreenBall = 4;

let projectiles = [];
let objectsToCheckForCollision = [];
let collectables = [];
let lastShotTime = 0;

let ballObject = null,
moveDirection = { left: 0, right: 0, forward: 0, back: 0 };
const STATE = { DISABLE_DEACTIVATION : 4 };

let recoillShoot = 1000

Ammo().then(start);

function start (){
    tmpTrans = new Ammo.btTransform();

    setupPhysicsWorld();

    setupGraphics();
    createRoom();
    createBall();
    createColectable();
    
    setupEventHandlers();
    renderFrame();

    generateRandomMaskBallPeriodically()
}

function setupPhysicsWorld(){
    let collisionConfiguration  = new Ammo.btDefaultCollisionConfiguration(),
        dispatcher              = new Ammo.btCollisionDispatcher(collisionConfiguration),
        overlappingPairCache    = new Ammo.btDbvtBroadphase(),
        solver                  = new Ammo.btSequentialImpulseConstraintSolver();

    physicsWorld           = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
    physicsWorld.setGravity(new Ammo.btVector3(0, -10, 0));
}

function setupGraphics(){
    clock = new THREE.Clock();

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x000000 );
    
    camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.2, 5000 );
    camera.position.set( 0, 60, 70 );
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    
    let hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.1 );
    hemiLight.color.setHSL( 0.6, 0.6, 0.6 );
    hemiLight.groundColor.setHSL( 0.1, 1, 0.4 );
    hemiLight.position.set( 0, 50, 0 );
    scene.add( hemiLight );
    
    let dirLight = new THREE.DirectionalLight( 0xffffff , 1);
    dirLight.color.setHSL( 0.1, 1, 0.95 );
    dirLight.position.set( -1, 1.75, 1 );
    dirLight.position.multiplyScalar( 100 );
    scene.add( dirLight );

    dirLight.castShadow = true;

    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;

    let d = 50;

    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;

    dirLight.shadow.camera.far = 13500;
    
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setClearColor( 0xbfd1e5 );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    renderer.gammaInput = true;
    renderer.gammaOutput = true;

    renderer.shadowMap.enabled = true;
}

function renderFrame(){
    let deltaTime = clock.getDelta();

    moveBall();
    updatePhysics( deltaTime );
    updateColision( deltaTime );

    if (ballObject) {
      const cameraOffset = new THREE.Vector3(0, 80, 70); // Adjust the offset as needed
      const ballPosition = ballObject.position.clone();
      const cameraPosition = ballPosition.add(cameraOffset);
      camera.position.copy(cameraPosition);
      camera.lookAt(ballObject.position);
    }
    
    checkCollisionWithCollectableItem();
    renderer.render( scene, camera );
    requestAnimationFrame( renderFrame );
}

function setupEventHandlers() {
  window.addEventListener( 'keydown', handleKeyDown, false);
  window.addEventListener( 'keyup', handleKeyUp, false);
}

function handleKeyDown(event){
  const currentTime = performance.now();
  let minTimeBetweenShots = recoillShoot;

  switch(event.code){
    case 'KeyW':
      moveDirection.forward = 1;
      break;
    case 'KeyS':
      moveDirection.back = 1;
      break;
    case 'KeyA':
      moveDirection.left = 1;
      break;
    case 'KeyD':
      moveDirection.right = 1;
      break;
    case 'ArrowUp':
      if (currentTime - lastShotTime >= minTimeBetweenShots) {
        lastShotTime = currentTime;
        shootProjectile(new THREE.Vector3(0, 0, -1));
      }
      break;
    case 'ArrowDown':
      if (currentTime - lastShotTime >= minTimeBetweenShots) {
        lastShotTime = currentTime;
        shootProjectile(new THREE.Vector3(0, 0, 1));
      }
      break;
    case 'ArrowLeft':
      if (currentTime - lastShotTime >= minTimeBetweenShots) {
        lastShotTime = currentTime;
        shootProjectile(new THREE.Vector3(-1, 0, 0));
      }
      break;
    case 'ArrowRight':
      if (currentTime - lastShotTime >= minTimeBetweenShots) {
        lastShotTime = currentTime;
        shootProjectile(new THREE.Vector3(1, 0, 0));
      }
      break;
  }
}
function handleKeyUp(event){
  switch(event.code){
    case 'KeyW':
      moveDirection.forward = 0;
      break;
    case 'KeyS':
      moveDirection.back = 0;
      break;
    case 'KeyA':
      moveDirection.left = 0;
      break;
    case 'KeyD':
      moveDirection.right = 0;
      break;
  }
}


function createRoom() {
  let pos = {x: 0, y: 0, z: -30};
  let scale = {x: 60, y: 4, z: 8};
  let quat = {x: THREE.MathUtils.degToRad(90), y: 0, z: 0, w: 1};
  let mass = 0;
  createWall(pos, scale, quat, mass);
  pos = {x: 0+70, y: 0, z: -30};
  createWall(pos, scale, quat, mass);
  pos = {x: 0, y: 1, z: 30};
  quat = {x: THREE.MathUtils.degToRad(90), y: 0, z: 0, w: 1};
  createWall(pos, scale, quat, mass);
  pos = {x: 0+70, y: 1, z: 30};
  createWall(pos, scale, quat, mass);
  
  pos = {x: -30, y: 1, z: 0};
  quat = {x: THREE.MathUtils.degToRad(90), y: 0, z: THREE.MathUtils.degToRad(90), w: 1};
  createWall(pos, scale, quat, mass);
  pos = {x: 30+70, y: 1, z: 0};
  createWall(pos, scale, quat, mass);

  pos = {x: 30, y: 1, z: 20};
  quat = {x: THREE.MathUtils.degToRad(90), y: 0, z: THREE.MathUtils.degToRad(90), w: 1};
  scale = {x: 25, y: 4, z: 8};
  createWall(pos, scale, quat, mass);
  pos = {x: -30+70, y: 1, z: 20};
  createWall(pos, scale, quat, mass);
  pos = {x: 30, y: 1, z: -20};
  createWall(pos, scale, quat, mass);
  pos = {x: -30+70, y: 1, z: -20};
  createWall(pos, scale, quat, mass);

  pos = {x: 0, y: -2, z: 0};
  scale = {x: 60, y: 2, z: 60};
  quat = {x: 0, y: 0, z: 0, w: 1};
  mass = 0;
  let madeira = 'material/whiteOak.png'
  let pedra = 'material/slateBlack.png'
  createFloor(pos, scale, quat, mass, pedra);
  pos = {x: 70, y: -2, z: 0};
  createFloor(pos, scale, quat, mass, pedra);
  pos = {x: 35, y: -2, z: 0};
  scale = {x: 10, y: 2, z: 10};
  createFloor(pos, scale, quat, mass, pedra);
}
function createFloor(posV, scaleV, quatV, massV, image){
  let pos = posV;
  let scale = scaleV;
  let quat = quatV;
  let mass = massV;

  const loader = new THREE.TextureLoader();
  const texture = loader.load(image);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  const material = new THREE.MeshBasicMaterial({ map: texture });
    
  let blockPlane = new THREE.Mesh(new THREE.BoxGeometry(), material );
  

  blockPlane.position.set(pos.x, pos.y, pos.z);
  blockPlane.scale.set(scale.x, scale.y, scale.z);

  blockPlane.castShadow = true;
  blockPlane.receiveShadow = true;

  scene.add(blockPlane);
    
  let transform = new Ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
  transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
  let motionState = new Ammo.btDefaultMotionState( transform );

  let colShape = new Ammo.btBoxShape( new Ammo.btVector3( scale.x * 0.5, scale.y * 0.5, scale.z * 0.5 ) );
  colShape.setMargin( 0.05 );

  let localInertia = new Ammo.btVector3( 0, 0, 0 );
  colShape.calculateLocalInertia( mass, localInertia );

  let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape, localInertia );
  let body = new Ammo.btRigidBody( rbInfo );

  body.setFriction(4);
  body.setRollingFriction(10);
  physicsWorld.addRigidBody( body, colGroupPlane, colGroupRedBall | colGroupGreenBall );
}
function createWall(posV, scaleV, quatV, massV){
  let pos = posV;
  let scale = scaleV;
  let quat = quatV;
  let mass = massV;

  const loader = new THREE.TextureLoader();
  const texture = loader.load('material/Brick.png');
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  const material = new THREE.MeshBasicMaterial({ map: texture });
    
  let blockPlane = new THREE.Mesh(new THREE.BoxGeometry(), material );
  

  blockPlane.position.set(pos.x, pos.y, pos.z);
  blockPlane.scale.set(scale.x, scale.y, scale.z);
  blockPlane.rotation.set(quat.x, quat.y, quat.z);

  blockPlane.castShadow = true;
  blockPlane.receiveShadow = true;

  scene.add(blockPlane);
    
  let transform = new Ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
  transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
  let motionState = new Ammo.btDefaultMotionState( transform );

  let colShape = new Ammo.btBoxShape( new Ammo.btVector3( scale.x * 0.5, scale.y * 0.5, scale.z * 0.5 ) );
  colShape.setMargin( 0.05 );

  let localInertia = new Ammo.btVector3( 0, 0, 0 );
  colShape.calculateLocalInertia( mass, localInertia );

  let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape, localInertia );
  let body = new Ammo.btRigidBody( rbInfo );

  body.setFriction(4);
  body.setRollingFriction(10);
  physicsWorld.addRigidBody( body, colGroupPlane, colGroupRedBall | colGroupGreenBall );

}

function createBall(){    
  const loader = new GLTFLoader();

  loader.load( 'model/slime_creature.glb', function (gltf) {
    const model = gltf.scene;

    let pos = {x: 0, y: 20, z: 0};
    let radius = 2;
    let quat = {x: 0, y: 0, z: 0, w: 1};
    let mass = 1;

    let ball = ballObject = model;
    
    ball.scale.set(5, 5, 5)
    ball.position.set(pos.x, pos.y, pos.z);
    
    ball.castShadow = true;
    ball.receiveShadow = true;

    scene.add(ball);
    
    let colShape = new Ammo.btSphereShape( radius );
    
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    let motionState = new Ammo.btDefaultMotionState( transform );
    
    colShape.setMargin( 0.05 );

    let localInertia = new Ammo.btVector3( 0, 0, 0 );
    colShape.calculateLocalInertia( mass, localInertia );

    let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape, localInertia );
    let body = new Ammo.btRigidBody( rbInfo );

    body.setFriction(4);
    body.setRollingFriction(10);
    body.setActivationState( STATE.DISABLE_DEACTIVATION );

    physicsWorld.addRigidBody( body, colGroupRedBall, colGroupPlane | colGroupGreenBall );
    
    ball.userData.physicsBody = body;
    rigidBodies.push(ball);
  }, undefined, function (error) {
    console.log("error");
  });
}

function createColectable(){    
  const loader = new GLTFLoader();

  loader.load( 'model/power-up_mushroom.glb', function (gltf) {
    const model = gltf.scene;

    let pos = {x: 70, y: 3, z: 0};
    let scale = {x: 2, y: 2, z: 2};
    let quat = {x: 0, y: 0, z: 0, w: 1};
    let mass = 1;

    let ball = model;

    ball.position.set(pos.x, pos.y, pos.z);
    ball.scale.set(scale.x, scale.y, scale.z);
    
    ball.castShadow = true;
    ball.receiveShadow = true;

    scene.add(ball);
    collectables.push(ball);
    
  }, undefined, function (error) {
    console.log("error");
  });

}

function createMaskBall(){    
  let pos = {x: Math.random() * 40 - 20, y: 30, z: Math.random() * 40 - 20};
  let radius = 2;
  let quat = {x: 0, y: 0, z: 0, w: 1};
  let mass = 1;

  let ball = new THREE.Mesh(new THREE.SphereGeometry(radius), new THREE.MeshPhongMaterial({color: 0x00ff08}));

  ball.position.set(pos.x, pos.y, pos.z);
  
  ball.castShadow = true;
  ball.receiveShadow = true;

  scene.add(ball);
  
  let transform = new Ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
  transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
  let motionState = new Ammo.btDefaultMotionState( transform );

  let colShape = new Ammo.btSphereShape( radius );
  colShape.setMargin( 0.05 );

  let localInertia = new Ammo.btVector3( 0, 0, 0 );
  colShape.calculateLocalInertia( mass, localInertia );

  let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape, localInertia );
  let body = new Ammo.btRigidBody( rbInfo );

  physicsWorld.addRigidBody( body, colGroupGreenBall, colGroupRedBall | colGroupPlane );
  
  ball.userData.physicsBody = body;
  rigidBodies.push(ball);
  objectsToCheckForCollision.push(ball);
}
function generateRandomMaskBallPeriodically() {
  createMaskBall(); // Create the first maskball immediately

  // Schedule the next maskball creation after 10 seconds
  setTimeout(() => {
    generateRandomMaskBallPeriodically();
  }, 2000); // 10000 milliseconds (10 seconds)
}

function moveBall() {
  let scalingFactor = 20;

  let moveX = moveDirection.right - moveDirection.left;
  let moveZ = moveDirection.back - moveDirection.forward;
  let moveY = 0;

  if( moveX == 0 && moveY == 0 && moveZ == 0) return;
  
  let physicsBody = ballObject.userData.physicsBody;

  let resultantImpulse = new Ammo.btVector3( moveX, moveY, moveZ ); 
  resultantImpulse.op_mul(scalingFactor);
  physicsBody.setLinearVelocity( resultantImpulse );
}

function shootProjectile(direction) {
  const loader = new GLTFLoader();

  loader.load( 'model/bullet_kin.glb', function (gltf) {
    const model = gltf.scene;

    // Create a new projectile object (similar to how you created other objects)
    let pos = { x: ballObject.position.x, y: ballObject.position.y, z: ballObject.position.z };
    let radius = 1; // Adjust the size of the projectile
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 1;

    let projectile = model

    projectile.scale.set(0.2, 0.2, 0.2)
    projectile.position.set(pos.x, pos.y, pos.z);
    projectile.castShadow = true;
    projectile.receiveShadow = true;

    scene.add(projectile);

    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
    transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
    let motionState = new Ammo.btDefaultMotionState( transform );

    let colShape = new Ammo.btSphereShape( radius );
    colShape.setMargin( 0.05 );

    let localInertia = new Ammo.btVector3( 0, 0, 0 );
    colShape.calculateLocalInertia( mass, localInertia );

    let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape, localInertia );
    let body = new Ammo.btRigidBody( rbInfo );

    physicsWorld.addRigidBody( body, colGroupRedBall, colGroupPlane | colGroupGreenBall );
    
    projectile.userData.physicsBody = body;
    rigidBodies.push(projectile);

    let scalingFactor = 60; // Adjust as needed
    let linearVelocity = new Ammo.btVector3(direction.x * scalingFactor, direction.y * scalingFactor, direction.z * scalingFactor);

    // Set the linear velocity of the projectile's physics body
    projectile.userData.physicsBody.setLinearVelocity(linearVelocity);

    // Store the projectile in the projectiles array for future reference
    projectiles.push(projectile);
  }, undefined, function (error) {
    console.log("error");
  });
}

function updatePhysics( deltaTime ){    
    physicsWorld.stepSimulation( deltaTime, 10 );
    
    for ( let i = 0; i < rigidBodies.length; i++ ) {
        let objThree = rigidBodies[ i ];
        let objAmmo = objThree.userData.physicsBody;
        let ms = objAmmo.getMotionState();
        if ( ms ) {
            ms.getWorldTransform( tmpTrans );
            let p = tmpTrans.getOrigin();
            let q = tmpTrans.getRotation();
            objThree.position.set( p.x(), p.y(), p.z() );
            objThree.quaternion.set( q.x(), q.y(), q.z(), q.w() );
        }
    }
}

function updateColision(deltaTime) {
  physicsWorld.stepSimulation(deltaTime, 10);

  for (let i = projectiles.length - 1; i >= 0; i--) {
    let projectile = projectiles[i];
    let objAmmo = projectile.userData.physicsBody;
    let ms = objAmmo.getMotionState();

    if (ms) {
      ms.getWorldTransform(tmpTrans);
      let p = tmpTrans.getOrigin();

      for (let j = 0; j < objectsToCheckForCollision.length; j++) {
        let objectToCheck = objectsToCheckForCollision[j];
        if (checkCollisionWithObject(projectile, objectToCheck)) {

          scene.remove(projectile);
          projectiles.splice(i, 1);

          scene.remove(objectToCheck);
          // You can also remove the object's physics body from the physics world if needed
          // physicsWorld.removeRigidBody(objectToCheck.userData.physicsBody);
        }
      }
    }
  }
}

function checkCollisionWithObject(projectile, objectToCheck) {
  let projectileBox = new THREE.Box3().setFromObject(projectile);
  let objectBox = new THREE.Box3().setFromObject(objectToCheck);

  return projectileBox.intersectsBox(objectBox);
}

function checkCollisionWithCollectableItem() {
  if (!ballObject) return;

  for (let i = collectables.length - 1; i >= 0; i--) {
    const collectable = collectables[i];

    if (checkCollisionWithObject(ballObject, collectable)) {
      // Handle collection logic here
      console.log("Collectable collected");
      scene.remove(collectable);
      collectables.splice(i, 1);
      recoillShoot = 100
    }
  }
}