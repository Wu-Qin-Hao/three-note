import { Vector3 } from "../math/Vector3.js";
import { Vector2 } from "../math/Vector2.js";
import { Box3 } from "../math/Box3.js";
import { EventDispatcher } from "./EventDispatcher.js";
import {
  BufferAttribute,
  Float32BufferAttribute,
  Uint16BufferAttribute,
  Uint32BufferAttribute,
} from "./BufferAttribute.js";
import { Sphere } from "../math/Sphere.js";
import { Object3D } from "./Object3D.js";
import { Matrix4 } from "../math/Matrix4.js";
import { Matrix3 } from "../math/Matrix3.js";
import { generateUUID } from "../math/MathUtils.js";
import { arrayNeedsUint32 } from "../utils.js";

let _id = 0;

const _m1 = /*@__PURE__*/ new Matrix4();
const _obj = /*@__PURE__*/ new Object3D();
const _offset = /*@__PURE__*/ new Vector3();
const _box = /*@__PURE__*/ new Box3();
const _boxMorphTargets = /*@__PURE__*/ new Box3();
const _vector = /*@__PURE__*/ new Vector3();

/**
 * BufferGeometry 是 Three.js 中最基础和高性能的几何体表示类
 * 它使用缓冲区（Buffer）存储顶点数据，相比传统的几何体更加高效
 */
class BufferGeometry extends EventDispatcher {
  /**
   * 构造函数：初始化一个全新的缓冲几何体实例
   * 设置默认属性和状态
   */
  constructor() {
    super();

    // 类型标记，快速判断对象类型
    this.isBufferGeometry = true;

    // 使用 Object.defineProperty 创建只读的自增 ID
    Object.defineProperty(this, "id", { value: _id++ });

    // 生成全局唯一标识符
    this.uuid = generateUUID();

    // 几何体名称，可选
    this.name = "";

    // 类型描述
    this.type = "BufferGeometry";

    // 索引缓冲，用于定义顶点绘制顺序
    this.index = null;

    // 间接索引，支持复杂的渲染策略
    this.indirect = null;

    // 存储几何体的各种属性，如位置、法线、颜色等
    this.attributes = {};

    // 变形动画相关属性
    this.morphAttributes = {};

    // 变形目标是否相对
    this.morphTargetsRelative = false;

    // 几何体分组，用于多材质渲染
    this.groups = [];

    // 包围盒，用于快速碰撞检测和裁剪
    this.boundingBox = null;

    // 包围球，用于视锥体剔除
    this.boundingSphere = null;

    // 绘制范围控制
    this.drawRange = { start: 0, count: Infinity };

    // 用户自定义数据
    this.userData = {};
  }

  /**
   * 获取索引
   * @returns {BufferAttribute}
   */
  getIndex() {
    return this.index;
  }

  /**
   * 设置索引
   * @param {BufferAttribute} index - 索引
   * @returns {BufferGeometry}
   */
  setIndex(index) {
    // 如果索引是数组，则创建一个新的索引
    if (Array.isArray(index)) {
      this.index = new (
        arrayNeedsUint32(index) ? Uint32BufferAttribute : Uint16BufferAttribute
      )(index, 1);
    } else {
      this.index = index;
    }

    return this;
  }

  /**
   * 设置间接索引
   * @param {BufferAttribute} indirect - 间接索引
   * @returns {BufferGeometry}
   */
  setIndirect(indirect) {
    this.indirect = indirect;

    return this;
  }

  /**
   * 获取间接索引
   * @returns {BufferAttribute}
   */
  getIndirect() {
    return this.indirect;
  }

  /**
   * 获取属性
   * @param {string} name - 属性名称
   * @returns {BufferAttribute}
   */
  getAttribute(name) {
    return this.attributes[name];
  }

  /**
   * 设置属性
   * @param {string} name - 属性名称
   * @param {BufferAttribute} attribute - 属性
   * @returns {BufferGeometry}
   */
  setAttribute(name, attribute) {
    this.attributes[name] = attribute;

    return this;
  }

  /**
   * 删除属性
   * @param {string} name - 属性名称
   * @returns {BufferGeometry}
   */
  deleteAttribute(name) {
    delete this.attributes[name];

    return this;
  }

  /**
   * 检查是否包含某个属性
   * @param {string} name - 属性名称
   * @returns {boolean} 是否存在指定属性
   */
  hasAttribute(name) {
    return this.attributes[name] !== undefined;
  }

  /**
   * 添加几何体分组，用于多材质渲染
   * @param {number} start - 分组起始索引
   * @param {number} count - 分组包含的顶点数量
   * @param {number} [materialIndex=0] - 材质索引，默认为0
   */
  addGroup(start, count, materialIndex = 0) {
    this.groups.push({
      start: start, // 分组起始位置
      count: count, // 分组顶点数量
      materialIndex: materialIndex, // 材质索引
    });
  }

  /**
   * 清除所有几何体分组
   */
  clearGroups() {
    this.groups = [];
  }

  /**
   * 设置绘制范围，控制渲染的顶点数量和起始位置
   * @param {number} start - 绘制起始索引
   * @param {number} count - 绘制的顶点数量
   */
  setDrawRange(start, count) {
    this.drawRange.start = start;
    this.drawRange.count = count;
  }

  /**
   * 应用4x4变换矩阵到几何体
   * 变换包括：位置、法线和切线
   * @param {Matrix4} matrix - 变换矩阵
   * @returns {BufferGeometry} 返回变换后的几何体
   */
  applyMatrix4(matrix) {
    // 变换顶点位置
    const position = this.attributes.position;
    if (position !== undefined) {
      position.applyMatrix4(matrix);
      position.needsUpdate = true;
    }

    // 变换法线，使用法线矩阵保持法线的垂直性
    const normal = this.attributes.normal;
    if (normal !== undefined) {
      const normalMatrix = new Matrix3().getNormalMatrix(matrix);
      normal.applyNormalMatrix(normalMatrix);
      normal.needsUpdate = true;
    }

    // 变换切线
    const tangent = this.attributes.tangent;
    if (tangent !== undefined) {
      tangent.transformDirection(matrix);
      tangent.needsUpdate = true;
    }

    // 重新计算包围盒和包围球
    if (this.boundingBox !== null) {
      this.computeBoundingBox();
    }

    if (this.boundingSphere !== null) {
      this.computeBoundingSphere();
    }

    return this;
  }

  /**
   * 应用四元数旋转
   * @param {Quaternion} q - 旋转四元数
   * @returns {BufferGeometry} 返回旋转后的几何体
   */
  applyQuaternion(q) {
    _m1.makeRotationFromQuaternion(q);
    this.applyMatrix4(_m1);
    return this;
  }

  /**
   * 绕世界X轴旋转
   * @param {number} angle - 旋转角度（弧度）
   * @returns {BufferGeometry} 返回旋转后的几何体
   */
  rotateX(angle) {
    _m1.makeRotationX(angle);
    this.applyMatrix4(_m1);
    return this;
  }

  /**
   * 绕世界Y轴旋转
   * @param {number} angle - 旋转角度（弧度）
   * @returns {BufferGeometry} 返回旋转后的几何体
   */
  rotateY(angle) {
    _m1.makeRotationY(angle);
    this.applyMatrix4(_m1);
    return this;
  }

  /**
   * 绕世界Z轴旋转
   * @param {number} angle - 旋转角度（弧度）
   * @returns {BufferGeometry} 返回旋转后的几何体
   */
  rotateZ(angle) {
    _m1.makeRotationZ(angle);
    this.applyMatrix4(_m1);
    return this;
  }

  /**
   * 平移几何体
   * @param {number} x - X轴平移距离
   * @param {number} y - Y轴平移距离
   * @param {number} z - Z轴平移距离
   * @returns {BufferGeometry} 返回平移后的几何体
   */
  translate(x, y, z) {
    _m1.makeTranslation(x, y, z);
    this.applyMatrix4(_m1);
    return this;
  }

  /**
   * 缩放几何体
   * @param {number} x - X轴缩放比例
   * @param {number} y - Y轴缩放比例
   * @param {number} z - Z轴缩放比例
   * @returns {BufferGeometry} 返回缩放后的几何体
   */
  scale(x, y, z) {
    _m1.makeScale(x, y, z);
    this.applyMatrix4(_m1);
    return this;
  }

  /**
   * 朝向
   * @param {Vector3} vector - 向量
   * @returns {BufferGeometry}
   */
  lookAt(vector) {
    _obj.lookAt(vector);

    _obj.updateMatrix();

    this.applyMatrix4(_obj.matrix);

    return this;
  }

  /**
   * 中心
   * @returns {BufferGeometry}
   */
  center() {
    this.computeBoundingBox();

    this.boundingBox.getCenter(_offset).negate();

    this.translate(_offset.x, _offset.y, _offset.z);

    return this;
  }

  /**
   * 从点设置
   * @param {Array} points - 点
   * @returns {BufferGeometry}
   */
  setFromPoints(points) {
    const positionAttribute = this.getAttribute("position");

    if (positionAttribute === undefined) {
      const position = [];

      for (let i = 0, l = points.length; i < l; i++) {
        const point = points[i];
        position.push(point.x, point.y, point.z || 0);
      }

      this.setAttribute("position", new Float32BufferAttribute(position, 3));
    } else {
      const l = Math.min(points.length, positionAttribute.count); // 确保数据不超过缓冲区大小

      for (let i = 0; i < l; i++) {
        const point = points[i];
        positionAttribute.setXYZ(i, point.x, point.y, point.z || 0);
      }

      if (points.length > positionAttribute.count) {
        console.warn(
          "THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."
        );
      }

      positionAttribute.needsUpdate = true;
    }

    return this;
  }

  /**
   * 计算包围盒
   * 根据几何体的顶点位置计算最小和最大边界
   * 支持处理变形目标和相对变形
   * @returns {BufferGeometry} 返回当前几何体实例
   */
  computeBoundingBox() {
    // 如果没有包围盒，则创建一个新的
    if (this.boundingBox === null) {
      this.boundingBox = new Box3();
    }

    // 获取位置属性和变形目标位置属性
    const position = this.attributes.position;
    const morphAttributesPosition = this.morphAttributes.position;

    // 处理 GL 缓冲属性的特殊情况
    if (position && position.isGLBufferAttribute) {
      console.error(
        "THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",
        this
      );

      // 设置一个默认的无穷大包围盒
      this.boundingBox.set(
        new Vector3(-Infinity, -Infinity, -Infinity),
        new Vector3(+Infinity, +Infinity, +Infinity)
      );

      return;
    }

    // 如果存在位置属性
    if (position !== undefined) {
      // 从位置属性设置初始包围盒
      this.boundingBox.setFromBufferAttribute(position);

      // 处理变形目标
      if (morphAttributesPosition) {
        for (let i = 0, il = morphAttributesPosition.length; i < il; i++) {
          const morphAttribute = morphAttributesPosition[i];
          _box.setFromBufferAttribute(morphAttribute);

          // 处理相对变形目标
          if (this.morphTargetsRelative) {
            _vector.addVectors(this.boundingBox.min, _box.min);
            this.boundingBox.expandByPoint(_vector);

            _vector.addVectors(this.boundingBox.max, _box.max);
            this.boundingBox.expandByPoint(_vector);
          } else {
            // 处理绝对变形目标
            this.boundingBox.expandByPoint(_box.min);
            this.boundingBox.expandByPoint(_box.max);
          }
        }
      }
    } else {
      // 如果没有位置属性，创建一个空的包围盒
      this.boundingBox.makeEmpty();
    }

    // 检查计算结果是否有效
    if (
      isNaN(this.boundingBox.min.x) ||
      isNaN(this.boundingBox.min.y) ||
      isNaN(this.boundingBox.min.z)
    ) {
      console.error(
        'THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',
        this
      );
    }
  }

  /**
   * 计算包围球
   * 根据几何体的顶点位置计算最小包围球
   * 支持处理变形目标和相对变形
   * @returns {BufferGeometry} 返回当前几何体实例
   */
  computeBoundingSphere() {
    // 如果没有包围球，则创建一个新的
    if (this.boundingSphere === null) {
      this.boundingSphere = new Sphere();
    }

    // 获取位置属性和变形目标位置属性
    const position = this.attributes.position;
    const morphAttributesPosition = this.morphAttributes.position;

    // 处理 GL 缓冲属性的特殊情况
    if (position && position.isGLBufferAttribute) {
      console.error(
        "THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",
        this
      );

      // 设置一个默认的无穷大包围球
      this.boundingSphere.set(new Vector3(), Infinity);

      return;
    }

    // 如果存在位置属性
    if (position) {
      // 计算包围球中心
      const center = this.boundingSphere.center;

      // 从位置属性设置初始包围盒
      _box.setFromBufferAttribute(position);

      // 处理变形目标
      if (morphAttributesPosition) {
        for (let i = 0, il = morphAttributesPosition.length; i < il; i++) {
          const morphAttribute = morphAttributesPosition[i];
          _boxMorphTargets.setFromBufferAttribute(morphAttribute);

          // 处理相对变形目标
          if (this.morphTargetsRelative) {
            _vector.addVectors(_box.min, _boxMorphTargets.min);
            _box.expandByPoint(_vector);

            _vector.addVectors(_box.max, _boxMorphTargets.max);
            _box.expandByPoint(_vector);
          } else {
            // 处理绝对变形目标
            _box.expandByPoint(_boxMorphTargets.min);
            _box.expandByPoint(_boxMorphTargets.max);
          }
        }
      }

      // 计算包围盒中心
      _box.getCenter(center);

      // 计算最大半径
      let maxRadiusSq = 0;

      // 遍历位置属性，找出距离中心最远的点
      for (let i = 0, il = position.count; i < il; i++) {
        _vector.fromBufferAttribute(position, i);

        maxRadiusSq = Math.max(maxRadiusSq, center.distanceToSquared(_vector));
      }

      // 处理变形目标
      if (morphAttributesPosition) {
        for (let i = 0, il = morphAttributesPosition.length; i < il; i++) {
          const morphAttribute = morphAttributesPosition[i];
          const morphTargetsRelative = this.morphTargetsRelative;

          for (let j = 0, jl = morphAttribute.count; j < jl; j++) {
            _vector.fromBufferAttribute(morphAttribute, j);

            // 处理相对变形目标
            if (morphTargetsRelative) {
              _offset.fromBufferAttribute(position, j);
              _vector.add(_offset);
            }

            // 更新最大半径
            maxRadiusSq = Math.max(
              maxRadiusSq,
              center.distanceToSquared(_vector)
            );
          }
        }
      }

      // 设置包围球半径
      this.boundingSphere.radius = Math.sqrt(maxRadiusSq);

      // 检查计算结果是否有效
      if (isNaN(this.boundingSphere.radius)) {
        console.error(
          'THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',
          this
        );
      }
    }
  }

  /**
   * 计算切线
   * 用于法线贴图和高级纹理渲染
   * 需要存在索引、位置、法线和UV属性
   * @returns {void}
   */
  computeTangents() {
    // 检查计算切线所需的必要属性
    const index = this.index;
    const attributes = this.attributes;

    if (
      index === null ||
      attributes.position === undefined ||
      attributes.normal === undefined ||
      attributes.uv === undefined
    ) {
      console.error(
        "THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)"
      );
      return;
    }

    // 获取必要的属性
    const positionAttribute = attributes.position;
    const normalAttribute = attributes.normal;
    const uvAttribute = attributes.uv;

    // 如果没有切线属性，则创建一个新的切线属性
    if (this.hasAttribute("tangent") === false) {
      this.setAttribute(
        "tangent",
        new BufferAttribute(new Float32Array(4 * positionAttribute.count), 4)
      );
    }

    const tangentAttribute = this.getAttribute("tangent");

    // 临时存储切线和副切线
    const tan1 = [],
      tan2 = [];

    // 初始化临时向量数组
    for (let i = 0; i < positionAttribute.count; i++) {
      tan1[i] = new Vector3();
      tan2[i] = new Vector3();
    }

    // 定义处理三角形的函数
    function handleTriangle(a, b, c) {
      // 获取三角形的顶点和UV坐标
      const vA = new Vector3().fromBufferAttribute(positionAttribute, a);
      const vB = new Vector3().fromBufferAttribute(positionAttribute, b);
      const vC = new Vector3().fromBufferAttribute(positionAttribute, c);

      const uvA = new Vector2().fromBufferAttribute(uvAttribute, a);
      const uvB = new Vector2().fromBufferAttribute(uvAttribute, b);
      const uvC = new Vector2().fromBufferAttribute(uvAttribute, c);

      // 计算边和UV差值
      vB.sub(vA);
      vC.sub(vA);

      uvB.sub(uvA);
      uvC.sub(uvA);

      // 计算切线空间的缩放因子
      const r = 1.0 / (uvB.x * uvC.y - uvC.x * uvB.y);

      // 处理退化的UV三角形
      if (!isFinite(r)) return;

      // 计算切线和副切线
      const sdir = new Vector3()
        .copy(vB)
        .multiplyScalar(uvC.y)
        .addScaledVector(vC, -uvB.y)
        .multiplyScalar(r);

      const tdir = new Vector3()
        .copy(vC)
        .multiplyScalar(uvB.x)
        .addScaledVector(vB, -uvC.x)
        .multiplyScalar(r);

      // 累加切线和副切线
      tan1[a].add(sdir);
      tan1[b].add(sdir);
      tan1[c].add(sdir);

      tan2[a].add(tdir);
      tan2[b].add(tdir);
      tan2[c].add(tdir);
    }

    // 处理几何体的分组
    let groups = this.groups;

    // 如果没有分组，则使用整个索引
    if (groups.length === 0) {
      groups = [{ start: 0, count: index.count }];
    }

    // 遍历分组并处理每个三角形
    for (let i = 0, il = groups.length; i < il; ++i) {
      const group = groups[i];
      const start = group.start;
      const count = group.count;

      for (let j = start, jl = start + count; j < jl; j += 3) {
        handleTriangle(index.getX(j + 0), index.getX(j + 1), index.getX(j + 2));
      }
    }

    // 处理每个顶点的切线
    function handleVertex(v) {
      const n = new Vector3().fromBufferAttribute(normalAttribute, v);
      const n2 = new Vector3().copy(n);

      const t = tan1[v];

      // Gram-Schmidt正交化
      const tmp = new Vector3().copy(t);
      tmp.sub(n.multiplyScalar(n.dot(t))).normalize();

      // 计算切线的手性
      const tmp2 = new Vector3().crossVectors(n2, t);
      const test = tmp2.dot(tan2[v]);
      const w = test < 0.0 ? -1.0 : 1.0;

      // 设置切线属性（x, y, z为切线方向，w为手性）
      tangentAttribute.setXYZW(v, tmp.x, tmp.y, tmp.z, w);
    }

    // 遍历分组并处理每个顶点的切线
    for (let i = 0, il = groups.length; i < il; ++i) {
      const group = groups[i];
      const start = group.start;
      const count = group.count;

      for (let j = start, jl = start + count; j < jl; j += 3) {
        handleVertex(index.getX(j + 0));
        handleVertex(index.getX(j + 1));
        handleVertex(index.getX(j + 2));
      }
    }
  }

  /**
   * 计算顶点法线
   * 通过三角形面法线计算每个顶点的法线
   * 支持索引和非索引几何体
   * @returns {BufferGeometry} 返回当前几何体实例
   */
  computeVertexNormals() {
    const index = this.index;
    const positionAttribute = this.getAttribute("position");

    if (positionAttribute !== undefined) {
      // 获取或创建法线属性
      let normalAttribute = this.getAttribute("normal");

      if (normalAttribute === undefined) {
        normalAttribute = new BufferAttribute(
          new Float32Array(positionAttribute.count * 3),
          3
        );
        this.setAttribute("normal", normalAttribute);
      } else {
        // 重置现有法线为零
        for (let i = 0, il = normalAttribute.count; i < il; i++) {
          normalAttribute.setXYZ(i, 0, 0, 0);
        }
      }

      // 临时向量，用于法线计算
      const pA = new Vector3(),
        pB = new Vector3(),
        pC = new Vector3();
      const nA = new Vector3(),
        nB = new Vector3(),
        nC = new Vector3();
      const cb = new Vector3(),
        ab = new Vector3();

      // 处理索引几何体
      if (index) {
        for (let i = 0, il = index.count; i < il; i += 3) {
          const vA = index.getX(i + 0);
          const vB = index.getX(i + 1);
          const vC = index.getX(i + 2);

          // 获取三角形顶点
          pA.fromBufferAttribute(positionAttribute, vA);
          pB.fromBufferAttribute(positionAttribute, vB);
          pC.fromBufferAttribute(positionAttribute, vC);

          // 计算面法线
          cb.subVectors(pC, pB);
          ab.subVectors(pA, pB);
          cb.cross(ab);

          // 累加法线到相关顶点
          nA.fromBufferAttribute(normalAttribute, vA);
          nB.fromBufferAttribute(normalAttribute, vB);
          nC.fromBufferAttribute(normalAttribute, vC);

          nA.add(cb);
          nB.add(cb);
          nC.add(cb);

          // 更新法线属性
          normalAttribute.setXYZ(vA, nA.x, nA.y, nA.z);
          normalAttribute.setXYZ(vB, nB.x, nB.y, nB.z);
          normalAttribute.setXYZ(vC, nC.x, nC.y, nC.z);
        }
      } else {
        // 处理非索引几何体（非连接的三角形汤）
        for (let i = 0, il = positionAttribute.count; i < il; i += 3) {
          pA.fromBufferAttribute(positionAttribute, i + 0);
          pB.fromBufferAttribute(positionAttribute, i + 1);
          pC.fromBufferAttribute(positionAttribute, i + 2);

          // 计算面法线
          cb.subVectors(pC, pB);
          ab.subVectors(pA, pB);
          cb.cross(ab);

          // 设置相同的法线到三角形的所有顶点
          normalAttribute.setXYZ(i + 0, cb.x, cb.y, cb.z);
          normalAttribute.setXYZ(i + 1, cb.x, cb.y, cb.z);
          normalAttribute.setXYZ(i + 2, cb.x, cb.y, cb.z);
        }
      }

      // 归一化法线
      this.normalizeNormals();

      // 标记法线属性需要更新
      normalAttribute.needsUpdate = true;
    }
  }

  /**
   * 归一化法线
   * @returns {BufferGeometry}
   */
  normalizeNormals() {
    const normals = this.attributes.normal;

    for (let i = 0, il = normals.count; i < il; i++) {
      _vector.fromBufferAttribute(normals, i);

      _vector.normalize();

      normals.setXYZ(i, _vector.x, _vector.y, _vector.z);
    }
  }

  /**
   * 转换为非索引几何体
   * 将索引几何体转换为非索引几何体，展开所有顶点
   * @returns {BufferGeometry} 返回新的非索引几何体
   */
  toNonIndexed() {
    // 内部辅助函数：转换缓冲属性
    function convertBufferAttribute(attribute, indices) {
      const array = attribute.array;
      const itemSize = attribute.itemSize;
      const normalized = attribute.normalized;

      // 创建新的数组，大小为索引数量 * 每个元素的大小
      const array2 = new array.constructor(indices.length * itemSize);

      let index = 0,
        index2 = 0;

      // 遍历索引，复制对应的属性值
      for (let i = 0, l = indices.length; i < l; i++) {
        // 处理交错缓冲属性的特殊情况
        if (attribute.isInterleavedBufferAttribute) {
          index = indices[i] * attribute.data.stride + attribute.offset;
        } else {
          index = indices[i] * itemSize;
        }

        // 复制属性值
        for (let j = 0; j < itemSize; j++) {
          array2[index2++] = array[index++];
        }
      }

      // 创建新的缓冲属性
      return new BufferAttribute(array2, itemSize, normalized);
    }

    // 检查是否已经是非索引几何体
    if (this.index === null) {
      console.warn(
        "THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."
      );
      return this;
    }

    // 创建新的几何体
    const geometry2 = new BufferGeometry();

    // 获取索引数组
    const indices = this.index.array;
    const attributes = this.attributes;

    // 转换普通属性
    for (const name in attributes) {
      const attribute = attributes[name];
      const newAttribute = convertBufferAttribute(attribute, indices);
      geometry2.setAttribute(name, newAttribute);
    }

    // 转换变形属性
    const morphAttributes = this.morphAttributes;

    for (const name in morphAttributes) {
      const morphArray = [];
      const morphAttribute = morphAttributes[name];

      // 转换每个变形目标的属性
      for (let i = 0, il = morphAttribute.length; i < il; i++) {
        const attribute = morphAttribute[i];
        const newAttribute = convertBufferAttribute(attribute, indices);
        morphArray.push(newAttribute);
      }

      geometry2.morphAttributes[name] = morphArray;
    }

    // 复制变形目标相对性
    geometry2.morphTargetsRelative = this.morphTargetsRelative;

    // 复制分组信息
    const groups = this.groups;

    for (let i = 0, l = groups.length; i < l; i++) {
      const group = groups[i];
      geometry2.addGroup(group.start, group.count, group.materialIndex);
    }

    return geometry2;
  }

  /**
   * 将几何体转换为JSON格式
   * 用于序列化和存储几何体数据
   * @returns {Object} JSON格式的几何体数据
   */
  toJSON() {
    // 创建基础数据结构
    const data = {
      metadata: {
        version: 4.6,
        type: "BufferGeometry",
        generator: "BufferGeometry.toJSON",
      },
    };

    // 添加基本信息
    data.uuid = this.uuid;
    data.type = this.type;
    if (this.name !== "") data.name = this.name;
    if (Object.keys(this.userData).length > 0) data.userData = this.userData;

    // 处理预定义参数
    if (this.parameters !== undefined) {
      const parameters = this.parameters;

      for (const key in parameters) {
        if (parameters[key] !== undefined) data[key] = parameters[key];
      }

      return data;
    }

    // 初始化数据属性
    data.data = { attributes: {} };

    // 处理索引
    const index = this.index;

    if (index !== null) {
      data.data.index = {
        type: index.array.constructor.name,
        array: Array.prototype.slice.call(index.array),
      };
    }

    // 处理普通属性
    const attributes = this.attributes;

    for (const key in attributes) {
      const attribute = attributes[key];
      data.data.attributes[key] = attribute.toJSON(data.data);
    }

    // 处理变形属性
    const morphAttributes = {};
    let hasMorphAttributes = false;

    for (const key in this.morphAttributes) {
      const attributeArray = this.morphAttributes[key];
      const array = [];

      for (let i = 0, il = attributeArray.length; i < il; i++) {
        const attribute = attributeArray[i];
        array.push(attribute.toJSON(data.data));
      }

      if (array.length > 0) {
        morphAttributes[key] = array;
        hasMorphAttributes = true;
      }
    }

    // 添加变形属性
    if (hasMorphAttributes) {
      data.data.morphAttributes = morphAttributes;
      data.data.morphTargetsRelative = this.morphTargetsRelative;
    }

    // 处理分组
    const groups = this.groups;

    if (groups.length > 0) {
      data.data.groups = JSON.parse(JSON.stringify(groups));
    }

    // 处理包围球
    const boundingSphere = this.boundingSphere;

    if (boundingSphere !== null) {
      data.data.boundingSphere = {
        center: boundingSphere.center.toArray(),
        radius: boundingSphere.radius,
      };
    }

    return data;
  }

  /**
   * 克隆几何体
   * @returns {BufferGeometry} 返回克隆后的几何体
   */
  clone() {
    return new this.constructor().copy(this);
  }

  /**
   * 复制另一个几何体的属性
   * @param {BufferGeometry} source - 源几何体
   * @returns {BufferGeometry} 返回当前几何体
   */
  copy(source) {
    // 重置当前几何体的所有属性
    this.index = null;
    this.attributes = {};
    this.morphAttributes = {};
    this.groups = [];
    this.boundingBox = null;
    this.boundingSphere = null;

    // 用于存储克隆共享数据的临时对象
    const data = {};

    // 复制名称
    this.name = source.name;

    // 复制索引
    const index = source.index;

    if (index !== null) {
      this.setIndex(index.clone(data));
    }

    // 复制属性
    const attributes = source.attributes;

    for (const name in attributes) {
      const attribute = attributes[name];
      this.setAttribute(name, attribute.clone(data));
    }

    // 复制变形属性
    const morphAttributes = source.morphAttributes;

    for (const name in morphAttributes) {
      const array = [];
      const morphAttribute = morphAttributes[name];

      for (let i = 0, l = morphAttribute.length; i < l; i++) {
        array.push(morphAttribute[i].clone(data));
      }

      this.morphAttributes[name] = array;
    }

    // 复制变形目标相对性
    this.morphTargetsRelative = source.morphTargetsRelative;

    // 复制分组
    const groups = source.groups;

    for (let i = 0, l = groups.length; i < l; i++) {
      const group = groups[i];
      this.addGroup(group.start, group.count, group.materialIndex);
    }

    // 复制包围盒
    const boundingBox = source.boundingBox;

    if (boundingBox !== null) {
      this.boundingBox = boundingBox.clone();
    }

    // 复制包围球
    const boundingSphere = source.boundingSphere;

    if (boundingSphere !== null) {
      this.boundingSphere = boundingSphere.clone();
    }

    // 复制绘制范围
    this.drawRange.start = source.drawRange.start;
    this.drawRange.count = source.drawRange.count;

    // 复制用户数据
    this.userData = source.userData;

    return this;
  }

  /**
   * 释放几何体资源
   * 触发 'dispose' 事件，通知相关对象释放资源
   * @returns {void}
   */
  dispose() {
    this.dispatchEvent({ type: "dispose" });
  }
}

export { BufferGeometry };
