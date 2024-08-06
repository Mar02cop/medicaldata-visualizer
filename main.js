<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Medical Data Visualizer</title>
    <link rel="icon" type="image/x-icon" href="others/favicon.ico">
    <style>
        body { margin: 0; }
    </style>
</head>
<body>
    <script type="importmap">
        {
            "imports": {
                "three": "https://cdn.jsdelivr.net/npm/three@v0.149.0/build/three.module.js",
                "three/addons/": "https://cdn.jsdelivr.net/npm/three@v0.149.0/examples/jsm/"
              }
        }
    </script>

    <script type="module">

    import * as THREE from 'three';
    import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { NRRDLoader } from 'three/addons/loaders/NRRDLoader.js';
    import { VolumeRenderShader1 } from 'three/addons/shaders/VolumeShader.js';

	const volumes = [];
    const directories = [];

    let renderer, scene, camera, controls, material, volconfig, data, cmtextures;
    
    const directoryLabels = {};
    const dataLabels = {};
    const dentition = [];
    const mandible = [];
    const maxillaryComplex = [];
    const maxillarySinus = [];
    const nerve = [];
    const pharynx = [];
    const skull = [];
    let index = 1;
    let voxelDentitionGroup = null;

    init();

    function setup() {
        doRequestFile("/volumi", false);
        for (const dir of directories) {
            doRequestFile(dir, true);
        }
    }

    function init() {
        setup();

        scene = new THREE.Scene();

        // Create renderer
        renderer = new THREE.WebGLRenderer();
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

        // Create camera (The volume renderer does not work very well with perspective yet)
        const h = 512; // frustum height
        const aspect = window.innerWidth / window.innerHeight;
        camera = new THREE.OrthographicCamera(-h * aspect / 2, h * aspect / 2, h / 2, -h / 2, 1, 1000);
        camera.position.set(-64, -64, 128);
        camera.up.set(0, 0, 1); // In our data, z is up

        // Create controls
        controls = new OrbitControls(camera, renderer.domElement);
        controls.addEventListener('change', render);
        controls.target.set(64, 64, 128);
        controls.minZoom = 0.5;
        controls.maxZoom = 4;
        controls.enablePan = false;
        controls.update();

        // The GUI for interaction
        volconfig = {
            clim1: 0, clim2: 1, renderstyle: 'iso', isothreshold: 0.85, colormap: 'viridis',
            data: volumes[0], showDentition: false
        };
        const gui = new GUI();
        gui.add(volconfig, 'clim1', 0, 1, 0.01).onChange(updateUniforms);
        gui.add(volconfig, 'clim2', 0, 1, 0.01).onChange(updateUniforms);
        gui.add(volconfig, 'colormap', { gray: 'gray', viridis: 'viridis' }).onChange(updateUniforms);
        gui.add(volconfig, 'renderstyle', { mip: 'mip', iso: 'iso' }).onChange(updateUniforms);
        gui.add(volconfig, 'isothreshold', 0, 1, 0.01).onChange(updateUniforms);
        gui.add(volconfig, 'data', dataLabels).onChange(updateVolume);
        gui.add(volconfig, 'showDentition').onChange(toggleAdditionalVolume);
		loadVolume(volconfig.data);

        window.addEventListener('resize', onWindowResize);
    }

    function updateUniforms() {
        material.uniforms['u_clim'].value.set(volconfig.clim1, volconfig.clim2);
        material.uniforms['u_renderstyle'].value = volconfig.renderstyle == 'mip' ? 0 : 1; // 0: MIP, 1: ISO
        material.uniforms['u_renderthreshold'].value = volconfig.isothreshold; // For ISO renderstyle
        material.uniforms['u_cmdata'].value = cmtextures[volconfig.colormap];
        render();
    }

    function updateVolume() {
    scene.clear(); 
    loadVolume(volconfig.data, function() {
        
        if (volconfig.showDentition) {
            loadAdditionalVolume(dentition[volumes.indexOf(volconfig.data)]);
        }
    });
}

function loadVolume(data, onLoadCallback) {
    new NRRDLoader().load(data, function (volume) {
        // Setup texture and material for the main volume
        const texture = new THREE.Data3DTexture(volume.data, volume.xLength, volume.yLength, volume.zLength);
        texture.format = THREE.RedFormat;
        texture.type = THREE.UnsignedByteType;
        texture.minFilter = texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;

        cmtextures = {
            viridis: new THREE.TextureLoader().load('/others/cm_viridis.png', render),
            gray: new THREE.TextureLoader().load('/others/cm_gray.png', render)
        };

        const shader = VolumeRenderShader1;
        const uniforms = THREE.UniformsUtils.clone(shader.uniforms);

        uniforms['u_data'].value = texture;
        uniforms['u_size'].value.set(volume.xLength, volume.yLength, volume.zLength);
        uniforms['u_clim'].value.set(volconfig.clim1, volconfig.clim2);
        uniforms['u_renderstyle'].value = volconfig.renderstyle == 'mip' ? 0 : 1;
        uniforms['u_renderthreshold'].value = volconfig.isothreshold;
        uniforms['u_cmdata'].value = cmtextures[volconfig.colormap];

        material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader,
            side: THREE.BackSide
        });

        const geometry = new THREE.BoxGeometry(volume.xLength, volume.yLength, volume.zLength);
        geometry.translate(volume.xLength / 2 - 0.5, volume.yLength / 2 - 0.5, volume.zLength / 2 - 0.5);

        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        render();

        if (onLoadCallback) {
            onLoadCallback();
        }
    });
}

    function toggleAdditionalVolume() {
        if (voxelDentitionGroup) {
            scene.remove(voxelDentitionGroup);
            voxelDentitionGroup = null;
			updateVolume();
        }
		if (volconfig.showDentition) {
            loadAdditionalVolume(dentition[volumes.indexOf(volconfig.data)]);
        }

    }

    function loadAdditionalVolume(data) {
        new NRRDLoader().load(data, (volume) => {
            
            const colormap = {
        1: 0xff0000, // Red
        2: 0x00ff00, // Green
        3: 0x0000ff, // Blue
        4: 0xffff00, // Yellow
        5: 0xff00ff, // Magenta
        6: 0x00ffff, // Cyan
        7: 0x800000, // Maroon
        8: 0x008000, // Dark Green
        9: 0x000080, // Navy
        10: 0x808000, // Olive
        11: 0x800080, // Purple
        12: 0x008080, // Teal
        13: 0xc0c0c0, // Silver
        14: 0x808080, // Gray
        15: 0xffa500, // Orange
        16: 0xa52a2a, // Brown
        17: 0x8b0000, // Dark Red
        18: 0x8b4513, // Saddle Brown
        19: 0x2e8b57, // Sea Green
        20: 0x4682b4, // Steel Blue
        21: 0x6a5acd, // Slate Blue
        22: 0x7fff00, // Chartreuse
        23: 0xd2691e, // Chocolate
        24: 0xdc143c, // Crimson
        25: 0xff1493, // Deep Pink
        26: 0x00bfff, // Deep Sky Blue
        27: 0x1e90ff, // Dodger Blue
        28: 0xb22222, // Firebrick
        29: 0xfffaf0, // Floral White
        30: 0x228b22, // Forest Green
        31: 0xff00ff, // Fuchsia
        32: 0xdcdcdc, // Gainsboro
        33: 0xf8f8ff, // Ghost White
        34: 0xffd700, // Gold
        35: 0xdaa520, // Golden Rod
        36: 0xadff2f, // Green Yellow
        37: 0xff69b4, // Hot Pink
        38: 0xcd5c5c, // Indian Red
        39: 0x4b0082, // Indigo
        40: 0xfffff0, // Ivory
        41: 0xf0e68c, // Khaki
        42: 0xe6e6fa, // Lavender
        43: 0xfff0f5, // Lavender Blush
        44: 0x7cfc00, // Lawn Green
        45: 0xfffacd, // Lemon Chiffon
        46: 0xf08080, // Light Coral
        47: 0xe0ffff, // Light Cyan
        48: 0xfafad2, // Light Golden Rod Yellow
        49: 0xd3d3d3, // Light Grey
        50: 0x90ee90, // Light Green
        51: 0xffb6c1, // Light Pink
        52: 0xffa07a, // Light Salmon
        53: 0x20b2aa, // Light Sea Green
        54: 0x87cefa, // Light Sky Blue
        55: 0x778899, // Light Slate Grey
        56: 0xb0c4de, // Light Steel Blue
        57: 0xffffe0, // Light Yellow
        58: 0x32cd32, // Lime Green
        59: 0xfaf0e6, // Linen
        60: 0xffa500  // Orange (Repeated to maintain consistency)
    };
    const voxelSize = 1;

// Create voxel geometry
const voxelGeometry = new THREE.BoxGeometry(voxelSize, voxelSize, voxelSize);

// Create a group to hold all voxel meshes
voxelDentitionGroup = new THREE.Group();

// Track label counts
const labelCounts = {};
let maxLabel = 0;

// Iterate over the volume data to create voxel meshes
const { data: volumeData, xLength, yLength, zLength } = volume;

// Use BufferGeometry to batch the voxel creation
const voxelPositions = [];
const voxelColors = [];

for (let z = 0; z < zLength; z++) {
    for (let y = 0; y < yLength; y++) {
        for (let x = 0; x < xLength; x++) {
            const index = x + y * xLength + z * xLength * yLength;
            const label = volumeData[index];

            if (label !== 0) { // Only create voxel if data value is non-zero
                const color = new THREE.Color(colormap[label] || 0x000000);

                voxelPositions.push(
                    x - xLength / 2 + voxelSize / 2 + volume.xLength / 2 - 0.5, // Center voxel on x-axis
                    y - yLength / 2 + voxelSize / 2 + volume.yLength / 2 - 0.5, // Center voxel on y-axis
                    z - zLength / 2 + voxelSize / 2 + volume.zLength / 2 - 0.5  // Center voxel on z-axis
                );

                voxelColors.push(color.r, color.g, color.b);

                // Update label counts
                if (!labelCounts[label]) {
                    labelCounts[label] = 0;
                }
                labelCounts[label]++;
            }
        }
    }
}

const voxelGeometryBuffer = new THREE.BufferGeometry();
voxelGeometryBuffer.setAttribute('position', new THREE.Float32BufferAttribute(voxelPositions, 3));
voxelGeometryBuffer.setAttribute('color', new THREE.Float32BufferAttribute(voxelColors, 3));

const voxelMaterial = new THREE.PointsMaterial({ size: voxelSize, vertexColors: true, opacity: 0.5, transparent: true });
const voxelMesh = new THREE.Points(voxelGeometryBuffer, voxelMaterial);

voxelDentitionGroup.add(voxelMesh); // Add voxel group to the scene
scene.add(voxelDentitionGroup);

        // Output label counts to the console
        console.log('Voxel Counts by Label:', labelCounts);


        render();
    });
}

	
   // geometry.translate(volume.xLength / 2 - 0.5, volume.yLength / 2 - 0.5, volume.zLength / 2 - 0.5);
	function onWindowResize() {

		renderer.setSize( window.innerWidth, window.innerHeight );

		const aspect = window.innerWidth / window.innerHeight;

		const frustumHeight = camera.top - camera.bottom;

		camera.left = - frustumHeight * aspect / 2;
		camera.right = frustumHeight * aspect / 2;

		camera.updateProjectionMatrix();

		render();

	}

	function render() {

		renderer.render( scene, camera );

	}

	function doRequestFile(path, value){
		const xhr = new XMLHttpRequest();
		xhr.open('GET', path, false);
        xhr.send(null);

        if (xhr.status === 200) {
        	const parser = new DOMParser();
            const htmlDoc = parser.parseFromString(xhr.responseText, 'text/html');
            const fileList = Array.from(htmlDoc.querySelectorAll('a')).map(a => a.getAttribute('href'));
			
			if(value==true){
				
				for (const file of fileList) {
					
					if (file.endsWith('.nrrd')) {
						var x = file.split('_');
						switch(x[1]){
							case 'Dentition.nrrd':
								dentition.push(`${file}`);
								break;
							case 'Mandible.nrrd':
								mandible.push(`${file}`);
								break;
							case 'MaxillaryComplex.nrrd':
								maxillaryComplex.push(`${file}`);
								break;
							case 'MaxillarySinus.nrrd':
								maxillarySinus.push(`${file}`);
								break;
							case 'Nerve.nrrd':
								nerve.push(`${file}`);
								break;
							case 'Pharynx.nrrd':
								pharynx.push(`${file}`);
								break;
							case 'Skull.nrrd':
								skull.push(`${file}`);
								break;
							case 'Input.nrrd':
								volumes.push(`${file}`);
								dataLabels[`P${index}`] = `${file}`;
								index++;
								break;
							default:
								console.log('Unknown case:', x);
								// Add your logic for unknown case here
						}
						
					}
				}
			}
			else{
				for (const file of fileList) {
					if (file.endsWith('/') && file.startsWith('\\')) {
						directories.push(`${file}`);
					}
				}
			}
        } else {
            console.error(`Failed to fetch volumes: ${xhr.status}`);
        }
	}

 </script>
</body>
</html>
