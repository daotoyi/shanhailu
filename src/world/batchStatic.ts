import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

interface Bucket {
  material: THREE.MeshStandardMaterial;
  items: THREE.Mesh[];
}

/**
 * 地图静态构件合批(PROMPT §4.7 draw calls ≤200)。
 * 程序化建筑每个构件都是独立 Mesh 且 castShadow=true,主 pass 与阴影 pass 各画一遍;
 * 按「材质特征 + 几何属性签名 + 阴影标志」分组合并后,每组只剩一次绘制。
 *
 * 排除策略保护逐帧动画件:
 *  - InstancedMesh(植被/草,本身已合批)
 *  - 透明 / ShaderMaterial(水面、萤火、雾带、发光盘)
 *  - 自发光件(传送阵符文环/灯火):允许合并,但限定在同一父 Group 内,
 *    这样 dynamics 对整组的 rotation.y 与共享材质 emissiveIntensity 仍然生效
 *  - 显式标记 userData.dynamic
 *
 * 返回被消除的 Mesh 数量(供调试/验收)。
 */
export function batchStaticMeshes(group: THREE.Group): number {
  group.updateMatrixWorld(true);
  const toGroup = group.matrixWorld.clone().invert();
  const local = new THREE.Matrix4();
  const buckets = new Map<string, Bucket>();

  group.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || o instanceof THREE.InstancedMesh) return;
    if (o.userData['dynamic'] === true) return;
    const mat = o.material;
    if (Array.isArray(mat) || !(mat instanceof THREE.MeshStandardMaterial)) return;
    if (mat.transparent || mat.opacity < 1) return;
    const emissive = mat.emissive.r + mat.emissive.g + mat.emissive.b > 0.01;

    const geo = o.geometry;
    const attrs = Object.keys(geo.attributes).sort().join(',');
    const key = [
      mat.color.getHexString(), mat.roughness, mat.metalness,
      mat.flatShading ? 1 : 0, mat.side, mat.vertexColors ? 1 : 0,
      attrs, geo.index ? 'i' : 'n',
      o.castShadow ? 'c' : '', o.receiveShadow ? 'r' : '',
      // 发光件只与同父组的兄弟合并,避免破坏整组旋转/材质动画
      emissive ? `e${o.parent?.uuid ?? ''}` : '',
    ].join('|');
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { material: mat, items: [] };
      buckets.set(key, bucket);
    }
    bucket.items.push(o);
  });

  let removed = 0;
  for (const bucket of buckets.values()) {
    if (bucket.items.length < 2) continue;
    const geos: THREE.BufferGeometry[] = [];
    for (const mesh of bucket.items) {
      const g = mesh.geometry.clone();
      local.multiplyMatrices(toGroup, mesh.matrixWorld);
      g.applyMatrix4(local);
      geos.push(g);
    }
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) continue; // 属性不兼容时跳过,不影响原场景

    const combined = new THREE.Mesh(merged, bucket.material);
    combined.castShadow = bucket.items[0]!.castShadow;
    combined.receiveShadow = bucket.items[0]!.receiveShadow;
    group.add(combined);
    for (const mesh of bucket.items) {
      mesh.parent?.remove(mesh);
      mesh.geometry.dispose();
      const m = mesh.material as THREE.Material;
      if (m !== bucket.material) m.dispose();
    }
    removed += bucket.items.length - 1;
  }
  return removed;
}
