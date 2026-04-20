declare module 'mdsjs' {
  export class Matrix {
    rows(): number;
    cols(): number;
    getUnsafe(pos: number): number;
  }

  export class MDSJs {
    convertToMatrix(arrs: number[][], useFloat32?: boolean): Matrix | null;
    landmarkMDS(dist: Matrix, dims: number): Matrix;
  }

  const mdsjs: MDSJs;
  export default mdsjs;
}