use crate::hash::VertexMap;
use wasm_bindgen::prelude::*;

#[derive(Clone, Copy)]
struct Frame {
    origin: [f32; 3],
    x: [f32; 3],
    y: [f32; 3],
}

#[wasm_bindgen]
pub struct ExtrusionResult {
    vertices: Vec<f32>,
    faces: Vec<u32>,
}

#[wasm_bindgen]
impl ExtrusionResult {
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

/// Transform 2D vertex to 3D using frame
fn transform_vertex(v2x: f32, v2y: f32, frame: &Frame) -> [f32; 3] {
    let x = v2x * frame.x[0] + v2y * frame.y[0] + frame.origin[0];
    let y = v2x * frame.x[1] + v2y * frame.y[1] + frame.origin[1];
    let z = v2x * frame.x[2] + v2y * frame.y[2] + frame.origin[2];
    [x, y, z]
}

/// Simple fan triangulation for caps using pre-resolved vertex indices
fn triangulate_index_fan(indices: &[u32], clockwise: bool) -> Vec<u32> {
    let mut faces = Vec::new();
    if indices.len() < 3 {
        return faces;
    }
    let first = indices[0];
    for i in 1..indices.len() - 1 {
        if clockwise {
            faces.push(first);
            faces.push(indices[i + 1]);
            faces.push(indices[i]);
        } else {
            faces.push(first);
            faces.push(indices[i]);
            faces.push(indices[i + 1]);
        }
    }
    faces
}

#[wasm_bindgen]
pub fn extrude_wasm(
    path_origins: Vec<f32>,
    path_x_axes: Vec<f32>,
    path_y_axes: Vec<f32>,
    contour_vertices: Vec<f32>,
    contour_offsets: Vec<u32>,
    contour_lengths: Vec<u32>,
    caps: bool,
) -> ExtrusionResult {
    let epsilon = 1e-6;
    let num_samples = path_origins.len() / 3;

    // Handle edge cases
    if num_samples < 2 {
        return ExtrusionResult::new();
    }

    let mut vertex_map = VertexMap::new();
    let mut faces = Vec::new();

    // Helper to get frame at sample index
    let get_frame = |i: usize| -> Frame {
        let base = i * 3;
        Frame {
            origin: [
                path_origins[base],
                path_origins[base + 1],
                path_origins[base + 2],
            ],
            x: [
                path_x_axes[base],
                path_x_axes[base + 1],
                path_x_axes[base + 2],
            ],
            y: [
                path_y_axes[base],
                path_y_axes[base + 1],
                path_y_axes[base + 2],
            ],
        }
    };

    // Helper to get contour vertices at sample index
    let get_contour_vertices = |i: usize| -> Vec<[f32; 2]> {
        let offset = contour_offsets[i] as usize;
        let length = contour_lengths[i] as usize;
        let mut vertices = Vec::with_capacity(length);
        for j in 0..length {
            let base = (offset + j) * 2;
            vertices.push([contour_vertices[base], contour_vertices[base + 1]]);
        }
        vertices
    };

    // Helper to transform contour vertices to 3D indices
    let contour_to_indices =
        |contour: &[[f32; 2]], frame: &Frame, vertex_map: &mut VertexMap| -> Vec<u32> {
            contour
                .iter()
                .map(|v2| {
                    let v3 = transform_vertex(v2[0], v2[1], frame);
                    vertex_map.index(v3[0], v3[1], v3[2], epsilon) as u32
                })
                .collect()
        };

    // Process first contour
    let first_frame = get_frame(0);
    let first_contour = get_contour_vertices(0);
    let mut last_indices = contour_to_indices(&first_contour, &first_frame, &mut vertex_map);

    // Store first contour indices for cap generation
    let first_indices = last_indices.clone();

    // Process each pair of consecutive samples
    for i in 1..num_samples {
        let frame = get_frame(i);
        let contour = get_contour_vertices(i);
        let next_indices = contour_to_indices(&contour, &frame, &mut vertex_map);

        // Generate faces between last and next contours
        let n = last_indices.len();
        if n > 0 && n == next_indices.len() {
            // Wrap around: last vertex is at index n-1
            let mut v_pl = last_indices[n - 1];
            let mut v_nl = next_indices[n - 1];

            for j in 0..n {
                let v_pr = last_indices[j];
                let v_nr = next_indices[j];

                // Triangulate the quad (matching JS winding order)
                faces.push(v_nl);
                faces.push(v_pr);
                faces.push(v_nr);

                faces.push(v_pl);
                faces.push(v_pr);
                faces.push(v_nl);

                v_pl = v_pr;
                v_nl = v_nr;
            }
        }

        last_indices = next_indices;
    }

    // Store last contour indices for cap generation
    let last_cap_indices = last_indices.clone();

    // Generate caps if requested
    if caps {
        // Start cap - clockwise winding (matching JS: triangulate('cw'))
        if first_indices.len() >= 3 {
            let cap_faces = triangulate_index_fan(&first_indices, true);
            faces.extend(cap_faces);
        }

        /// Extrude a segment of the path (for parallel processing)
        #[wasm_bindgen]
        pub fn extrude_segment_wasm(
            path_origins: Vec<f32>,
            path_x_axes: Vec<f32>,
            path_y_axes: Vec<f32>,
            contour_vertices: Vec<f32>,
            contour_offsets: Vec<u32>,
            contour_lengths: Vec<u32>,
            segment_start: usize,
            segment_end: usize,
            caps: bool,
            is_first_segment: bool,
            is_last_segment: bool,
        ) -> ExtrusionResult {
            let mut result = ExtrusionResult::new();

            if path_origins.len() < 6 || path_x_axes.len() < 6 || path_y_axes.len() < 6 {
                return result;
            }

            let num_samples = path_origins.len() / 3;
            if segment_end > num_samples {
                return result;
            }

            let vertex_map = &mut VertexMap::new();
            let epsilon = 1e-6;

            // Capture first and last contour indices for cap generation
            let mut first_segment_indices: Option<Vec<u32>> = None;
            let mut last_segment_indices: Option<Vec<u32>> = None;

            // Process each pair of consecutive samples in the segment
            for i in segment_start..segment_end.saturating_sub(1) {
                let next_i = i + 1;

                // Get frames for current and next sample
                let frame_origin = [
                    path_origins[i * 3],
                    path_origins[i * 3 + 1],
                    path_origins[i * 3 + 2],
                ];
                let frame_x = [
                    path_x_axes[i * 3],
                    path_x_axes[i * 3 + 1],
                    path_x_axes[i * 3 + 2],
                ];
                let frame_y = [
                    path_y_axes[i * 3],
                    path_y_axes[i * 3 + 1],
                    path_y_axes[i * 3 + 2],
                ];

                let next_frame_origin = [
                    path_origins[next_i * 3],
                    path_origins[next_i * 3 + 1],
                    path_origins[next_i * 3 + 2],
                ];
                let next_frame_x = [
                    path_x_axes[next_i * 3],
                    path_x_axes[next_i * 3 + 1],
                    path_x_axes[next_i * 3 + 2],
                ];
                let next_frame_y = [
                    path_y_axes[next_i * 3],
                    path_y_axes[next_i * 3 + 1],
                    path_y_axes[next_i * 3 + 2],
                ];

                let frame = Frame {
                    origin: frame_origin,
                    x: frame_x,
                    y: frame_y,
                };
                let next_frame = Frame {
                    origin: next_frame_origin,
                    x: next_frame_x,
                    y: next_frame_y,
                };

                // Get contour vertices for this sample
                let offset = contour_offsets[i] as usize;
                let length = contour_lengths[i] as usize;
                let mut contour_vertices_2d: Vec<[f32; 2]> = Vec::with_capacity(length / 2);
                for j in 0..length / 2 {
                    contour_vertices_2d.push([
                        contour_vertices[offset + j * 2],
                        contour_vertices[offset + j * 2 + 1],
                    ]);
                }

                let next_offset = contour_offsets[next_i] as usize;
                let next_length = contour_lengths[next_i] as usize;
                let mut next_contour_vertices_2d: Vec<[f32; 2]> =
                    Vec::with_capacity(next_length / 2);
                for j in 0..next_length / 2 {
                    next_contour_vertices_2d.push([
                        contour_vertices[next_offset + j * 2],
                        contour_vertices[next_offset + j * 2 + 1],
                    ]);
                }

                // Transform and index vertices
                let mut last_indices: Vec<usize> = Vec::with_capacity(contour_vertices_2d.len());
                for v2 in &contour_vertices_2d {
                    let v3 = transform_vertex(v2[0], v2[1], &frame);
                    last_indices.push(vertex_map.index(v3[0], v3[1], v3[2], epsilon));
                }

                // Capture first contour indices for cap
                if first_segment_indices.is_none() {
                    first_segment_indices =
                        Some(last_indices.iter().map(|&idx| idx as u32).collect());
                }

                let mut next_indices: Vec<usize> =
                    Vec::with_capacity(next_contour_vertices_2d.len());
                for v2 in &next_contour_vertices_2d {
                    let v3 = transform_vertex(v2[0], v2[1], &next_frame);
                    next_indices.push(vertex_map.index(v3[0], v3[1], v3[2], epsilon));
                }

                // Update last contour indices for cap
                last_segment_indices = Some(next_indices.iter().map(|&idx| idx as u32).collect());

                // Generate faces between contours
                let vertices_per_poly = last_indices.len();
                for j in 0..vertices_per_poly {
                    let vpl = last_indices[(j + vertices_per_poly - 1) % vertices_per_poly];
                    let vpr = last_indices[j];
                    let vnl = next_indices[(j + vertices_per_poly - 1) % vertices_per_poly];
                    let vnr = next_indices[j];

                    result.faces.push(vnl as u32);
                    result.faces.push(vpr as u32);
                    result.faces.push(vnr as u32);

                    result.faces.push(vpl as u32);
                    result.faces.push(vpr as u32);
                    result.faces.push(vnl as u32);
                }
            }

            // Generate caps if this is the first or last segment
            if caps {
                if is_first_segment {
                    if let Some(ref indices) = first_segment_indices {
                        if indices.len() >= 3 {
                            let cap_faces = triangulate_index_fan(indices, true);
                            result.faces.extend(cap_faces);
                        }
                    }
                }

                if is_last_segment {
                    if let Some(ref indices) = last_segment_indices {
                        if indices.len() >= 3 {
                            let cap_faces = triangulate_index_fan(indices, false);
                            result.faces.extend(cap_faces);
                        }
                    }
                }
            }

            // Collect vertices
            for v in vertex_map.vertices() {
                result.vertices.push(v[0]);
                result.vertices.push(v[1]);
                result.vertices.push(v[2]);
            }

            result
        }

        // End cap - counter-clockwise winding (matching JS: triangulate('ccw'))
        if last_cap_indices.len() >= 3 {
            let cap_faces = triangulate_index_fan(&last_cap_indices, false);
            faces.extend(cap_faces);
        }
    }

    // Flatten vertices to Vec<f32>
    let vertices_flat: Vec<f32> = vertex_map
        .vertices()
        .iter()
        .flat_map(|v| v.iter().cloned())
        .collect();

    ExtrusionResult {
        vertices: vertices_flat,
        faces,
    }
}
