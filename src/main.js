import * as THREE from 'three';
import {GUI} from 'dat.gui';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass';

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
	45,
	window.innerWidth / window.innerHeight,
	0.1,
	1000
);

const params = {
	red: 1.0,
	green: 1.0,
	blue: 1.0,
	threshold: 0.5,
	strength: 0.5,
	radius: 0.8
}

renderer.outputColorSpace = THREE.SRGBColorSpace;
const renderScene = new RenderPass(scene, camera);

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight));
bloomPass.threshold = params.threshold;
bloomPass.strength = params.strength;
bloomPass.radius = params.radius;

const bloomComposer = new EffectComposer(renderer);
bloomComposer.addPass(renderScene);
bloomComposer.addPass(bloomPass);

const outputPass = new OutputPass();
bloomComposer.addPass(outputPass);

camera.position.set(0, -2, 14);
camera.lookAt(0, 0, 0);

const uniforms = {
	u_time: {type: 'f', value: 0.0},
	u_frequency: {type: 'f', value: 0.0},
	u_red: {type: 'f', value: 1.0},
	u_green: {type: 'f', value: 1.0},
	u_blue: {type: 'f', value: 1.0}
}

const mat = new THREE.ShaderMaterial({
	uniforms,
	vertexShader: document.getElementById('vertexshader').textContent,
	fragmentShader: document.getElementById('fragmentshader').textContent
});

const geo = new THREE.BoxGeometry(4, 4, 4);
const mesh = new THREE.Mesh(geo, mat);
scene.add(mesh);
mesh.material.wireframe = true;

const listener = new THREE.AudioListener();
camera.add(listener);

const sound = new THREE.Audio(listener);

const audioLoader = new THREE.AudioLoader();

const musicOptions = [
    { label: 'Beat1', value: './assets/Beat1.mp3' },
    { label: 'Beat2', value: './assets/Beat2.mp3' },
    { label: 'Beat3', value: './assets/Beat3.mp3' }
];

const musicControls = {
    ChangeMusic: './assets/Beat1.mp3' 
};

var isPlaying = false;
var lastClickTime = 0;
var doubleClickDelay = 300; 
audioLoader.load('./assets/Beat1.mp3', function(buffer) {
    sound.setBuffer(buffer);

    window.addEventListener('click', function() {
        var currentTime = new Date().getTime();

        if (currentTime - lastClickTime < doubleClickDelay) {
            if (isPlaying) {
                sound.stop();
                isPlaying = false;
            }
        } else {
            if (!isPlaying) {
                sound.play();
                isPlaying = true;
            }
        }

        lastClickTime = currentTime;
    });
});
const analyser = new THREE.AudioAnalyser(sound, 32);

const gui = new GUI();

const colorsFolder = gui.addFolder('Colors');
colorsFolder.add(params, 'red', 0, 1).onChange(function(value) {
	uniforms.u_red.value = Number(value);
});
colorsFolder.add(params, 'green', 0, 1).onChange(function(value) {
	uniforms.u_green.value = Number(value);
});
colorsFolder.add(params, 'blue', 0, 1).onChange(function(value) {
	uniforms.u_blue.value = Number(value);
});

const bloomFolder = gui.addFolder('Bloom');
bloomFolder.add(params, 'threshold', 0, 1).onChange(function(value) {
	bloomPass.threshold = Number(value);
});
bloomFolder.add(params, 'strength', 0, 3).onChange(function(value) {
	bloomPass.strength = Number(value);
});
bloomFolder.add(params, 'radius', 0, 1).onChange(function(value) {
	bloomPass.radius = Number(value);
});

const musicFolder = gui.addFolder('Music');
musicFolder.add(musicControls, 'ChangeMusic', musicOptions.map(option => option.label))
    .onChange(function(selectedLabel) {
        const selectedMusic = musicOptions.find(option => option.label === selectedLabel);
        if (selectedMusic) {
            audioLoader.load(selectedMusic.value, function(buffer) {
                sound.setBuffer(buffer);
            });
        }
    });

let mouseX = 0;
let mouseY = 0;
let isDragging = false;

document.addEventListener('mousedown', function (event) {
    isDragging = true;
});

document.addEventListener('mouseup', function () {
    isDragging = false;
});

document.addEventListener('mousemove', function (event) {
    if (isDragging) {
        const rotationSpeedX = 0.01;
        const rotationSpeedY = 0.01;

        mesh.rotation.y -= event.movementX * rotationSpeedX;
        mesh.rotation.x -= event.movementY * rotationSpeedY;

        mesh.rotation.x = Math.max(-Math.PI / 2, Math.min(mesh.rotation.x, Math.PI / 2));
    }
});

document.addEventListener('contextmenu', function (event) {
    event.preventDefault();
});

window.addEventListener('mouseout', function () {
    isDragging = false;
});

const clock = new THREE.Clock();
function animate() {
	camera.position.x += (mouseX - camera.position.x) * .05;
	camera.position.y += (-mouseY - camera.position.y) * 0.5;
	camera.lookAt(scene.position);
	uniforms.u_time.value = clock.getElapsedTime();
	uniforms.u_frequency.value = analyser.getAverageFrequency();
    bloomComposer.render();
	requestAnimationFrame(animate);
}
animate();

window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
	bloomComposer.setSize(window.innerWidth, window.innerHeight);
});