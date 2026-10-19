import * as THREE from 'three';
window.THREE = THREE;
if (typeof globalThis !== 'undefined') {
  globalThis.THREE = THREE;
}
