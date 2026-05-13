use std::collections::HashMap;

/// Spatial hash map for vertex deduplication
/// Uses quantized (i32, i32, i32) coordinates as keys
pub struct VertexMap {
    map: HashMap<(i32, i32, i32), usize>,
    vertices: Vec<[f32; 3]>,
}

impl VertexMap {
    pub fn new() -> Self {
        Self {
            map: HashMap::new(),
            vertices: Vec::new(),
        }
    }

    /// Quantize coordinates and return index
    pub fn index(&mut self, x: f32, y: f32, z: f32, epsilon: f32) -> usize {
        let key = (
            (x / epsilon).round() as i32,
            (y / epsilon).round() as i32,
            (z / epsilon).round() as i32,
        );

        if let Some(&idx) = self.map.get(&key) {
            idx
        } else {
            let idx = self.vertices.len();
            self.vertices.push([x, y, z]);
            self.map.insert(key, idx);
            idx
        }
    }

    pub fn vertices(&self) -> &[[f32; 3]] {
        &self.vertices
    }

    pub fn len(&self) -> usize {
        self.vertices.len()
    }
}
