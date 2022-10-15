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

var keyboard = new KeyboardState();

var scene = new THREE.Scene();
var clock = new THREE.Clock();
var material = setDefaultMaterial("#f7e89a");
initDefaultBasicLight(scene);

var renderer = initRenderer();
renderer.setClearColor("rgb(30, 30, 42)");

const aspect = window.innerWidth/window.innerHeight;
const distance = 10

// Camera styles
var parallelCamera = new THREE.OrthographicCamera(-distance*aspect, distance*aspect, distance, -distance, 1, 1000);
var perspectiveCamera = new THREE.PerspectiveCamera(5.7, aspect, 0.1, 1000);

// Current camera. Using parallel viewing as default.
var camera = parallelCamera;
camera.position.set(120, 120, 120);
camera.lookAt(scene.position);

window.addEventListener('resize', function(){onWindowResize(camera, renderer)}, true);

var secondPlane = createGroundPlane(200, 200, 60, 60, "#cdbb59");
secondPlane.rotateX(THREE.MathUtils.degToRad(-90));
secondPlane.translateZ(-0.1)
scene.add(secondPlane);

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

// Load animated files
loadGLTFFile('../assets/objects/walkingMan.glb');

generateRandomCubes();
contornaPlano();
createTileGround();

render();

function randomInteger(min, max) {
  let integer = Math.floor(Math.random() * (max - min) ) + min;
  return (integer % 2 == 0) ? integer + 1 : integer;
}

function contornaPlano(){
  for(let z=-49; z<=49; z = z + 2){
    addCube(-49, 1, z, false, colorOutline, edgeOutline, 2, 2, 2, 2);
    addCube(49, 1, z, false, colorOutline, edgeOutline, 2, 2, 2, 2);
  }

  for(let x=-47; x<=47; x = x + 2){
    addCube(x, 1, -49, false, colorOutline, edgeOutline, 2, 2, 2, 2);
    addCube(x, 1, 49, false, colorOutline, edgeOutline, 2, 2, 2, 2);
  }
}

function createTileGround(){
  let planeGeometry = new THREE.PlaneGeometry(100, 100, 50, 50);
  var planeMaterial = new THREE.MeshPhongMaterial({
    color: colorTile,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1
  });

  var plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotateX(-Math.PI/2);

  const gridHelper = new THREE.GridHelper(100, 50, edgeTile, edgeTile);
  gridHelper.material.linewidth = 3.5;

  scene.add(gridHelper);
  scene.add(plane);
}

function generateRandomCubes(){
  let randomCubes = 30;

  for(let i=0; i<randomCubes; i++){
      let x = randomInteger(-48, 48);
      let z = randomInteger(-48, 48);

      addCube(x, 1, z, true, colorRandom, edgeRandom, 2, 2, 2);
  }
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
    scene.add(helper);
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

function noProblems(lastDirection, directionOffset){
  if(lastDirection == 0 || lastDirection == Math.PI || lastDirection == Math.PI / 2){
    if(directionOffset - Math.PI/4 == lastDirection || directionOffset + Math.PI/4 == lastDirection)
      return false
  }

  if(lastDirection == -Math.PI / 2){
    if(directionOffset == Math.PI / 4 + Math.PI || directionOffset - Math.PI/4 == lastDirection)
      return false
  }

  return true;
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

function updateMan(delta)
{
  const manSpeed = 0.1;
  const directionPressed = [W, A, S, D].some(key => keysPressed[key] == true)

  if(directionPressed){
    directionOffset = findDirectionOffset(keysPressed);
    rotateQuarternion.setFromAxisAngle(rotateAngle, directionOffset);
    man.quaternion.rotateTowards(rotateQuarternion, +Infinity);
    imaginaryBox.quaternion.rotateTowards(rotateQuarternion, +Infinity);

    box.setFromObject(imaginaryBox);

    if(lastDirection != directionOffset){
      if(canMove(lastDirection, directionOffset)){
        man.translateZ(manSpeed);
        imaginaryBox.translateZ(manSpeed);
      }
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
      const r = intersects[i].object.material.color.r;
      const g = intersects[i].object.material.color.g;
      const b = intersects[i].object.material.color.b;

      if(intersects[i].object.selected){
        intersects[i].object.material = new THREE.MeshLambertMaterial({color: "rgb(255, 20, 20)"})
        intersects[i].object.selected = false;
      }
      else{
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

function updateCamera(){
  keyboard.update();

  if(keyboard.down("C")){
    if(camera == perspectiveCamera)
      camera = parallelCamera;
    else
      camera = perspectiveCamera;
  }

  camera.position.set(120+man.position.x, 120, 120+man.position.z);
  camera.lookAt(man.position);
}

function render()
{
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
  
  // Working on camera moves
  updateCamera();

  renderer.render(scene, camera);
}
