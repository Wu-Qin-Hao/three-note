import { BufferGeometry } from "../core/BufferGeometry.js";
import { Float32BufferAttribute } from "../core/BufferAttribute.js";
import { Vector3 } from "../math/Vector3.js";

/**
 * 盒子几何体
 */
class BoxGeometry extends BufferGeometry {
  /**
   * 构造函数
   * @param {number} width - 宽度
   * @param {number} height - 高度
   * @param {number} depth - 深度
   * @param {number} widthSegments - 宽度分段数
   * @param {number} heightSegments - 高度分段数
   * @param {number} depthSegments - 深度分段数
   */
  constructor(
    width = 1,
    height = 1,
    depth = 1,
    widthSegments = 1,
    heightSegments = 1,
    depthSegments = 1
  ) {
    super();

    this.type = "BoxGeometry";

    // 保存几何体的参数
    this.parameters = {
      width: width,
      height: height,
      depth: depth,
      widthSegments: widthSegments,
      heightSegments: heightSegments,
      depthSegments: depthSegments,
    };

    const scope = this;

    // 确保分段数为整数
    widthSegments = Math.floor(widthSegments);
    heightSegments = Math.floor(heightSegments);
    depthSegments = Math.floor(depthSegments);

    // 初始化缓冲区
    const indices = [];
    const vertices = [];
    const normals = [];
    const uvs = [];

    // 辅助变量
    let numberOfVertices = 0;
    let groupStart = 0;

    // 构建盒子几何体的每个面
    buildPlane(
      "z",
      "y",
      "x",
      -1,
      -1,
      depth,
      height,
      width,
      depthSegments,
      heightSegments,
      0
    ); // 正x面
    buildPlane(
      "z",
      "y",
      "x",
      1,
      -1,
      depth,
      height,
      -width,
      depthSegments,
      heightSegments,
      1
    ); // 负x面
    buildPlane(
      "x",
      "z",
      "y",
      1,
      1,
      width,
      depth,
      height,
      widthSegments,
      depthSegments,
      2
    ); // 正y面
    buildPlane(
      "x",
      "z",
      "y",
      1,
      -1,
      width,
      depth,
      -height,
      widthSegments,
      depthSegments,
      3
    ); // 负y面
    buildPlane(
      "x",
      "y",
      "z",
      1,
      -1,
      width,
      height,
      depth,
      widthSegments,
      heightSegments,
      4
    ); // 正z面
    buildPlane(
      "x",
      "y",
      "z",
      -1,
      -1,
      width,
      height,
      -depth,
      widthSegments,
      heightSegments,
      5
    ); // 负z面

    // 构建几何体
    this.setIndex(indices);
    this.setAttribute("position", new Float32BufferAttribute(vertices, 3));
    this.setAttribute("normal", new Float32BufferAttribute(normals, 3));
    this.setAttribute("uv", new Float32BufferAttribute(uvs, 2));

    /**
     * 构建平面
     * @param {string} u - 第一个轴
     * @param {string} v - 第二个轴
     * @param {string} w - 第三个轴
     * @param {number} udir - 第一个轴的方向
     * @param {number} vdir - 第二个轴的方向
     * @param {number} width - 宽度
     * @param {number} height - 高度
     * @param {number} depth - 深度
     * @param {number} gridX - 宽度分段数
     * @param {number} gridY - 高度分段数
     * @param {number} materialIndex - 材质索引
     */
    function buildPlane(
      u,
      v,
      w,
      udir,
      vdir,
      width,
      height,
      depth,
      gridX,
      gridY,
      materialIndex
    ) {
      // 计算分段宽度
      const segmentWidth = width / gridX;
      // 计算分段高度
      const segmentHeight = height / gridY;

      // 计算半宽、半高和半深
      const widthHalf = width / 2;
      const heightHalf = height / 2;
      const depthHalf = depth / 2;

      // 计算分段数加1
      const gridX1 = gridX + 1;
      const gridY1 = gridY + 1;

      // 计数器
      let vertexCounter = 0;
      let groupCount = 0;

      const vector = new Vector3();

      // 生成顶点、法线和UV坐标
      for (let iy = 0; iy < gridY1; iy++) {
        // 计算y坐标
        const y = iy * segmentHeight - heightHalf;

        for (let ix = 0; ix < gridX1; ix++) {
          // 计算x坐标
          const x = ix * segmentWidth - widthHalf;

          // 设置向量的正确分量
          vector[u] = x * udir;
          vector[v] = y * vdir;
          vector[w] = depthHalf;

          // 将向量应用到顶点缓冲区
          vertices.push(vector.x, vector.y, vector.z);

          // 设置向量的正确分量
          vector[u] = 0;
          vector[v] = 0;
          vector[w] = depth > 0 ? 1 : -1;

          // 将向量应用到法线缓冲区
          normals.push(vector.x, vector.y, vector.z);

          // UV坐标
          uvs.push(ix / gridX);
          uvs.push(1 - iy / gridY);

          // 计数器
          vertexCounter += 1;
        }
      }

      // 生成索引
      for (let iy = 0; iy < gridY; iy++) {
        for (let ix = 0; ix < gridX; ix++) {
          const a = numberOfVertices + ix + gridX1 * iy;
          const b = numberOfVertices + ix + gridX1 * (iy + 1);
          const c = numberOfVertices + (ix + 1) + gridX1 * (iy + 1);
          const d = numberOfVertices + (ix + 1) + gridX1 * iy;

          // 面
          indices.push(a, b, d);
          indices.push(b, c, d);

          // 增加计数器
          groupCount += 6;
        }
      }

      // 为几何体添加组，以支持多材质
      scope.addGroup(groupStart, groupCount, materialIndex);

      // 计算组的新起始值
      groupStart += groupCount;

      // 更新顶点总数
      numberOfVertices += vertexCounter;
    }
  }

  copy(source) {
    super.copy(source);

    // 复制参数
    this.parameters = Object.assign({}, source.parameters);

    return this;
  }

  static fromJSON(data) {
    // 从JSON数据创建BoxGeometry实例
    return new BoxGeometry(
      data.width,
      data.height,
      data.depth,
      data.widthSegments,
      data.heightSegments,
      data.depthSegments
    );
  }
}

export { BoxGeometry };
