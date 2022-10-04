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
var material = setDefaultMaterial();
initDefaultBasicLight(scene);

var renderer = initRenderer();
renderer.setClearColor("rgb(30, 30, 42)");

const aspect = window.innerWidth/window.innerHeight;
const distance = 10

var camera = new THREE.OrthographicCamera(-distance*aspect, distance*aspect, distance, -distance, 1, 1000);
camera.position.set(20, 20, 20);
camera.lookAt(scene.position);

var trackballControls = new TrackballControls( camera, renderer.domElement );
window.addEventListener('resize', function(){onWindowResize(camera, renderer)}, false);

var firstPlane = createGroundPlaneWired(20, 20, 60, 60, "rgb(204,204,0)");
firstPlane.translateZ(0.1);
scene.add(firstPlane);

var secondPlane = createGroundPlane(50, 50, 60, 60, "rgb(255,239,213)");
secondPlane.rotateX(THREE.MathUtils.degToRad(-90));
scene.add(secondPlane);

var axesHelper = new THREE.AxesHelper( 2 );
axesHelper.visible = true;
scene.add(axesHelper);

// Character controllers
const keysPressed = {}
document.addEventListener('keydown', (event) => { keysPressed[event.key.toLowerCase()] = true }, false);
document.addEventListener('keyup', (event) => { keysPressed[event.key.toLowerCase()] = false }, false);

const A = "a";
const W = "w";
const D = "d";
const S = "s";

// Raycasting config to select objects
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
resetMouse();
renderer.domElement.addEventListener('click', onPointerClick, true);
var selectedCube;

//----------------------------------------------------------------------------
var man = null;
var time = 0;
var mixer = new Array();
var mixerAnimations = new Array();

var rotateAngle = new THREE.Vector3(0, 1, 0);
var rotateQuarternion = new THREE.Quaternion();

var cubes = [];

// Load animated files
loadGLTFFile('../assets/objects/walkingMan.glb');

// Adding some random cubes
addCube(0, 10, 0);
addCube(10, 2, 0);
addCube(0, 2, 10);

render();

function loadGLTFFile(modelName)
{
  var loader = new GLTFLoader( );
  loader.load( modelName, function ( gltf ) {
    var obj = gltf.scene;
    man = obj;
    obj.rotateY(3);
    scene.add(obj);

    var mixerLocal = new THREE.AnimationMixer(obj);
    mixer.push(mixerLocal);
    mixerAnimations.push(gltf.animations);
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

function updateMan(delta)
{
  const manSpeed = 0.1;
  const directionPressed = [W, A, S, D].some(key => keysPressed[key] == true)

  if(directionPressed){
    var directionOffset = findDirectionOffset(keysPressed);
    rotateQuarternion.setFromAxisAngle(rotateAngle, directionOffset);
    man.quaternion.rotateTowards(rotateQuarternion, 0.2);
    man.translateZ(manSpeed);
    mixer[0].clipAction(mixerAnimations[0][0]).play();
  }
  else{
    mixer[0].clipAction(mixerAnimations[0][0]).stop();
  }
}

function addCube(x, y, z){
  let cubeGeometry = new THREE.BoxGeometry(4, 4, 4);
  let cube = new THREE.Mesh(cubeGeometry, material);
  cube.position.set(x, y, z);
  cube.castShadow = true;
  cube.receiveShadow = true;

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
    const r = intersects[i].object.material.color.r;
    const g = intersects[i].object.material.color.g;
    const b = intersects[i].object.material.color.b;


    if(intersects[i].object.selected){
      intersects[i].object.material = new THREE.MeshLambertMaterial({color: "rgb(255, 20, 20)"})
      intersects[i].object.selected = false;
    }
    else{
      console.log(intersects[i].object);
      intersects[i].object.material = new THREE.MeshLambertMaterial({color: "rgb(0, 255, 0)"});
      intersects[i].object.selected = true;
    }
  }

  // reseting mouse position
  resetMouse()
}

function resetMouse(){
  pointer.x = pointer.y = -10000;
}

function render()
{
  trackballControls.update();
  raycaster.setFromCamera(pointer, camera);
  highlightIntersectedCubes();
  requestAnimationFrame(render);
  renderer.render(scene, camera);

  // Working on man animation
  var delta = clock.getDelta();
  for(var i = 0; i<mixer.length; i++)
    mixer[i].update(delta);

  // Working on man moves
  updateMan(delta);
}
