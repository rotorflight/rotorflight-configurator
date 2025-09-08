<script>
  import { onMount, onDestroy } from "svelte";
  import * as THREE from "three";
  import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

  import { FC } from "@/js/fc.svelte.js";

  let container;
  let canvas;
  let renderer;
  let width = $state();
  let height = $state();
  let error = $state(false);

  let o = $state({});

  $effect(() => {
    resize(width, height);
  });

  onMount(async () => {
    const clockwise = FC.MIXER_CONFIG.main_rotor_dir === 0;

    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
      });
    } catch (err) {
      console.log("Failed to create WebGLRenderer", err);
      error = true;
      return;
    }

    renderer.setPixelRatio(globalThis.devicePixelRatio * 4);
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    o.scene = new THREE.Scene();
    o.modelWrapper = new THREE.Object3D();
    o.camera = new THREE.PerspectiveCamera(20, width / height, 1, 1000);
    o.camera.position.z = 600;
    o.light = new THREE.AmbientLight(0xffffff, 4);
    o.light2 = new THREE.DirectionalLight(new THREE.Color(1, 1, 1), 3.0);
    o.light2.position.set(0, 600, 800);

    o.scene.add(o.light);
    o.scene.add(o.light2);
    o.scene.add(o.camera);
    o.scene.add(o.modelWrapper);

    o.model = await loadGLTF(`bell_${clockwise ? "cw" : "ccw"}`);
    o.modelWrapper.add(o.model);
    o.scene.add(o.modelWrapper);
    resize(width, height);
  });

  onDestroy(() => {
    if (!renderer) {
      return;
    }

    renderer.forceContextLoss();
    renderer.dispose();
  });

  function loadGLTF(modelName) {
    const loader = new GLTFLoader();
    return new Promise((resolve) => {
      loader.load(`/resources/models/${modelName}.gltf`, (gltf) =>
        resolve(gltf.scene),
      );
    });
  }

  function render() {
    if (!o.model) {
      return;
    }

    renderer.render(o.scene, o.camera);
  }

  function resize(w, h) {
    if (!renderer) {
      return;
    }

    renderer.setSize(w, h);
    o.camera.aspect = w / h;
    o.camera.updateProjectionMatrix();
    render();
  }

  export function rotateTo(x, y, z) {
    if (
      !o.model ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(z)
    ) {
      return;
    }

    o.model.rotation.x = x;
    o.modelWrapper.rotation.y = y;
    o.model.rotation.z = z;
    render();
  }

  export function rotateBy(x, y, z) {
    if (
      !o.model ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(z)
    ) {
      return;
    }

    if (x === 0 && y === 0 && z === 0) {
      return;
    }

    o.model.rotateX(x);
    o.model.rotateY(y);
    o.model.rotateZ(z);
    render();
  }

  export function reset() {
    o.model.rotation.x = 0;
    o.model.rotation.y = 0;
    o.model.rotation.z = 0;
    o.modelWrapper.rotation.y = 0;
    render();
  }
</script>

<div
  bind:this={container}
  class="container"
  bind:clientWidth={width}
  bind:clientHeight={height}
>
  <canvas bind:this={canvas} {width} {height} />
  {#if error}
    <div class="webgl-error">WebGL Context Error</div>
  {/if}
</div>

<style lang="scss">
  .container {
    position: relative;
    height: 100%;

    :global(html[data-theme="light"]) & {
      background-color: var(--color-neutral-100);
      background-image:
        linear-gradient(
          to right,
          var(--color-neutral-400) 1px,
          transparent 1px
        ),
        linear-gradient(
          to bottom,
          var(--color-neutral-400) 1px,
          transparent 1px
        ),
        linear-gradient(
          to right,
          var(--color-neutral-300) 1px,
          transparent 1px
        ),
        linear-gradient(
          to bottom,
          var(--color-neutral-300) 1px,
          transparent 1px
        );
      background-size:
        100px 100px,
        100px 100px,
        20px 20px,
        20px 20px;
      background-position: center, center, center, center;
    }

    :global(html[data-theme="dark"]) & {
      background-color: var(--color-neutral-500);
      background-image:
        linear-gradient(
          to right,
          var(--color-neutral-700) 1px,
          transparent 1px
        ),
        linear-gradient(
          to bottom,
          var(--color-neutral-700) 1px,
          transparent 1px
        ),
        linear-gradient(
          to right,
          var(--color-neutral-600) 1px,
          transparent 1px
        ),
        linear-gradient(
          to bottom,
          var(--color-neutral-600) 1px,
          transparent 1px
        );
      background-size:
        100px 100px,
        100px 100px,
        20px 20px,
        20px 20px;
      background-position: center, center, center, center;
    }
  }

  .webgl-error {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: var(--mutedText);
    font-size: 16px;
    font-weight: 600;
  }
</style>
