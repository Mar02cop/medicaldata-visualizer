# 3D Dental Imaging Visualizer

A browser-based tool for interactive 3D visualization of dental medical imaging data, enabling users to render, explore, and isolate anatomical structures — such as the mandible and other craniofacial parts — directly in the browser, with no desktop software required.

## Features

- **3D rendering** of volumetric dental scan data in the browser
- **Interactive navigation**: rotate, zoom, and pan around the 3D model
- **Anatomical part isolation**: view and inspect individual structures (e.g., mandible) separately from the full model
- Lightweight, client-side implementation — no server-side processing required to view a model

## Tech Stack

- **JavaScript** — core rendering and interaction logic (`main.js`)
- **[3D rendering library — e.g. Three.js]**
- **Node.js / npm** — dependency management and build tooling
- **HTML5** — application shell (`index.html`)


## Getting Started

### Prerequisites
- Node.js and npm installed

### Installation

```bash
git clone https://github.com/Mar02cop/medicaldata-visualizer.git
cd medicaldata-visualizer
npm install
```

### Running the project

```bash
[npm start <file_name>]
```

Then open `index.html` in your browser (or the local dev server URL, if one is configured).

## Usage

1. Load a dental scan model (in .nrrd format)
2. Use mouse/trackpad controls to rotate, zoom, and pan the 3D view
3. Select individual anatomical structures (e.g., mandible) to isolate or highlight them

## Motivation

Manual inspection of volumetric dental scans typically requires specialized desktop software. This project explores a lightweight, browser-based alternative for rendering and navigating 3D dental anatomy, making visualization more accessible without installation overhead.

## Author

Mario Coppola
