use wasm_bindgen::prelude::*;

/// Transform a 3D vector by a 4x4 matrix
#[wasm_bindgen]
pub fn transform_vector(
    x: f32,
    y: f32,
    z: f32,
    m00: f32,
    m01: f32,
    m02: f32,
    m03: f32,
    m10: f32,
    m11: f32,
    m12: f32,
    m13: f32,
    m20: f32,
    m21: f32,
    m22: f32,
    m23: f32,
    m30: f32,
    m31: f32,
    m32: f32,
    m33: f32,
) -> Vec<f32> {
    let rx = m00 * x + m01 * y + m02 * z + m03;
    let ry = m10 * x + m11 * y + m12 * z + m13;
    let rz = m20 * x + m21 * y + m22 * z + m23;
    vec![rx, ry, rz]
}

/// Cross product of two 3D vectors
#[wasm_bindgen]
pub fn cross_product(ax: f32, ay: f32, az: f32, bx: f32, by: f32, bz: f32) -> Vec<f32> {
    vec![ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx]
}

/// Normalize a 3D vector
#[wasm_bindgen]
pub fn normalize(x: f32, y: f32, z: f32) -> Vec<f32> {
    let len = (x * x + y * y + z * z).sqrt();
    if len > 0.0 {
        vec![x / len, y / len, z / len]
    } else {
        vec![0.0, 0.0, 0.0]
    }
}

/// Dot product of two 3D vectors
#[wasm_bindgen]
pub fn dot_product(ax: f32, ay: f32, az: f32, bx: f32, by: f32, bz: f32) -> f32 {
    ax * bx + ay * by + az * bz
}

/// Distance between two 3D points
#[wasm_bindgen]
pub fn distance(ax: f32, ay: f32, az: f32, bx: f32, by: f32, bz: f32) -> f32 {
    let dx = ax - bx;
    let dy = ay - by;
    let dz = az - bz;
    (dx * dx + dy * dy + dz * dz).sqrt()
}
