import { System } from 'ecsy';
import { WebGLRendererComponent } from '../components/WebGLRendererComponent.js';

export class WebGLRendererSystem extends System {
  onResize() {
    this.needsResize = true;
  }

  init() {
    this.needsResize = true;
    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize, false);
  }

  dispose() {
    window.removeEventListener('resize', this.onResize);
  }

  execute() {
    const entities = this.queries.renderers.results;

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const component = entity.getComponent(WebGLRendererComponent);
      const camera = component.camera.getObject3D();
      const scene = component.scene.getObject3D();
      const renderer = component.renderer;

      if (this.needsResize) {
        const width = window.innerWidth;
        const height = window.innerHeight;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);

        this.needsResize = false;
      }

      renderer.render(scene, camera);
    }
  }
}

WebGLRendererSystem.queries = {
  renderers: { components: [WebGLRendererComponent] }
};
