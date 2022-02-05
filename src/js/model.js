'use strict';

// 3D model
const Model = function (wrapper, canvas) {

    const flip = (FC.MIXER_CONFIG.main_rotor_dir == 0);

    this.wrapper = wrapper;
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas[0], alpha: true, antialias: true });

    // initialize render size for current canvas size
    this.renderer.setSize(this.wrapper.width() * 2, this.wrapper.height() * 2);

    // Set output encoding for GLTF model format
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    // model file name
    var model_file = 'fallback';

    // setup scene
    this.scene = new THREE.Scene();

    // modelWrapper adds an extra axis of rotation to avoid gimbal lock with the euler angles
    this.modelWrapper = new THREE.Object3D();

    // Flip left-right if needed
    this.scale = new THREE.Vector3(flip ? -1 : 1, 1, 1);

    // stationary camera
    this.camera = new THREE.PerspectiveCamera(10, this.wrapper.width() / this.wrapper.height(), 1, 10000);

    // move camera away from the model
    this.camera.position.z = 800;

    // some light
    const light = new THREE.AmbientLight(0x404040);
    const light2 = new THREE.DirectionalLight(new THREE.Color(1, 1, 1), 1.5);
    light2.position.set(0, 1, 0);

    // add camera, model, light to the foreground scene
    this.scene.add(light);
    this.scene.add(light2);
    this.scene.add(this.camera);
    this.scene.add(this.modelWrapper);

    // Load model file, add to scene and render it
    this.loadGLTF(model_file, (function (model) {
        this.model = model;
        this.model.scale.multiply(this.scale);
        this.modelWrapper.add(model);
        this.scene.add(this.modelWrapper);
        this.render();
    }).bind(this));
};

Model.prototype.loadGLTF = function (model_file, callback) {
    const loader = new THREE.GLTFLoader();
    loader.load('./resources/models/' + model_file + '.gltf', function (gltf) {
        callback(gltf.scene);
    });
};

Model.prototype.rotateTo = function (x, y, z) {
    if (this.model) {
        this.model.rotation.x = x;
        this.modelWrapper.rotation.y = y;
        this.model.rotation.z = z;
        this.render();
    }
};

Model.prototype.rotateBy = function (x, y, z) {
    if (this.model) {
        this.model.rotateX(x);
        this.model.rotateY(y);
        this.model.rotateZ(z);
        this.render();
    }
};

Model.prototype.render = function () {
    if (this.model) {
        this.renderer.render(this.scene, this.camera);
    }
};

// handle canvas resize
Model.prototype.resize = function () {
    this.renderer.setSize(this.wrapper.width() * 2, this.wrapper.height() * 2);
    this.camera.aspect = this.wrapper.width() / this.wrapper.height();
    this.camera.updateProjectionMatrix();
    this.render();
};

Model.prototype.dispose = function () {
    this.renderer.forceContextLoss();
    this.renderer.dispose();
};
