import * as THREE from '/node_modules/three/build/three.module.js'
import { PointerLockControls } from '/node_modules/three/examples/jsm/controls/PointerLockControls.js'
import { FBXLoader } from '/node_modules/three/examples/jsm/loaders/FBXLoader.js'
import { GLTFLoader } from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js'

let score  = 0;
let ammo  = 6;

let loadingProgress = 0;
let camera, scene, renderer, controls;
let gltfLoader;
let mixers = [];

let modelReady = false

const objects = [];

let raycaster;
let mouse;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;

let gunShot = new Audio('assets/gunshot.mp3');
let gunEmpty = new Audio('assets/emptyGun.mp3');
let gunReload = new Audio('assets/reload.mp3');
let theme = new Audio('assets/theme.mp3');
theme.volume = 0.4;

let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const vertex = new THREE.Vector3();
const color = new THREE.Color();

const textureLoader = new THREE.TextureLoader();

init();
animate();

function init() {
    
    document.getElementById('title').innerHTML = "Loading... "+((loadingProgress/40)*100)+"%";
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1000 );
    camera.position.y = 10;

    scene = new THREE.Scene();
    scene.background = textureLoader.load('assets/skybox.jpg');
    scene.fog = new THREE.Fog( 0x352f2e, 0, 150 );

    const light = new THREE.HemisphereLight( 0xeeeeff, 0x777788, 0.75 );
    light.position.set( 0.5, 1, 0.75 );
    scene.add( light );

    const mainLight = new THREE.DirectionalLight('white', 5);
    mainLight.position.set(10, 100, 10);
    scene.add(mainLight);

    controls = new PointerLockControls( camera, document.body );

    const blocker = document.getElementById( 'blocker' );
    const instructions = document.getElementById( 'instructions' );

    
    instructions?.addEventListener( 'click', function () {

        controls.lock();

    } );

    controls.addEventListener( 'lock', function () {

        instructions.style.display = 'none';
        blocker.style.display = 'none';

    } );

    controls.addEventListener( 'unlock', function () {

        blocker.style.display = 'block';
        instructions.style.display = '';

    } );

    scene.add( controls.getObject() );

    const onKeyDown = function ( event) {

        switch ( event.code ) {

            case 'ArrowUp':
            case 'KeyW':
                moveForward = true;
                break;

            case 'ArrowLeft':
            case 'KeyA':
                moveLeft = true;
                break;

            case 'ArrowDown':
            case 'KeyS':
                moveBackward = true;
                break;

            case 'ArrowRight':
            case 'KeyD':
                moveRight = true;
                break;

            case 'Space':
                if ( canJump === true ) velocity.y += 200;
                canJump = false;
                break;
            case 'KeyR':
                if(ammo < 6) {
                    ammo = 6;
                    document.getElementById("ammo").innerHTML = "Ammo: " + ammo;
                    gunReload.play();
                }
                break;


        }

    };

    const onKeyUp = function ( event ) {

        switch ( event.code ) {

            case 'ArrowUp':
            case 'KeyW':
                moveForward = false;
                break;

            case 'ArrowLeft':
            case 'KeyA':
                moveLeft = false;
                break;

            case 'ArrowDown':
            case 'KeyS':
                moveBackward = false;
                break;

            case 'ArrowRight':
            case 'KeyD':
                moveRight = false;
                break;

        }

    };
    
    const fbxLoader = new FBXLoader()

    raycaster = new THREE.Raycaster(camera.getWorldPosition(new THREE.Vector3()), camera.getWorldDirection(new THREE.Vector3()));

    mouse = new THREE.Vector2();


    const onMouseMove = function ( event ) {
        mouse.x = ( event.movementX / window.innerWidth ) * 2 - 1;
        mouse.y = - ( event.movementY / window.innerHeight ) * 2 + 1;
    };
    window.addEventListener( 'mousemove', onMouseMove, false );



    const onClick = function ( event ) {
        if(ammo > 0) {
            ammo--;
            document.getElementById("ammo").innerHTML = "Ammo: " + ammo;
            gunShot.play();
            theme.play();
            const intersects = raycaster.intersectObjects( objects );
            if ( intersects.length > 0 ) {

    
                intersects[0].object.material.opacity = 0;
                intersects[0].object.material.transparent = true;
                intersects[0].object.material.needsUpdate = true;
                scene.remove( intersects[0].object );
                objects.splice( objects.indexOf( intersects[0].object ), 1 );
                score++;
                document.getElementById("score").innerHTML = "Score: " + score;
                


            }
    }
        else {
            gunEmpty.play();
        }
        
        
    };
    window.addEventListener( 'click', onClick );

    
    document.addEventListener( 'keydown', onKeyDown );
    document.addEventListener( 'keyup', onKeyUp );

    

    // floor

    let floorGeometry = new THREE.PlaneGeometry( 2000, 2000, 100, 100 );
    floorGeometry.rotateX( - Math.PI / 2 );

    // vertex displacement

    let position = floorGeometry.attributes.position;

    for ( let i = 0, l = position.count; i < l; i ++ ) {

        vertex.fromBufferAttribute( position, i );

        vertex.x += Math.random() * 20 - 10;
        vertex.y += Math.random() * 2;
        vertex.z += Math.random() * 20 - 10;

        position.setXYZ( i, vertex.x, vertex.y, vertex.z );

    }

    floorGeometry = floorGeometry.toNonIndexed(); // ensure each face has unique vertices

    position = floorGeometry.attributes.position;
    const colorsFloor = [];

    for ( let i = 0, l = position.count; i < l; i ++ ) {

        color.setHSL( Math.random() * 0.3 + 0.5, 0.75, Math.random() * 0.25 + 0.75 );
        colorsFloor.push( color.r, color.g, color.b );

    }

    floorGeometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colorsFloor, 3 ) );

    const floorMaterial = new THREE.MeshBasicMaterial( { vertexColors: true } );
    floorMaterial.color = new THREE.Color(0x022006);

    const floor = new THREE.Mesh( floorGeometry, floorMaterial );
    scene.add( floor );

    gltfLoader = new GLTFLoader();    

    for ( let i = 0; i < 20; i ++ ) {
        fbxLoader.load(
            'assets/zombie.fbx',
            (object) => {
                mixers.push(new THREE.AnimationMixer(object))

                const animationAction = mixers[i].clipAction(
                    (object).animations[0]
                )
                animationAction.play()
                
                object.position.x = Math.floor( Math.random() * 20 - 10 ) * 20;
                object.position.y =  0.8;
                object.position.z = Math.floor( Math.random() * 20 - 10 ) * 20;
                object.scale.set(0.06, 0.06, 0.06);
                scene.add(object)
                modelReady = true; 
                objects.push(object);
                loadingProgress += 1;       
            },
            (xhr) => {},
            (error) => {
                console.log(error)
            }
        )
        
    }
    for ( let i = 0; i < 10; i ++ ) {
        gltfLoader.loadAsync('assets/tree.glb').then((gltf) => {
            const root = gltf.scene;
            root.scale.set(0.1, 0.1, 0.1);
            root.position.x = Math.floor( Math.random() * 20 - 10 ) * 20;
            root.position.y =  0.8;
            root.position.z = Math.floor( Math.random() * 20 - 10 ) * 20;
            scene.add(root);   
            loadingProgress += 1;         
        });
        gltfLoader.loadAsync('assets/old_tree.glb').then((gltf) => {
            const root = gltf.scene;
            root.scale.set(4,4,4);
            root.position.x = Math.floor( Math.random() * 20 - 10 ) * 20;
            root.position.y =  2;
            root.position.z = Math.floor( Math.random() * 20 - 10 ) * 20;
            scene.add(root);  
            loadingProgress += 1;                   
        });
    }

    //

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    //

    window.addEventListener( 'resize', onWindowResize );



}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}

function animate() {
    if(loadingProgress == 40){
        document.getElementById('title').innerHTML = "Click to play ";
        objects.forEach((object) => {
        object.lookAt(camera.position);
        object.translateZ(0.1);
        object.position.y = 0.8;
        object.rotation.set(0,0,0)
    })
    }else{
        document.getElementById('title').innerHTML = "Loading... "+((loadingProgress/40)*100)+"%";
    }
    requestAnimationFrame( animate );

    raycaster.set(camera.getWorldPosition(new THREE.Vector3()), camera.getWorldDirection(new THREE.Vector3()));


    const time = performance.now();


    if ( controls.isLocked === true ) {


        const delta = ( time - prevTime ) / 1000;

        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        velocity.y -= 9.8 * 100.0 * delta; 

        direction.z = Number( moveForward ) - Number( moveBackward );
        direction.x = Number( moveRight ) - Number( moveLeft );
        direction.normalize(); 

        if ( moveForward || moveBackward ) velocity.z -= direction.z * 400.0 * delta;
        if ( moveLeft || moveRight ) velocity.x -= direction.x * 400.0 * delta;

        controls.moveRight( - velocity.x * delta );
        controls.moveForward( - velocity.z * delta );

        controls.getObject().position.y += ( velocity.y * delta );

        if ( controls.getObject().position.y < 10 ) {

            velocity.y = 0;
            controls.getObject().position.y = 10;
            canJump = true;

        }

    }

    prevTime = time;

    if(modelReady) {
        mixers.forEach(mixer => mixer.update(0.01));
    }

    renderer.render( scene, camera );
}
