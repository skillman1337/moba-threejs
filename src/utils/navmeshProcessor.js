// navmeshProcessor.js

const fs = require('fs');
const path = require('path');

class Vertex {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

class Face {
  constructor(v1 = [0, 0, 0], v2 = [0, 0, 0], v3 = [0, 0, 0]) {
    this.v1 = v1;
    this.v2 = v2;
    this.v3 = v3;
  }
}

class Triangle {
  constructor() {
    this.unk1 = 0;
    this.unk2 = 0;
    this.triangle_reference = 0;
    this.Face = new Face();
  }
}

class AIMeshFile {
  constructor() {
    this.magic = '';
    this.version = 0;
    this.triangle_count = 0;
    this.zero = [0, 0];
    this.triangles = [];
  }
}

class NavMeshParser {
  constructor(arrayBuffer) {
    this.buffer = new DataView(arrayBuffer);
    this.offset = 0;
    this.AIMESH_TEXTURE_SIZE = 1024;
    this.mapWidth = 0;
    this.mapHeight = 0;
    this.loaded = false;

    // Initialize scanlines
    this.scanlineLowest = Array.from({ length: this.AIMESH_TEXTURE_SIZE }, () => ({
      x: 1e10,
      y: 1e10,
      z: 1e10,
      u: 1e10,
      v: 1e10
    }));
    this.scanlineHighest = Array.from({ length: this.AIMESH_TEXTURE_SIZE }, () => ({
      x: -1e10,
      y: -1e10,
      z: -1e10,
      u: -1e10,
      v: -1e10
    }));

    this.heightMap = new Float32Array(this.AIMESH_TEXTURE_SIZE * this.AIMESH_TEXTURE_SIZE).fill(
      -99999.99
    );
    this.xMap = new Float32Array(this.AIMESH_TEXTURE_SIZE * this.AIMESH_TEXTURE_SIZE).fill(0);
    this.yMap = new Float32Array(this.AIMESH_TEXTURE_SIZE * this.AIMESH_TEXTURE_SIZE).fill(0);

    this.lowX = 9e9;
    this.lowY = 9e9;
    this.highX = 0;
    this.highY = 0;
    this.lowestZ = 9e9;

    this.parse();
  }

  readChars(length) {
    const chars = [];
    for (let i = 0; i < length; i++) {
      chars.push(String.fromCharCode(this.buffer.getUint8(this.offset++)));
    }
    return chars.join('');
  }

  readInt32() {
    const value = this.buffer.getInt32(this.offset, true);
    this.offset += 4;
    return value;
  }

  readInt16() {
    const value = this.buffer.getInt16(this.offset, true);
    this.offset += 2;
    return value;
  }

  readFloat() {
    const value = this.buffer.getFloat32(this.offset, true);
    this.offset += 4;
    return value;
  }

  parse() {
    // Store fileStream as a property for external access
    this.fileStream = new AIMeshFile();

    // Read header
    this.fileStream.magic = this.readChars(8);
    this.fileStream.version = this.readInt32();
    this.fileStream.triangle_count = this.readInt32();
    this.fileStream.zero[0] = this.readInt32();
    this.fileStream.zero[1] = this.readInt32();

    // Read triangles
    for (let i = 0; i < this.fileStream.triangle_count; i++) {
      const triangle = new Triangle();
      for (let j = 0; j < 3; j++) {
        triangle.Face.v1[j] = this.readFloat();
      }
      for (let j = 0; j < 3; j++) {
        triangle.Face.v2[j] = this.readFloat();
      }
      for (let j = 0; j < 3; j++) {
        triangle.Face.v3[j] = this.readFloat();
      }
      triangle.unk1 = this.readInt16();
      triangle.unk2 = this.readInt16();
      triangle.triangle_reference = this.readInt16();
      this.fileStream.triangles.push(triangle);
    }

    this.processMesh(this.fileStream);
    this.loaded = true;
  }

  processMesh(fileStream) {
    // Initialize heightMap
    for (let i = 0; i < this.AIMESH_TEXTURE_SIZE * this.AIMESH_TEXTURE_SIZE; i++) {
      this.heightMap[i] = -99999.99;
    }

    // Find boundaries
    for (let i = 0; i < fileStream.triangle_count; i++) {
      const tri = fileStream.triangles[i].Face;

      // X boundaries
      this.lowX = Math.min(this.lowX, tri.v1[0], tri.v2[0], tri.v3[0]);
      this.highX = Math.max(this.highX, tri.v1[0], tri.v2[0], tri.v3[0]);

      // Y boundaries (assuming Y is the Z component in the original code)
      this.lowY = Math.min(this.lowY, tri.v1[2], tri.v2[2], tri.v3[2]);
      this.highY = Math.max(this.highY, tri.v1[2], tri.v2[2], tri.v3[2]);
    }

    this.mapWidth = this.highX - this.lowX;
    this.mapHeight = this.highY - this.lowY;

    if (this.highY - this.lowY < this.highX - this.lowX) {
      this.highX = (1.0 / (this.highX - this.lowX)) * this.AIMESH_TEXTURE_SIZE;
      this.highY = this.highX;
      this.lowY = 0;
    } else {
      this.highY = (1.0 / (this.highY - this.lowY)) * this.AIMESH_TEXTURE_SIZE;
      this.highX = this.highY;
      // lowX remains unchanged
    }

    // Process triangles
    for (let i = 0; i < fileStream.triangle_count; i++) {
      const originalTri = fileStream.triangles[i].Face;
      const transformedTri = this.transformTriangle(originalTri);

      this.drawTriangle(transformedTri, this.AIMESH_TEXTURE_SIZE, this.AIMESH_TEXTURE_SIZE);
    }
  }

  transformTriangle(originalTri) {
    return {
      v1: [
        (originalTri.v1[0] - this.lowX) * this.highX,
        originalTri.v1[1],
        (originalTri.v1[2] - this.lowY) * this.highY
      ],
      v2: [
        (originalTri.v2[0] - this.lowX) * this.highX,
        originalTri.v2[1],
        (originalTri.v2[2] - this.lowY) * this.highY
      ],
      v3: [
        (originalTri.v3[0] - this.lowX) * this.highX,
        originalTri.v3[1],
        (originalTri.v3[2] - this.lowY) * this.highY
      ]
    };
  }

  drawTriangle(triangle, width, height) {
    const tempVertex = [
      { x: triangle.v1[0], y: triangle.v1[2], z: triangle.v1[1] },
      { x: triangle.v2[0], y: triangle.v2[2], z: triangle.v2[1] },
      { x: triangle.v3[0], y: triangle.v3[2], z: triangle.v3[1] }
    ];

    this.fillScanLine(tempVertex[0], tempVertex[1]);
    this.fillScanLine(tempVertex[1], tempVertex[2]);
    this.fillScanLine(tempVertex[2], tempVertex[0]);

    const startY = Math.max(
      0,
      Math.floor(Math.min(tempVertex[0].y, tempVertex[1].y, tempVertex[2].y))
    );
    const endY = Math.min(
      height - 1,
      Math.floor(Math.max(tempVertex[0].y, tempVertex[1].y, tempVertex[2].y))
    );

    for (let y = startY; y <= endY; y++) {
      const lowest = this.scanlineLowest[y];
      const highest = this.scanlineHighest[y];

      if (lowest.x < highest.x) {
        let x = Math.max(0, Math.floor(lowest.x));
        const maxX = Math.min(width - 1, Math.floor(highest.x));

        for (; x <= maxX; x++) {
          const pos = x + y * width;
          if (pos >= 0 && pos < this.heightMap.length) {
            // **Correction:** Use Math.max instead of Math.min to align with C# implementation
            this.heightMap[pos] = Math.max(this.heightMap[pos], lowest.z);
            // Optionally, populate xMap and yMap as needed
            // this.xMap[pos] = x;
            // this.yMap[pos] = y;
          }
        }
      }

      // Reset scanlines
      this.scanlineLowest[y].x = 1e10;
      this.scanlineHighest[y].x = -1e10;
    }
  }

  fillScanLine(vertex1, vertex2) {
    if (vertex1.y > vertex2.y) {
      [vertex1, vertex2] = [vertex2, vertex1];
    }

    if (vertex2.y < 0 || vertex1.y >= this.AIMESH_TEXTURE_SIZE) return;

    const dy = vertex2.y - vertex1.y;
    if (dy === 0) return;

    const invDY = 1.0 / dy;
    const deltaX = (vertex2.x - vertex1.x) * invDY;
    const deltaZ = (vertex2.z - vertex1.z) * invDY;

    let startY = Math.floor(vertex1.y) + 1;
    let endY = Math.floor(vertex2.y);
    let x = vertex1.x + deltaX * (1.0 - (vertex1.y - Math.floor(vertex1.y)));
    let z = vertex1.z + deltaZ * (1.0 - (vertex1.y - Math.floor(vertex1.y)));

    // Clamp Y values
    if (startY < 0) {
      x += deltaX * -startY;
      z += deltaZ * -startY;
      startY = 0;
    }
    if (endY >= this.AIMESH_TEXTURE_SIZE) endY = this.AIMESH_TEXTURE_SIZE - 1;

    for (let y = startY; y <= endY; y++) {
      if (x < this.scanlineLowest[y].x) {
        this.scanlineLowest[y].x = x;
        this.scanlineLowest[y].z = z;
      }

      if (x > this.scanlineHighest[y].x) {
        this.scanlineHighest[y].x = x;
        this.scanlineHighest[y].z = z;
      }

      x += deltaX;
      z += deltaZ;
    }
  }

  getHeightMap() {
    return Array.from(this.heightMap); // Convert typed array to regular array for JSON serialization
  }

  getMapDimensions() {
    return { width: this.mapWidth, height: this.mapHeight };
  }

  // (Optional) Getter for triangles
  getTriangles() {
    return this.fileStream.triangles;
  }
}

// Main processing function
function processNavMesh(aimeshPath, outputJsonPath) {
  try {
    // Read the .aimesh file
    const fileBuffer = fs.readFileSync(path.resolve(aimeshPath));
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    );

    // Parse the navmesh
    const parser = new NavMeshParser(arrayBuffer);
    if (!parser.loaded) {
      console.error('Failed to parse AIMesh.');
      return;
    }

    // Extract necessary data
    const heightMap = parser.getHeightMap();
    const dimensions = parser.getMapDimensions();

    // Access triangles via parser.fileStream.triangles or parser.getTriangles()
    const triangles = parser.fileStream.triangles; // Or use parser.getTriangles()

    // Prepare JSON data
    const navMeshData = {
      heightMap: heightMap,
      dimensions: dimensions,
      vertices: triangles.flatMap((tri) => [
        tri.Face.v1[0],
        tri.Face.v1[1],
        tri.Face.v1[2],
        tri.Face.v2[0],
        tri.Face.v2[1],
        tri.Face.v2[2],
        tri.Face.v3[0],
        tri.Face.v3[1],
        tri.Face.v3[2]
      ])
      // Add more properties if needed
    };

    // Write to JSON file with pretty formatting
    fs.writeFileSync(path.resolve(outputJsonPath), JSON.stringify(navMeshData, null, 2), 'utf-8');

    console.log(`NavMesh data successfully written to ${outputJsonPath}`);
  } catch (error) {
    console.error('Error processing NavMesh:', error);
  }
}

// Command-line Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length !== 2) {
    console.error('Usage: node navmeshProcessor.js <input.aimesh> <output.json>');
    process.exit(1);
  }

  const [inputPath, outputPath] = args;
  processNavMesh(inputPath, outputPath);
}
