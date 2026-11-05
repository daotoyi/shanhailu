import * as THREE from 'three';

interface DisposableNode {
  geometry?: THREE.BufferGeometry;
  material?: THREE.Material | THREE.Material[];
}

/**
 * 递归释放 Object3D 子树持有的 GPU 资源。
 * 用 duck typing 而非 instanceof THREE.Mesh,以覆盖 Points / Line / InstancedMesh。
 * 不主动 dispose 贴图:程序化贴图常在多图间共享,交由资产层统一管理。
 */
export function disposeObject(root: THREE.Object3D): void {
  root.traverse((o) => {
    const n = o as THREE.Object3D & DisposableNode;
    n.geometry?.dispose();
    const m = n.material;
    if (!m) return;
    (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose());
  });
}
