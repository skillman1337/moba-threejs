import { System } from 'ecsy';
import { MinimapComponent } from '../components/MinimapComponent.js';
import { MapComponent } from '../components/MapComponent.js';
import { WebGLRendererComponent } from '../../lib/ecs/components/WebGLRendererComponent.js';
import { LightComponent } from '../components/LightComponent.js';

class MinimapSystem extends System {
  init() {
    this.handleMinimapClick = this.handleMinimapClick.bind(this);
    this.handleMinimapMouseDown = this.handleMinimapMouseDown.bind(this);
    this.handleMinimapMouseMove = this.handleMinimapMouseMove.bind(this);
    this.handleMinimapMouseUp = this.handleMinimapMouseUp.bind(this);
    this.eventListenersInitialized = false;
  }

  execute(delta, time) {
    let minimapQuery = this.queries.minimap.results;
    if (minimapQuery.length == 0) {
      console.error('Minimap not found.');
      return;
    }
    let mapQuery = this.queries.map.results;
    if (mapQuery.length == 0) {
      console.error('Map not found.');
      return;
    }
    let rendererQuery = this.queries.renderer.results;
    if (rendererQuery.length == 0) {
      console.error('Renderer not found.');
      return;
    }

    const minimap = minimapQuery[0].getComponent(MinimapComponent);
    const map = mapQuery[0].getComponent(MapComponent);
    const renderer = rendererQuery[0].getComponent(WebGLRendererComponent);

    // Attach event listeners to the minimap canvas
    if (!this.eventListenersInitialized) {
      minimap.canvas.addEventListener('click', this.handleMinimapClick);
      minimap.canvas.addEventListener('mousedown', this.handleMinimapMouseDown);
      minimap.canvas.addEventListener('mousemove', this.handleMinimapMouseMove);
      minimap.canvas.addEventListener('mouseup', this.handleMinimapMouseUp);
      this.eventListenersInitialized = true;
    }

    const camera = renderer.camera.getObject3D();
    minimap.context.clearRect(0, 0, minimap.width, minimap.height);

    // Draw the map
    minimap.context.fillStyle = '#00ff00';
    minimap.context.fillRect(0, 0, minimap.width, minimap.height);

    // Draw the camera view
    const camX = minimap.width - ((camera.position.x + map.width / 2) / map.width) * minimap.width;
    const camY =
      minimap.height - ((camera.position.z + map.height / 2) / map.height) * minimap.height;

    minimap.context.strokeStyle = '#0000ff';
    minimap.context.strokeRect(camX - 10, camY - 10, 20, 20);

    // Draw the lights
    this.queries.lights.results.forEach((entity) => {
      const light = entity.getComponent(LightComponent);
      const lightX =
        minimap.width - ((light.position.x + map.width / 2) / map.width) * minimap.width;
      const lightY =
        minimap.height - ((light.position.z + map.height / 2) / map.height) * minimap.height;

      minimap.context.fillStyle = light.color;
      minimap.context.beginPath();
      minimap.context.arc(lightX, lightY, 5, 0, 2 * Math.PI);
      minimap.context.fill();
    });
  }

  handleMinimapClick(event) {
    const minimap = this.queries.minimap.results[0].getComponent(MinimapComponent);
    const map = this.queries.map.results[0].getComponent(MapComponent);
    const renderer = this.queries.renderer.results[0].getComponent(WebGLRendererComponent);

    if (minimap.isDraggingMinimap) return;

    const rect = minimap.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Flip the coordinates
    const flippedX = minimap.width - x;
    const flippedY = minimap.height - y;

    renderer.camera.getObject3D().position.x =
      (flippedX / minimap.width) * map.width - map.width / 2;
    renderer.camera.getObject3D().position.z =
      (flippedY / minimap.height) * map.height - map.height / 2;
  }

  handleMinimapMouseDown(event) {
    const minimap = this.queries.minimap.results[0].getMutableComponent(MinimapComponent);
    const map = this.queries.map.results[0].getComponent(MapComponent);
    const renderer = this.queries.renderer.results[0].getComponent(WebGLRendererComponent);

    minimap.isDraggingMinimap = true;

    const rect = minimap.canvas.getBoundingClientRect();
    const xClick = event.clientX - rect.left;
    const yClick = event.clientY - rect.top;

    // Update the camera position to the new click position
    const flippedX = minimap.width - xClick;
    const flippedY = minimap.height - yClick;

    renderer.camera.getObject3D().position.x =
      (flippedX / minimap.width) * map.width - map.width / 2;
    renderer.camera.getObject3D().position.z =
      (flippedY / minimap.height) * map.height - map.height / 2;

    // Store the initial mouse position for dragging
    minimap.panStart.x = xClick;
    minimap.panStart.y = yClick;

    // Store the initial camera position
    minimap.cameraStart.x = renderer.camera.getObject3D().position.x;
    minimap.cameraStart.y = renderer.camera.getObject3D().position.z;
  }

  handleMinimapMouseMove(event) {
    const minimap = this.queries.minimap.results[0].getComponent(MinimapComponent);
    const map = this.queries.map.results[0].getComponent(MapComponent);
    const renderer = this.queries.renderer.results[0].getComponent(WebGLRendererComponent);

    if (!minimap.isDraggingMinimap) return;

    const rect = minimap.canvas.getBoundingClientRect();
    const panEnd = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    // Calculate the deltas and invert them
    const deltaX = (minimap.panStart.x - panEnd.x) * (map.width / minimap.width);
    const deltaY = (minimap.panStart.y - panEnd.y) * (map.height / minimap.height);

    // Apply the inverted deltas to the camera position
    renderer.camera.getObject3D().position.x = minimap.cameraStart.x + deltaX;
    renderer.camera.getObject3D().position.z = minimap.cameraStart.y + deltaY;

    // Clamp camera position within map boundaries
    renderer.camera.getObject3D().position.x = Math.max(
      -map.width / 2,
      Math.min(map.width / 2, renderer.camera.getObject3D().position.x)
    );
    renderer.camera.getObject3D().position.z = Math.max(
      -map.height / 2,
      Math.min(map.height / 2, renderer.camera.getObject3D().position.z)
    );
  }

  handleMinimapMouseUp() {
    const minimap = this.queries.minimap.results[0].getMutableComponent(MinimapComponent);
    minimap.isDraggingMinimap = false;
  }
}

MinimapSystem.queries = {
  minimap: { components: [MinimapComponent] },
  map: { components: [MapComponent] },
  renderer: { components: [WebGLRendererComponent] },
  lights: { components: [LightComponent] }
};

export { MinimapSystem };
