mod bsp;

use wasm_bindgen::prelude::*;

/// Result of a CSG operation — flat arrays matching JS Float32Array / Uint32Array
/// vertices: [x0, y0, z0, x1, y1, z1, ...]
/// faces:    [a0, b0, c0, a1, b1, c1, ...]
#[wasm_bindgen]
pub struct MeshResult {
    #[wasm_bindgen(skip)]
    pub vertices: Vec<f32>,
    #[wasm_bindgen(skip)]
    pub faces: Vec<u32>,
}

#[wasm_bindgen]
impl MeshResult {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            vertices: Vec::new(),
            faces: Vec::new(),
        }
    }

    #[wasm_bindgen(getter)]
    pub fn vertices(&self) -> Vec<f32> {
        self.vertices.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn faces(&self) -> Vec<u32> {
        self.faces.clone()
    }
}

/// Deduplicate vertices with epsilon-based hashing
fn build_deduplicated(
    raw_vertices: &[f32],
    raw_faces: &[u32],
    epsilon: f32,
) -> (Vec<[f32; 3]>, Vec<[u32; 3]>) {
    let inv_eps = 1.0 / epsilon;
    let mut vertex_map: std::collections::HashMap<(i64, i64, i64), u32> =
        std::collections::HashMap::new();
    let mut vertices: Vec<[f32; 3]> = Vec::new();
    let mut faces: Vec<[u32; 3]> = Vec::new();

    let raw_vertex_count = raw_vertices.len() / 3;
    let raw_face_count = raw_faces.len() / 3;

    // Build deduplicated vertices
    let mut old_to_new: Vec<u32> = vec![0; raw_vertex_count];
    for i in 0..raw_vertex_count {
        let x = raw_vertices[i * 3];
        let y = raw_vertices[i * 3 + 1];
        let z = raw_vertices[i * 3 + 2];
        let key = (
            (x * inv_eps).round() as i64,
            (y * inv_eps).round() as i64,
            (z * inv_eps).round() as i64,
        );
        if let Some(&idx) = vertex_map.get(&key) {
            old_to_new[i] = idx;
        } else {
            let idx = vertices.len() as u32;
            vertex_map.insert(key, idx);
            vertices.push([x, y, z]);
            old_to_new[i] = idx;
        }
    }

    // Map faces
    for i in 0..raw_face_count {
        let a = old_to_new[raw_faces[i * 3] as usize];
        let b = old_to_new[raw_faces[i * 3 + 1] as usize];
        let c = old_to_new[raw_faces[i * 3 + 2] as usize];
        if a != b && b != c && a != c {
            faces.push([a, b, c]);
        }
    }

    (vertices, faces)
}

fn flatten_result(vertices: &[[f32; 3]], faces: &[[u32; 3]]) -> MeshResult {
    let verts: Vec<f32> = vertices.iter().flat_map(|v| v.iter().copied()).collect();
    let tris: Vec<u32> = faces.iter().flat_map(|f| f.iter().copied()).collect();
    MeshResult {
        vertices: verts,
        faces: tris,
    }
}

/// CSG Union: A ∪ B
#[wasm_bindgen]
pub fn csg_union(
    a_vertices: &[f32],
    a_faces: &[u32],
    b_vertices: &[f32],
    b_faces: &[u32],
) -> MeshResult {
    let (va, fa) = build_deduplicated(a_vertices, a_faces, 1e-5);
    let (vb, fb) = build_deduplicated(b_vertices, b_faces, 1e-5);

    let result = bsp::csg_union(&va, &fa, &vb, &fb);
    flatten_result(&result.0, &result.1)
}

/// CSG Intersection: A ∩ B
#[wasm_bindgen]
pub fn csg_intersect(
    a_vertices: &[f32],
    a_faces: &[u32],
    b_vertices: &[f32],
    b_faces: &[u32],
) -> MeshResult {
    let (va, fa) = build_deduplicated(a_vertices, a_faces, 1e-5);
    let (vb, fb) = build_deduplicated(b_vertices, b_faces, 1e-5);

    let result = bsp::csg_intersection(&va, &fa, &vb, &fb);
    flatten_result(&result.0, &result.1)
}

/// CSG Subtraction: A \ B
#[wasm_bindgen]
pub fn csg_subtract(
    a_vertices: &[f32],
    a_faces: &[u32],
    b_vertices: &[f32],
    b_faces: &[u32],
) -> MeshResult {
    let (va, fa) = build_deduplicated(a_vertices, a_faces, 1e-5);
    let (vb, fb) = build_deduplicated(b_vertices, b_faces, 1e-5);

    let result = bsp::csg_difference(&va, &fa, &vb, &fb);
    flatten_result(&result.0, &result.1)
}

/// Convex Hull of a single mesh (gift-wrapping algorithm)
#[wasm_bindgen]
pub fn csg_hull(vertices: &[f32], faces: &[u32]) -> MeshResult {
    let (v, _f) = build_deduplicated(vertices, faces, 1e-5);
    let result = bsp::convex_hull(&v);
    flatten_result(&result.0, &result.1)
}
