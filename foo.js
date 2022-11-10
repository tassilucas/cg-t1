import * as THREE from  'three';
import Stats from '../build/jsm/libs/stats.module.js';
import GUI from '../libs/util/dat.gui.module.js'
import KeyboardState from '../libs/util/KeyboardState.js'
import {TrackballControls} from '../build/jsm/controls/TrackballControls.js';
import {GLTFLoader} from '../build/jsm/loaders/GLTFLoader.js'
import {initRenderer, 
        setDefaultMaterial,
        initDefaultBasicLight,
        createGroundPlane,
        createGroundPlaneWired,
        getMaxSize,
        onWindowResize} from "../libs/util/util.js";
import {CSG} from "../libs/other/CSGMesh.js";

var keyboard = new KeyboardState();

var scene = new THREE.Scene();
var clock = new THREE.Clock();
var material = setDefaultMaterial("#f7e89a");
initDefaultBasicLight(scene);

var renderer = initRenderer();
renderer.setClearColor("rgb(30, 30, 42)");

// Dimetric perspective
const frustumSize = 25;
const aspect = window.innerWidth / window.innerHeight;
let camera = new THREE.OrthographicCamera(frustumSize * aspect / - 2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / - 2, 0.1, 100);
camera.position.setFromSphericalCoords(30, Math.PI / 3, Math.PI / 4);
camera.lookAt(scene.position);

window.addEventListener('resize', function(){onWindowResize(camera, renderer)}, true);

var axesHelper = new THREE.AxesHelper( 2 );
axesHelper.visible = true;
scene.add(axesHelper);

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

let door1, door2, door3;

// Load animated files
loadGLTFFile('../assets/objects/walkingMan.glb');

function setup(){
  contornaPlano();
  createDoors();

  // Main plane
  createTileGround(0, 0, 0, 52, 52, true);

  // Area 1
  createTileGround(63, -3, 3, 52, 52, true);

  // Area 2
  createTileGround(-63, -3, 3, 52, 52, true);

  // Area 3
  createTileGround(0, -3, -60, 52, 52, true);

  // Area 4
  createTileGround(0, -3, 60, 52, 52, true);
}

setup();
render();

function randomInteger(min, max) {
  let integer = Math.floor(Math.random() * (max - min) ) + min;
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

  door2 = door1.clone();
  door2.position.set(25, 4, -1);

  door3 = door1.clone();
  door3.rotateY(Math.PI/2);
  door3.position.set(1, 4, 25);

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

function createTileGround(x, y, z, largura, altura, tiled){
  let planeGeometry = new THREE.PlaneGeometry(largura, altura, 50, 50);
  var planeMaterial = new THREE.MeshPhongMaterial({
    color: colorTile,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1
  });

  var plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.position.set(x, y, z);
  plane.rotateX(-Math.PI/2);

  if(tiled){
    const gridHelper = new THREE.GridHelper(largura, largura/2, edgeTile, edgeTile);
    gridHelper.position.set(x, y, z);
    gridHelper.material.linewidth = 3.5;
    scene.add(gridHelper);
  }

  scene.add(plane);
}

function loadGLTFFile(modelName)
{
  var loader = new GLTFLoader( );
  loader.load( modelName, function ( gltf ) {
    var obj = gltf.scene;

    man = obj;
    man.rotateY(3);
    scene.add(man);

    var mixerLocal = new THREE.AnimationMixer(obj);
    mixer.push(mixerLocal);
    mixerAnimations.push(gltf.animations)

    // Imaginary box
    const imaginaryBoxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const imaginaryBoxEdges = new THREE.EdgesGeometry(imaginaryBoxGeometry);
    imaginaryBox = new THREE.LineSegments(imaginaryBoxEdges, new THREE.LineBasicMaterial({color: 0xffffff}));

    // Box config.
    box = new THREE.Box3().setFromObject(imaginaryBox);
    helper = new THREE.BoxHelper(imaginaryBox, 0xffff00);
    // scene.add(helper);
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

function updateMan(delta)
{
  const manSpeed = 10;
  const directionPressed = [W, A, S, D].some(key => keysPressed[key] == true)

  if(directionPressed){
    directionOffset = findDirectionOffset(keysPressed);

    // Rotating player
    rotateQuarternion.setFromAxisAngle(rotateAngle, directionOffset);
    man.quaternion.slerp(rotateQuarternion, 0.1);

    if(directionOffset == Math.PI || directionOffset == 0 || directionOffset == Math.PI / 2 || directionOffset == - Math.PI / 2)
      imaginaryBox.quaternion.slerp(rotateQuarternion, 1);

    box.setFromObject(imaginaryBox);

    if(lastDirection != directionOffset){
      if(canMove(lastDirection, directionOffset))
        movePlayer(manSpeed, directionOffset);
    }

    if(isColliding()){
      // Grabbing the face of collision
      if(lastDirection == undefined)
        lastDirection = directionOffset;
    }
    else
      lastDirection = undefined;
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
  cube.castShadow = true;
  cube.receiveShadow = true;

  var edgeGeometry = new THREE.EdgesGeometry(cube.geometry);
  let edgeMaterial = new THREE.LineBasicMaterial({ color: edge, linewidth: linewidth });
  var edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
  cube.add(edges);

  // Adding also colliding box
  cube.box = new THREE.Box3().setFromObject(cube);

  // If cube is interactive
  cube.clickable = clickable;

  scene.add(cube);
  cubes.push(cube);
}

function onPointerClick(event){
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;
}

function highlightIntersectedCubes(){
  const intersects = raycaster.intersectObjects(cubes);

  for(let i=0; i<intersects.length; i++){
    if(intersects[i].object.clickable){

      if(intersects[i].object.selected){
        intersects[i].object.material = intersects[i].object.lastMaterial;
        intersects[i].object.selected = false;
      }
      else{
        intersects[i].object.lastMaterial = intersects[i].object.material;
        intersects[i].object.material = new THREE.MeshLambertMaterial({color: "rgb(0, 255, 0)"});
        intersects[i].object.selected = true;
      }
    }
  }

  resetMouse()
}

function resetMouse(){
  pointer.x = pointer.y = -10000;
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

  updateCamera();

  renderer.render(scene, camera);
}
