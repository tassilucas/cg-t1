import * as THREE from  'three';
import Stats from '../build/jsm/libs/stats.module.js';
import GUI from '../libs/util/dat.gui.module.js'
import KeyboardState from '../libs/util/KeyboardState.js'
import {TrackballControls} from '../build/jsm/controls/TrackballControls.js';
import {GLTFLoader} from '../build/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from '../build/jsm/controls/OrbitControls.js';
import {initRenderer, 
        setDefaultMaterial,
        initDefaultBasicLight,
        createGroundPlane,
        createGroundPlaneWired,
        getMaxSize,
        onWindowResize,
        createLightSphere} from "../libs/util/util.js";
import {CSG} from "../libs/other/CSGMesh.js";

var keyboard = new KeyboardState();

var scene = new THREE.Scene();
var clock = new THREE.Clock();
var material = setDefaultMaterial("#f7e89a");

var renderer = initRenderer();
renderer.setClearColor("rgb(30, 30, 42)");

// Dimetric perspective
const frustumSize = 50;
const aspect = window.innerWidth / window.innerHeight;
let camera = new THREE.OrthographicCamera(frustumSize * aspect / - 2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / - 2, 0.1, 100);
camera.position.setFromSphericalCoords(30, Math.PI / 3, Math.PI / 4);
camera.lookAt(scene.position);

let orbit = new OrbitControls( camera, renderer.domElement ); // Enable mouse rotation, pan, zoom etc.]

// Character controllers
const keysPressed = {}
document.addEventListener('keydown', (event) => { keysPressed[event.key.toLowerCase()] = true }, false);
document.addEventListener('keyup', (event) => { keysPressed[event.key.toLowerCase()] = false }, false);

var directionOffset;

var box = undefined;
var mesh = undefined;
var imaginaryBox = undefined;
var helper = undefined;

var lastDirection = undefined;
var collision = false;

const A = "a";
const W = "w";
const D = "d";
const S = "s";

// Raycasting config to select objects
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
resetMouse();
renderer.domElement.addEventListener('click', onPointerClick, true);

var debug = true;

// Colors
const colorOutline = "#f7e89a";
const edgeOutline = "#a3985e";

const colorBlockArea2 = "#A8BC9F";
const edgeBlockArea2 = "#454D42";

const colorRandom = "#C4B454";
const edgeRandom = "#9b8a36";

const colorTile = "#fce883";
const edgeTile = "#8C8148";

//----------------------------------------------------------------------------
var man = undefined;
var time = 0;
var mixer = new Array();
var mixerAnimations = new Array();

var rotateAngle = new THREE.Vector3(0, 1, 0);
var rotateQuarternion = new THREE.Quaternion();

var cubes = [];
var highlightedCube = undefined;

let door1, door2, door3;
let doors = [];

let blocosPonte = [[false, false], [false, false], [false, false]];

let blocosPlataforma = [];
let arrayPlataforma = [false, false, false]

let blueKey = undefined, blueKeyBox = undefined;
let redKey = undefined, redKeyBox = undefined;
let yellowKey = undefined, yellowKeyBox = undefined;

let area2Bridge = undefined;
let area3Bridge = undefined;

let interruptores = [];
let blocosInterruptores = [];
let arrayInterruptores = [false, false, false];
let area3Actioned = false;

let plataformaEnd;

// Load animated files
loadGLTFFile('../assets/objects/walkingMan.glb', true);

function setup(){
  // Imaginary box
  const imaginaryBoxGeometry = new THREE.BoxGeometry(1, 3, 1);
  const imaginaryBoxEdges = new THREE.EdgesGeometry(imaginaryBoxGeometry);
  imaginaryBox = new THREE.LineSegments(imaginaryBoxEdges, new THREE.LineBasicMaterial({color: 0xffffff}));
  imaginaryBox.position.y = 4;

  // Box config.
  box = new THREE.Box3().setFromObject(imaginaryBox);
  helper = new THREE.BoxHelper(imaginaryBox, 0xffff00);
  scene.add(helper);

  contornaPlano();
  createDoors();

  // Main plane
  createTileGround(0, 0, 0, 52, 52, true);

  // Area 1
  createTileGround(0, -3, -50, 52, 32, true, 0xEAEA97);

  // Area 2
  createTileGround(0, 3, 50, 52, 32, true, 0xD2EBC7);

  // Area 3
  createTileGround(63, -3, 3, 52, 52, true, 0xEAEA97);

  // Area 4
  createTileGround(-30, 0, 0, 20, 20, true);
  plataformaEnd = addCube(-33, 0, 0, true, colorOutline, edgeOutline, 2, 0.1, 2, 2);

  area1Setup();
  area2Setup();
  area3Setup();
}

function area1Setup(){
  // Area 1 directional lights
  let lightPosition = new THREE.Vector3(15, 10, -60);
  let lightColor = "rgb(255, 255, 255)";
  let dirLight = new THREE.DirectionalLight(lightColor, 0.8);
  
  dirLight.position.copy(lightPosition);
  dirLight.target.position.set(0, -10, -60);

  dirLight.castShadow = true;
  dirLight.shadow.camera.top = 26;
  dirLight.shadow.camera.bottom = - 20;
  dirLight.shadow.camera.left = - 26;
  dirLight.shadow.camera.right = 26;
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 35;

  scene.add(dirLight);
  scene.add(dirLight.target);
  scene.add(new THREE.CameraHelper(dirLight.shadow.camera));

  // Key area
  createTileGround(0, -3, -75, 10, 10, true);
  let geometry = new THREE.SphereGeometry(1, 32, 16);
  let material = new THREE.MeshBasicMaterial({color: 0x4FA7F7});
  blueKey = new THREE.Mesh(geometry, material);
  blueKey.castShadow = true;
  blueKey.position.z = -77;
  blueKey.position.y = -2;
  blueKey.position.x = 0;
  blueKeyBox = new THREE.Box3().setFromObject(blueKey);
  scene.add(blueKey);

  // Area
  addCube(-10, -2, -50, true, colorOutline, edgeOutline, 2, 2, 2, 2);
  addCube(10, -2, -50, true, colorOutline, edgeOutline, 2, 2, 2, 2);
  addCube(-10, -2, -60, true, colorOutline, edgeOutline, 2, 2, 2, 2);
  addCube(10, -2, -60, true, colorOutline, edgeOutline, 2, 2, 2, 2);
  addCube(0, -2, -50, true, colorOutline, edgeOutline, 2, 2, 2, 2);
  addCube(0, -2, -60, true, colorOutline, edgeOutline, 2, 2, 2, 2);
}

function area2Setup(){
  // Area 2 directional lights
  let lightPosition = new THREE.Vector3(15, 10, 40);
  let lightColor = "rgb(255, 255, 255)";
  let dirLight = new THREE.DirectionalLight(lightColor, 0);
  
  dirLight.position.copy(lightPosition);
  dirLight.target.position.set(0, -10, 40);

  dirLight.castShadow = true;
  dirLight.shadow.camera.top = 26;
  dirLight.shadow.camera.bottom = -20;
  dirLight.shadow.camera.left = -35;
  dirLight.shadow.camera.right = 16;
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 35;

  scene.add(dirLight);
  scene.add(dirLight.target);
  scene.add(new THREE.CameraHelper(dirLight.shadow.camera));

  // Key area
  createTileGround(0, 3, 71, 10, 10, true);
  let geometry = new THREE.SphereGeometry(1, 32, 16);
  let material = new THREE.MeshBasicMaterial({color: 0xd0312d});
  redKey = new THREE.Mesh(geometry, material);
  redKey.castShadow = true;
  redKey.position.z = 70;
  redKey.position.y = 4;
  redKey.position.x = 0;
  redKeyBox = new THREE.Box3().setFromObject(redKey);
  scene.add(redKey);
  
  // Key area ->> adding the key bridge
  area2Bridge = addCube(0, 3.35, 65, false, "#ff0fff", "#ff0fff", 10, 5, 2, 2);

  // Area
  addCube(-10, 4, 50, true, "#FF9900", "#A36200", 2, 2, 2, 2);
  addCube(10, 4, 50, true, "#FF9900", "#A36200", 2, 2, 2, 2);
  addCube(0, 4, 50, true, "#FF9900", "#A36200", 2, 2, 2, 2);

  blocosPlataforma.push(addCube(-10, 3.35, 60, false, colorBlockArea2, edgeBlockArea2, 2, 0.25, 2, 2));
  blocosPlataforma.push(addCube(10, 3.35, 60, false, colorBlockArea2, edgeBlockArea2, 2, 0.25, 2, 2));
  blocosPlataforma.push(addCube(0, 3.35, 60, false, colorBlockArea2, edgeBlockArea2, 2, 0.25, 2, 2));
}

function area3Setup(){
  let inicioArea = 62.5
  let finalArea = 37.5 + 52;

  let posInterruptor = 37 + 6.5;

  // Create walls
  addCube(inicioArea, 1.5, -24, false, "rgb(128, 128, 128)", "rgb(0, 0, 0)", 52, 10, 1, 2);

  // Interruptores
  for(let i=0; i<4; i++){
    let cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    let material = setDefaultMaterial("rgb(0, 0, 0)");
    material.emissive = new THREE.Color(0xffff00);

    let cube = new THREE.Mesh(cubeGeometry, material);
    cube.castShadow = true;

    let spotLight = new THREE.SpotLight("rgb(255, 255, 255)");
    spotLight.position.copy(new THREE.Vector3(posInterruptor, 20, -20));
    spotLight.distance = 0;
    spotLight.castShadow = true;
    spotLight.decay = 2;
    spotLight.penumbra = 0.9;
    spotLight.angle = THREE.MathUtils.degToRad(20);

    spotLight.target.position.set(posInterruptor, 0, -20);

    // Shadow Parameters
    spotLight.shadow.mapSize.width = 100;
    spotLight.shadow.mapSize.height = 100;
    spotLight.shadow.camera.fov = THREE.MathUtils.degToRad(10);
    spotLight.shadow.camera.near = .1;    
    spotLight.shadow.camera.far = 10;

    interruptores.push({mesh: cube, light: spotLight});
    cube.position.set(posInterruptor, 2, -23.5);

    scene.add(spotLight.target);
    scene.add(spotLight);
    scene.add(cube);

    posInterruptor += 13;
  }

  posInterruptor = 37 + 6.5;

  for(let i=0; i<4; i++){
    let cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    let material = setDefaultMaterial("rgb(0, 0, 0)");
    material.emissive = new THREE.Color(0xffff00);

    let cube = new THREE.Mesh(cubeGeometry, material);
    cube.castShadow = true;

    let spotLight = new THREE.SpotLight("rgb(255, 255, 255)");
    spotLight.position.copy(new THREE.Vector3(posInterruptor, 20, 20));
    spotLight.distance = 0;
    spotLight.castShadow = true;
    spotLight.decay = 2;
    spotLight.penumbra = 0.9;
    spotLight.angle = THREE.MathUtils.degToRad(20);

    spotLight.target.position.set(posInterruptor, 0, 20);

    // Shadow Parameters
    spotLight.shadow.mapSize.width = 100;
    spotLight.shadow.mapSize.height = 100;
    spotLight.shadow.camera.fov = THREE.MathUtils.degToRad(10);
    spotLight.shadow.camera.near = .1;    
    spotLight.shadow.camera.far = 10;

    interruptores.push({mesh: cube, light: spotLight});
    cube.position.set(posInterruptor, 2, 23.5);

    scene.add(spotLight.target);
    scene.add(spotLight);
    scene.add(cube);

    posInterruptor += 13;
  }

  // Key area
  createTileGround(94, -3, 0, 10, 10, true);
  let geometry = new THREE.SphereGeometry(1, 32, 16);
  let material = new THREE.MeshBasicMaterial({color: 0xFFFF66});
  yellowKey = new THREE.Mesh(geometry, material);
  yellowKey.castShadow = true;
  yellowKey.position.z = 0;
  yellowKey.position.y = -2;
  yellowKey.position.x = 94;
  yellowKeyBox = new THREE.Box3().setFromObject(yellowKey);
  scene.add(yellowKey);

  // Key area ->> adding the key bridge
  area3Bridge = addCube(88, -3, 0, false, "#ff0fff", "#ff0fff", 10, 5, 2, 2);
  area3Bridge.rotateY(THREE.MathUtils.degToRad(90));

  // Area
  addCube(36+6.5, -2, -18, true, "#FF9900", "#A36200", 2, 2, 2, 2);
  addCube(36+26+6.5, -2, -18, true, "#FF9900", "#A36200", 2, 2, 2, 2);

  blocosInterruptores.push(addCube(36+20, -2.75, -18, false, colorBlockArea2, edgeBlockArea2, 2, 0.25, 2, 2));
  blocosInterruptores.push(addCube(36+46, -2.75, -18, false, colorBlockArea2, edgeBlockArea2, 2, 0.25, 2, 2));
}

setup();
render();

function randomInteger(min, max) {
  let integer = Math.floor(Math.random() * (max - min)) + min;
  return (integer % 2 == 0) ? integer + 1 : integer;
}

function createDoors(){
  // Base objects
  let cubeMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 8, 6));
  let insideMesh = new THREE.Mesh(new THREE.BoxGeometry(5, 7, 4));

  // CSG holders
  let csgObject, cubeCSG, cylinderCSG;

  // Object 2 - Cube INTERSECT Cylinder
  insideMesh.position.set(1, -0.5, 0.0)
  insideMesh.matrixAutoUpdate = false;
  insideMesh.updateMatrix();
  cylinderCSG = CSG.fromMesh(insideMesh)
  cubeCSG = CSG.fromMesh(cubeMesh)   
  csgObject = cubeCSG.subtract(cylinderCSG) // Execute intersection

  door1 = CSG.toMesh(csgObject, new THREE.Matrix4())
  door1.material = new THREE.MeshPhongMaterial({color: 'lightblue'})
  door1.position.set(-25, 4, -1)
  door1.castShadow = true;

  door1.lock = addCube(-25, 3.5, -1, false, colorOutline, edgeOutline, 2, 7, 4, 2);
  door1.lock.open = false;

  door2 = door1.clone();
  door2.position.set(25, 4, -1);
  door2.castShadow = true;

  door2.lock = addCube(25, 3.5, -1, false, colorOutline, edgeOutline, 2, 7, 4, 2);
  door2.lock.open = false;

  door3 = door1.clone();
  door3.rotateY(Math.PI/2);
  door3.position.set(1, 4, 25);
  door3.castShadow = true;

  door3.lock = addCube(1, 3.5, 25, false, colorOutline, edgeOutline, 4, 7, 2, 2);
  door3.lock.open = false;

  doors.push(door1);
  doors.push(door2);
  doors.push(door3);

  scene.add(door1)
  scene.add(door2)
  scene.add(door3)
}

function contornaPlano(){
  for(let x=-23; x<-1; x = x + 2){
    addCube(x, 1, 25, false, colorOutline, edgeOutline, 2, 2, 2, 2);
    addCube(x, 1, -25, false, colorOutline, edgeOutline, 2, 2, 2, 2);
  }

  for(let x=5; x<=23; x = x + 2){
    addCube(x, 1, 25, false, colorOutline, edgeOutline, 2, 2, 2, 2);
    addCube(x, 1, -25, false, colorOutline, edgeOutline, 2, 2, 2, 2);
  }

  for(let z=3; z<25; z = z + 2){
    addCube(25, 1, z, false, colorOutline, edgeOutline, 2, 2, 2, 2);
    addCube(-25, 1, z, false, colorOutline, edgeOutline, 2, 2, 2, 2);
  }

  for(let z=-23; z<-3; z = z + 2){
    addCube(25, 1, z, false, colorOutline, edgeOutline, 2, 2, 2, 2);
    addCube(-25, 1, z, false, colorOutline, edgeOutline, 2, 2, 2, 2);
  }
}

function createTileGround(x, y, z, largura, altura, tiled, gcolor){
  let groundPlane = createGroundPlane(largura, altura, 50, 50, gcolor);
  groundPlane.rotateX(THREE.MathUtils.degToRad(-90));
  scene.add(groundPlane);

  groundPlane.position.set(x, y, z);
}

function loadGLTFFile(modelName, player)
{
  var loader = new GLTFLoader( );
  loader.load(modelName, function (gltf){

    gltf.scene.traverse(function(node){
      if(node.isMesh){
        node.castShadow = true;
      }
    });

    var obj = gltf.scene;
    if(player){
      man = obj;
      man.blueKey = man.redKey = man.yellowKey = false;
      man.castShadow = true;
      man.rotateY(3);
      man.position.y = -3;
    }

    scene.add(obj);

    var mixerLocal = new THREE.AnimationMixer(obj);
    mixer.push(mixerLocal);
    mixerAnimations.push(gltf.animations)
    });
}

function findDirectionOffset(keysPressed) {
  var directionOffset = Math.PI // w

  if (keysPressed[S]) {
      if (keysPressed[A]) {
        directionOffset = - Math.PI / 4 // w+a
      } else if (keysPressed[D]) {
        directionOffset = Math.PI / 4 // w+d
      }
      else{
        directionOffset = 0;
      }
  } else if (keysPressed[W]) {
      if (keysPressed[A]) {
          directionOffset =  Math.PI + Math.PI / 4 // s+a
      } else if (keysPressed[D]) {
          directionOffset = Math.PI - Math.PI / 4 // s+d
      } else {
          directionOffset = Math.PI // s
      }
  } else if (keysPressed[A]) {
      directionOffset = - Math.PI / 2 // a
  } else if (keysPressed[D]) {
      directionOffset = Math.PI / 2 // d
  }

  return directionOffset
}

function isColliding(){
  for(let i=0; i<cubes.length; i++)
    if(box.intersectsBox(cubes[i].box)){
      console.log("Collision detected");
      return true;
    }

  return false;
}

function canMove(collisionFace, newDirection){
  if(collisionFace == Math.PI &&
    (newDirection == collisionFace - Math.PI/4
      || newDirection == collisionFace + Math.PI/4))
    return false;

  if(collisionFace == Math.PI/2 &&
    (newDirection == collisionFace - Math.PI/4
      || newDirection == collisionFace + Math.PI/4))
    return false;

  if(collisionFace == 0 &&
    (newDirection == collisionFace - Math.PI/4
      || newDirection == collisionFace + Math.PI/4))
    return false;

  if(collisionFace == -Math.PI/2 &&
    (newDirection == Math.PI + Math.PI/4
      || newDirection == collisionFace + Math.PI/4))
    return false;

  return true;
}

function movePlayer(manSpeed, directionOffset){
  let playerPosition = man.position.clone();

  let vSpeed = manSpeed*Math.cos(directionOffset);
  let hSpeed = manSpeed*Math.sin(directionOffset);

  playerPosition.z += vSpeed;
  playerPosition.x += hSpeed;

  man.position.lerp(playerPosition, 0.01);
  imaginaryBox.position.lerp(playerPosition, 0.01);
}

function updateCubeBox(){
  for(let i=0; i<cubes.length; i++)
    cubes[i].box.setFromObject(cubes[i].cube);
}

function updateMan(delta)
{
  const manSpeed = 10;
  const directionPressed = [W, A, S, D].some(key => keysPressed[key] == true)

  if(directionPressed){
    directionOffset = findDirectionOffset(keysPressed);

    // Rotating player
    rotateQuarternion.setFromAxisAngle(rotateAngle, directionOffset);
    man.quaternion.slerp(rotateQuarternion, 0.1);
    movePlayer(manSpeed, directionOffset);

    if(movingBlock()){
      highlightedCube.quaternion.slerp(rotateQuarternion, 0.1);
      highlightedCube.position.copy(man.position);
      highlightedCube.position.z = highlightedCube.position.z - 1;
      highlightedCube.position.y = man.position.y + 1.5;
    }

    if(directionOffset == Math.PI || directionOffset == 0 || directionOffset == Math.PI / 2 || directionOffset == - Math.PI / 2)
      imaginaryBox.quaternion.slerp(rotateQuarternion, 1);

    // Update player box
    box.setFromObject(imaginaryBox);

    // Update cube box
    updateCubeBox();
  }
}

function updateCamera(){
  camera.position.setFromSphericalCoords(30, Math.PI / 3, Math.PI / 4);
  camera.position.x = 20 + man.position.x
  camera.position.z = 20 + man.position.z
  camera.lookAt(man.position);
}

function addCube(x, y, z, clickable, color, edge, i, j, k, linewidth){
  let cubeGeometry = new THREE.BoxGeometry(i, j, k);
  let cube = new THREE.Mesh(cubeGeometry, setDefaultMaterial(color));
  cube.position.set(x, y, z);

  // Default y cube coordinates
  cube.defaultY = y;

  var edgeGeometry = new THREE.EdgesGeometry(cube.geometry);
  let edgeMaterial = new THREE.LineBasicMaterial({ color: edge, linewidth: linewidth });
  var edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
  cube.add(edges);

  // Adding also colliding box
  cube.cube = cube;
  cube.box = new THREE.Box3().setFromObject(cube);
  cube.helper = new THREE.BoxHelper(cube, 0xffffff);
  cube.rotateY(Math.PI);

  // If cube is interactive
  cube.clickable = clickable;
  cube.castShadow = true;
  cube.receiveShadow = true;

  scene.add(cube);
  scene.add(cube.helper);
  cubes.push(cube);

  return cube;
}

function onPointerClick(event){
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;
}

function placeBlocoPonte(i, j){
  // insert lerp method
  highlightedCube.position.y = highlightedCube.position.y - 2;

  if(i == 0 && j == 0){
    highlightedCube.position.z = -66;
    highlightedCube.position.x = -1;
  }

  if(i == 0 && j == 1){
    highlightedCube.position.z = -66;
    highlightedCube.position.x = 1;
  }

  if(i == 1 && j == 0){
    highlightedCube.position.z = -68;
    highlightedCube.position.x = -1;
  }

  if(i == 1 && j == 1){
    highlightedCube.position.z = -68;
    highlightedCube.position.x = 1;
  }

  if(i == 2 && j == 0){
    highlightedCube.position.z = -70;
    highlightedCube.position.x = -1;
  }

  if(i == 2 && j == 1){
    highlightedCube.position.z = -70;
    highlightedCube.position.x = 1;
  }
}

function checkPlataforma(){
  for(let i=0; i<3; i++)
    if(blocosPlataforma[i].box.intersectsBox(highlightedCube.box)){
      blocosPlataforma[i].position.y = man.position.y;
      arrayPlataforma[i] = true;
    }
}

function checkPlataformaInterruptores(){
  for(let i=0; i<2; i++){
    if(blocosInterruptores[i].box.intersectsBox(highlightedCube.box)){
      blocosInterruptores[i].position.y = man.position.y;
      arrayInterruptores[i] = true;
    }
  }
}

function soltarBloco(){
  // highlightedCube.position.y = man.position.y + 1;
  highlightedCube.position.y = highlightedCube.defaultY;
  updateCubeBox();

  // Check if it is on top of another plataforma block
  checkPlataforma();

  // Check if area3 plataformas are active
  checkPlataformaInterruptores();

  // Check if is inside bridge range (area 1)
  if((highlightedCube.position.z <= -66 && highlightedCube.position.z >= -76) &&
     (highlightedCube.position.x >= -2 && highlightedCube.position.x <= 2))
  {
    // Find next empty place on bridge
    for(let i=0; i<3; i++){
      for(let j=0; j<2; j++){
        if(blocosPonte[i][j] == false){
          blocosPonte[i][j] = true;
          placeBlocoPonte(i, j);
          return;
        }
      }
    }
  }
}

function highlightIntersectedCubes(){
  const intersects = raycaster.intersectObjects(cubes);

  for(let i=0; i<intersects.length; i++){
    if(intersects[i].object.clickable){

      if(intersects[i].object.selected){
        intersects[i].object.material = intersects[i].object.lastMaterial;
        intersects[i].object.selected = false;
        soltarBloco();
        highlightedCube = undefined;
      }
      else{
        highlightedCube = intersects[i].object;
        intersects[i].object.lastMaterial = intersects[i].object.material;
        intersects[i].object.material = new THREE.MeshLambertMaterial({color: "rgb(0, 255, 0)"});
        intersects[i].object.selected = true;
      }
    }
  }

  resetMouse()
}

function turnAllLightsOnArea3(){
  for(let i=0; i<interruptores.length; i++){
    console.log("Ligando tudo");
    let inter = interruptores[i];
    inter.light.intensity = 0.8;

  }
}

function resetMouse(){
  pointer.x = pointer.y = -10000;
}

function movingBlock(){
  return highlightedCube != undefined && box.intersectsBox(highlightedCube.box)
}

function checkInterruptores(){
  if(!area3Actioned){
    for(let i=0; i<4; i++){
      let inter = interruptores[i];
      if((man.position.x >= inter.mesh.position.x-6.5 && man.position.x <= inter.mesh.position.x+6.5)
        && man.position.z <= -13){
        inter.light.intensity = 0.8;
      }
      else{
        inter.light.intensity = 0;
      }
    }

    for(let i=4; i<8; i++){
      let inter = interruptores[i];
      if((man.position.x >= inter.mesh.position.x-6.5 && man.position.x <= inter.mesh.position.x+6.5)
        && man.position.z >= 13){
        inter.light.intensity = 0.8;
      }
      else{
        inter.light.intensity = 0;
      }
    }
  }
}

function openDoors(){
  for(let i=0; i<doors.length; i++){
    let door = doors[i];

    if((man.position.z >= door.position.z - 20 && man.position.z <= door.position.z + 10)
      && (man.position.x >= door.position.x - 10 && man.position.x <= door.position.x + 10)){
      if(!door.lock.open)
        if((i == 2 && man.blueKey) || (i == 0 && man.yellowKey) || (i == 1 && man.redKey))
          door.lock.position.y = -3.5;
    }
    else{
      door.lock.position.y = 3.5;
      door.lock.open = false;
    }
  }
}

function checkEndGame(){
  // Check if player is inside area3 plataforma
  if((man.position.x <= plataformaEnd.position.x + 1 && man.position.x >= plataformaEnd.position.x - 1)
    && (man.position.z >= plataformaEnd.position.z - 1 && man.position.z <= plataformaEnd.position.z + 1)){
    if(man.blueKey & man.redKey && man.yellowKey){
      // Display winning text
    }
  }
}

function render()
{
  // Resize camera
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );

  requestAnimationFrame(render);

  raycaster.setFromCamera(pointer, camera);
  highlightIntersectedCubes();

  // Working on man animation
  var delta = clock.getDelta();
  for(var i = 0; i<mixer.length; i++)
    mixer[i].update(delta);
  mixer[0].clipAction(mixerAnimations[0][0]).play();

  // Working on man moves
  updateMan(delta);
  helper.update();

  for(let i=0; i<cubes.length; i++)
    cubes[i].helper.update();

  updateCamera();

  // If player picks blue key
  if(blueKey != undefined)
    if(blueKeyBox.intersectsBox(box)){
      scene.remove(blueKey);
      console.log("Você pegou a chave azul");
      blueKey = blueKeyBox = undefined;
      man.blueKey = true;
    }

  // If player picks blue key
  if(redKey != undefined)
    if(redKeyBox.intersectsBox(box)){
      scene.remove(redKey);
      console.log("Você pegou a chave vermelha");
      redKey = redKeyBox = undefined;
      man.redKey = true;
    }

  // If player picks yellow key
  if(yellowKey != undefined)
    if(yellowKeyBox.intersectsBox(box)){
      scene.remove(yellowKey);
      console.log("Você pegou a chave amarela");
      yellowKey = yellowKeyBox = undefined;
      man.yellowKey = true;
    }

  // Checking for turn light on (area 3)
  checkInterruptores();

  // Checking for plataforma condition (area 2)
  if(arrayPlataforma[0] && arrayPlataforma[1] && arrayPlataforma[2]){
    area2Bridge.translateY(-3.5);
    // just to stop the bridge from looping forever
    arrayPlataforma[0] = false;
  }

  // Checking if we need to open some doors
  openDoors();

  // Checking for plataforma condition (area 3)
  if(arrayInterruptores[0] && arrayInterruptores[1]){
    area3Bridge.translateY(-3.5);
    turnAllLightsOnArea3();
    area3Actioned = true;
    // just to stop the bridge from looping forever
    arrayInterruptores[0] = false;
  }

  // Checking end game
  checkEndGame();

  renderer.render(scene, camera);
}
