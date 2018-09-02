import THREE from '../third_party/three.js';
import { renderer, getOrthoCamera } from '../modules/three.js';
import Maf from '../modules/maf.js';
import { palette2 as palette } from '../modules/floriandelooij.js';
import OrbitControls from '../third_party/THREE.OrbitControls.js';
import { InstancedGeometry, getInstancedMeshStandardMaterial, getInstancedDepthMaterial } from '../modules/instanced.js';
import { Curves } from '../third_party/THREE.CurveExtras.js';
import { gradientLinear } from '../modules/gradient.js';
import RoundedFlatTorus from '../modules/three-rounded-flat-torus.js';
import easings from '../modules/easings.js';

import Painted from '../modules/painted.js';

const painted = Painted(renderer, { minLevel: -.05 });

palette.range = ["#FFA40B", "#D71707", "#541A13", "#435753", "#AF3F04", "#F5CB2D", "#C8E0D0", "#FFA40B"];

const canvas = renderer.domElement;
const camera = getOrthoCamera(4, 4);
const controls = new OrbitControls(camera, canvas);
const scene = new THREE.Scene();
const group = new THREE.Group();
const SIDES = 5;

const gradient = new gradientLinear(palette.range);
const curve = new THREE.Curves.CinquefoilKnot();

const geometry = new THREE.BufferGeometry().fromGeometry(RoundedFlatTorus(1, 2, 1, .1, 18, 36));
const mm = new THREE.Matrix4().makeRotationX(Math.PI / 2);
geometry.applyMatrix(mm);
const material = getInstancedMeshStandardMaterial({ color: 0xffffff, metalness: .1, roughness: .4 }, { colors: true });
const depthMaterial = getInstancedDepthMaterial();
const instancedGeometry = new InstancedGeometry(geometry, { colors: true });
const instancedMesh = new THREE.Mesh(instancedGeometry.geometry, material);
instancedMesh.frustumCulled = false;
instancedMesh.castShadow = true;
instancedMesh.receiveShadow = true;
instancedMesh.customDepthMaterial = depthMaterial;
group.add(instancedMesh);

const posValues = instancedGeometry.positions.values;
const quatValues = instancedGeometry.quaternions.values;
const scaleValues = instancedGeometry.scales.values;
const colorValues = instancedGeometry.colors.values;

const OBJECTS = 200;
instancedGeometry.update(OBJECTS);

group.scale.setScalar(10);

scene.add(group);

const directionalLight = new THREE.DirectionalLight(0xffffff, .5);
directionalLight.position.set(-2, 2, 2);
directionalLight.castShadow = true;
scene.add(directionalLight);

const directionalLight2 = new THREE.DirectionalLight(0xffffff, .5);
directionalLight2.position.set(1, 2, 1);
directionalLight2.castShadow = true;
scene.add(directionalLight2);

const ambientLight = new THREE.AmbientLight(0x808080, .5);
scene.add(ambientLight);

const light = new THREE.HemisphereLight(palette.range[5], palette.range[6], .5);
scene.add(light);

camera.position.set(-3.15, 2.05, 2.00);
camera.lookAt(new THREE.Vector3(0, 0, 0));
renderer.setClearColor(palette.range[5], 1);
scene.fog = new THREE.FogExp2(palette.range[5], 0.1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const loopDuration = 2;

const r1 = 1.5;
const r2 = .5;
const twists = 8;

function getPos(t, r1, r2, offset) {
  const a = t * Maf.TAU + offset;
  const r = r1 + r2 * Math.sin(twists * a);
  const x = r * Math.cos(a + offset);
  const y = r2 * Math.cos(twists * a);
  const z = r * Math.sin(a + offset);
  return { x, y, z }
}

const q = new THREE.Quaternion();
const qq = new THREE.Quaternion();
const tmp = new THREE.Vector3();
const m = new THREE.Matrix4();
const m2 = new THREE.Matrix4();
const up = new THREE.Vector3(.1, 1, .1).normalize();
const c = new THREE.Color;
const e = new THREE.Euler();
const center = new THREE.Vector3(0, 0, 0);
const z = new THREE.Vector3(0, 0, 1);

function draw(startTime) {

  const time = (.001 * (performance.now() - startTime)) % loopDuration;
  const t = time / loopDuration;

  const vertices = [];

  const pts = OBJECTS;
  for (let ptr = 0; ptr < pts; ptr++) {
    const a = ptr / pts;
    const p = curve.getPoint(a);
    vertices.push(p.multiplyScalar(.01));
  }
  vertices.push(vertices[0].clone());

  var path = new THREE.CatmullRomCurve3(vertices);
  const frames = path.computeFrenetFrames(OBJECTS, true);
  const offset = 4 * t / OBJECTS;

  for (let ptr = 0; ptr < OBJECTS; ptr++) {
    const sign = (ptr % 2) ? 1 : -1;
    const p = path.getPointAt(Maf.mod(ptr / OBJECTS + sign * offset, 1));
    posValues[ptr * 3 + 0] = p.x;
    posValues[ptr * 3 + 1] = p.y;
    posValues[ptr * 3 + 2] = p.z;

    const tt = Maf.mod((Maf.mod(ptr + sign * 1, OBJECTS) / OBJECTS) + sign * offset, 1);
    const from = frames.binormals[ptr];
    const to = frames.binormals[Math.floor(Maf.mod(ptr + sign * 4 * t, OBJECTS))];
    const pp = path.getPointAt(tt);
    m.lookAt(p, pp, from.lerp(to, t));
    q.setFromRotationMatrix(m).normalize();

    qq.setFromAxisAngle(z, t * Maf.TAU / SIDES + sign * ptr * (Maf.TAU / SIDES) / OBJECTS);
    q.multiply(qq);

    quatValues[ptr * 4 + 0] = q.x;
    quatValues[ptr * 4 + 1] = q.y;
    quatValues[ptr * 4 + 2] = q.z;
    quatValues[ptr * 4 + 3] = q.w;

    const s = .04 + .0125 * easings.InOutCubic(.5 + .5 * Math.sin(10 * ((ptr / OBJECTS) + sign * offset) * Maf.TAU + t * Maf.TAU));
    const ss = (ptr % 2) ? .75 : 1;
    scaleValues[ptr * 3 + 0] = ss * s;
    scaleValues[ptr * 3 + 1] = ss * s;
    scaleValues[ptr * 3 + 2] = .05; //ss * s;

    const pc = Maf.mod(2 * (ptr / OBJECTS + sign * offset), 1);
    const c = gradient.getAt(pc);
    colorValues[ptr * 4 + 0] = c.r;
    colorValues[ptr * 4 + 1] = c.g;
    colorValues[ptr * 4 + 2] = c.b;
  }
  instancedGeometry.positions.update(OBJECTS);
  instancedGeometry.quaternions.update(OBJECTS);
  instancedGeometry.scales.update(OBJECTS);
  instancedGeometry.colors.update(OBJECTS);

  painted.render(scene, camera);
}

export { draw, loopDuration, canvas };